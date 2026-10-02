import net from "node:net";
import { createConnectionLimiter } from "./connection-limits";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import {
  attachTeltonikaProtocol,
} from "./protocol";

import {
  buildCodec12Command,
} from "./codec12";

import {
  registerDevice,
} from "./registry";

import {
  loadDevicesFromSupabase,
  persistTelemetry,
} from "./storage";


function loadLocalEnv() {
  const envPath =
    path.resolve(
      process.cwd(),
      ".env.local",
    );

  if (
    !fs.existsSync(
      envPath,
    )
  ) {
    return;
  }

  const content =
    fs.readFileSync(
      envPath,
      "utf8",
    );

  for (
    const line of
    content.split(
      /\r?\n/,
    )
  ) {
    const trimmed =
      line.trim();

    if (
      !trimmed ||
      trimmed.startsWith(
        "#",
      )
    ) {
      continue;
    }

    const separator =
      trimmed.indexOf(
        "=",
      );

    if (
      separator ===
      -1
    ) {
      continue;
    }

    const key =
      trimmed
        .slice(
          0,
          separator,
        )
        .trim();

    let value =
      trimmed
        .slice(
          separator +
            1,
        )
        .trim();

    if (
      (
        value.startsWith(
          '"',
        ) &&
        value.endsWith(
          '"',
        )
      ) ||
      (
        value.startsWith(
          "'",
        ) &&
        value.endsWith(
          "'",
        )
      )
    ) {
      value =
        value.slice(
          1,
          -1,
        );
    }

    if (
      !process.env[
        key
      ]
    ) {
      process.env[
        key
      ] =
        value;
    }
  }
}


loadLocalEnv();

function logDevice(imei: string): string {
  return `…${imei.slice(-4)}`;
}



const host =
  process.env
    .TELTONIKA_HOST ??
  "0.0.0.0";

const port =
  Number(
    process.env
      .TELTONIKA_PORT ??
    5000,
  );

const idleTimeoutMs = Number(process.env.TELTONIKA_IDLE_TIMEOUT_MS ?? 300_000);
if (!Number.isInteger(idleTimeoutMs) || idleTimeoutMs < 1_000 || idleTimeoutMs > 86_400_000) {
  throw new Error("TELTONIKA_IDLE_TIMEOUT_MS must be between 1000 and 86400000");
}

const authTimeoutMs = Number(process.env.TELTONIKA_AUTH_TIMEOUT_MS ?? 30_000);
if (!Number.isInteger(authTimeoutMs) || authTimeoutMs < 1_000 || authTimeoutMs > 300_000) {
  throw new Error("TELTONIKA_AUTH_TIMEOUT_MS must be between 1000 and 300000");
}
const connectionLimiter = createConnectionLimiter(
  Number(process.env.TELTONIKA_MAX_CONNECTIONS ?? 4096),
  Number(process.env.TELTONIKA_MAX_CONNECTIONS_PER_IP ?? 64),
);

const controlHost =
  "127.0.0.1";

const controlPort =
  Number(
    process.env
      .TELTONIKA_CONTROL_PORT ??
    5001,
  );


if (
  !Number.isInteger(
    port,
  ) ||
  port < 1 ||
  port > 65535
) {
  throw new Error(
    "TELTONIKA_PORT must be a valid TCP port",
  );
}


type SessionState = {
  socket: net.Socket;
  ready: boolean;
  busy: boolean;
};


type PendingCommand = {
  resolve:
    (
      response: string,
    ) => void;

  reject:
    (
      error: Error,
    ) => void;

  timer:
    ReturnType<
      typeof setTimeout
    >;
};


const sessions =
  new Map<
    string,
    SessionState
  >();

const pendingCommands =
  new Map<
    string,
    PendingCommand
  >();


for (
  const entry of (
    process.env
      .TELTONIKA_DEV_DEVICES ??
    ""
  ).split(",")
) {
  const [
    imei,
    clientId,
    vehicleId,
    label,
  ] =
    entry.split(
      ":",
    );

  if (
    imei &&
    clientId &&
    vehicleId
  ) {
    registerDevice({
      imei,
      clientId,
      vehicleId,
      label:
        label ??
        vehicleId,
    });
  }
}


/*
 * Local load-test registry.
 *
 * Disabled by default. This only admits deterministic simulator IMEIs;
 * it does not create database rows and must never be used in production.
 */
const devFleetCount =
  Number(
    process.env
      .TELTONIKA_DEV_FLEET_COUNT ??
    0,
  );

if (
  Number.isInteger(
    devFleetCount,
  ) &&
  devFleetCount > 0 &&
  devFleetCount <= 10_000
) {
  for (
    let index = 0;
    index < devFleetCount;
    index += 1
  ) {
    const imei =
      `9900000000${String(
        index,
      ).padStart(
        5,
        "0",
      )}`;

    registerDevice({
      imei,
      clientId:
        "load-test-company",
      vehicleId:
        `load-test-vehicle-${index}`,
      label:
        `Load Test Vehicle ${index + 1}`,
    });
  }

  console.log(
    `[Teltonika] Registered ${devFleetCount} local load-test device(s)`,
  );
}


function sleep(
  ms: number,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        ms,
      );
    },
  );
}


async function waitForCommandWindow(
  imei: string,
) {
  const deadline =
    Date.now() +
    10_000;

  while (
    Date.now() <
    deadline
  ) {
    const state =
      sessions.get(
        imei,
      );

    if (
      state &&
      !state.busy &&
      state.ready &&
      !state.socket.destroyed
    ) {
      return state;
    }

    await sleep(
      50,
    );
  }

  throw new Error(
    "TRACKER_NOT_READY",
  );
}


async function sendCommand(
  imei: string,
  command: string,
) {
  if (
    pendingCommands.has(
      imei,
    )
  ) {
    throw new Error(
      "COMMAND_ALREADY_PENDING",
    );
  }


  const state =
    await waitForCommandWindow(
      imei,
    );


  state.ready =
    false;


  return new Promise<string>(
    (
      resolve,
      reject,
    ) => {
      const timer =
        setTimeout(
          () => {
            pendingCommands.delete(
              imei,
            );

            const current =
              sessions.get(
                imei,
              );

            if (
              current
            ) {
              current.ready =
                true;
            }

            reject(
              new Error(
                "COMMAND_TIMEOUT",
              ),
            );
          },
          12_000,
        );


      pendingCommands.set(
        imei,
        {
          resolve,
          reject,
          timer,
        },
      );


      state.socket.write(
        buildCodec12Command(
          command,
        ),
        (
          error,
        ) => {
          if (
            error
          ) {
            clearTimeout(
              timer,
            );

            pendingCommands.delete(
              imei,
            );

            state.ready =
              true;

            reject(
              error,
            );
          }
        },
      );


      console.log(
        `[Teltonika] command sent device=${logDevice(imei)} command=${command}`,
      );
    },
  );
}


function resolveCommand(
  imei: string,
  response: string,
) {
  const pending =
    pendingCommands.get(
      imei,
    );

  const state =
    sessions.get(
      imei,
    );

  if (
    state
  ) {
    state.ready =
      true;
  }

  if (
    !pending
  ) {
    console.warn(
      `[Teltonika] unsolicited command response device=${logDevice(imei)} bytes=${Buffer.byteLength(response, "utf8")}`,
    );

    return;
  }

  clearTimeout(
    pending.timer,
  );

  pendingCommands.delete(
    imei,
  );

  console.log(
    `[Teltonika] command response device=${logDevice(imei)} bytes=${Buffer.byteLength(response, "utf8")}`,
  );

  pending.resolve(
    response,
  );
}


function readJsonBody(
  request:
    http.IncomingMessage,
) {
  return new Promise<
    Record<
      string,
      unknown
    >
  >(
    (
      resolve,
      reject,
    ) => {
      let body =
        "";

      request.on(
        "data",
        (
          chunk,
        ) => {
          body +=
            chunk.toString(
              "utf8",
            );

          if (
            body.length >
            64_000
          ) {
            reject(
              new Error(
                "REQUEST_TOO_LARGE",
              ),
            );
          }
        },
      );

      request.on(
        "end",
        () => {
          try {
            resolve(
              body
                ? JSON.parse(
                    body,
                  )
                : {},
            );
          } catch {
            reject(
              new Error(
                "INVALID_JSON",
              ),
            );
          }
        },
      );

      request.on(
        "error",
        reject,
      );
    },
  );
}


function jsonResponse(
  response:
    http.ServerResponse,
  status:
    number,
  body:
    Record<
      string,
      unknown
    >,
) {
  const data =
    JSON.stringify(
      body,
    );

  response.writeHead(
    status,
    {
      "Content-Type":
        "application/json; charset=utf-8",

      "Content-Length":
        Buffer.byteLength(
          data,
        ),
    },
  );

  response.end(
    data,
  );
}


async function start() {
  await loadDevicesFromSupabase();


  const server =
    net.createServer(
      (
        socket,
      ) => {
        const releaseConnection = connectionLimiter.acquire(socket.remoteAddress);
        if (!releaseConnection) {
          socket.destroy();
          return;
        }
        socket.once("close", releaseConnection);

        socket.setKeepAlive(
          true,
          30_000,
        );

        socket.setNoDelay(
          true,
        );

        console.log(
          `[Teltonika] TCP connection opened`,
        );


        attachTeltonikaProtocol(
          socket,

          async ({
            imei,
            normalized,
          }) => {
            for (
              const telemetry of
              normalized
            ) {
              console.log(
                `[Teltonika] telemetry received device=${logDevice(imei)}`,
              );

              await persistTelemetry(
                  telemetry,
                );

              console.log(
                `[Teltonika] telemetry persisted device=${logDevice(imei)}`,
              );
            }
          },

          {
            onAuthenticated: ({
              imei,
              socket,
            }) => {
              sessions.set(
                imei,
                {
                  socket,
                  ready:
                    false,
                  busy:
                    false,
                },
              );

              console.log(
                `[Teltonika] session authenticated device=${logDevice(imei)}`,
              );
            },


            onAvlStart: ({
              imei,
            }) => {
              const state =
                sessions.get(
                  imei,
                );

              if (
                state
              ) {
                state.busy =
                  true;
              }
            },


            onAvlAcked: ({
              imei,
            }) => {
              const state =
                sessions.get(
                  imei,
                );

              if (
                state
              ) {
                state.busy =
                  false;

                state.ready =
                  true;
              }
            },


            onCommandResponse: ({
              imei,
              response,
            }) => {
              resolveCommand(
                imei,
                response,
              );
            },


            onDisconnected: ({
              imei,
            }) => {
              const state =
                sessions.get(
                  imei,
                );

              if (
                state?.socket ===
                socket
              ) {
                sessions.delete(
                  imei,
                );
              }

              const pending =
                pendingCommands.get(
                  imei,
                );

              if (
                pending
              ) {
                clearTimeout(
                  pending.timer,
                );

                pendingCommands.delete(
                  imei,
                );

                pending.reject(
                  new Error(
                    "TRACKER_DISCONNECTED",
                  ),
                );
              }
            },
          },
          { idleTimeoutMs, authTimeoutMs },
        );


        socket.on(
          "close",
          () => {
            console.log(
              "[Teltonika] TCP connection closed",
            );
          },
        );


        socket.on(
          "error",
          (
            error:
              Error,
          ) => {
            console.error(
              "[Teltonika] socket processing failed",
            );
          },
        );
      },
    );


  const controlServer =
    http.createServer(
      async (
        request,
        response,
      ) => {
        if (
          request.method !==
            "POST" ||
          request.url !==
            "/command"
        ) {
          jsonResponse(
            response,
            404,
            {
              error:
                "NOT_FOUND",
            },
          );

          return;
        }


        try {
          const body =
            await readJsonBody(
              request,
            );

          const imei =
            typeof body.imei ===
              "string"
              ? body.imei
              : "";

          const command =
            typeof body.command ===
              "string"
              ? body.command
              : "";


          if (
            !imei ||
            !command
          ) {
            jsonResponse(
              response,
              400,
              {
                error:
                  "IMEI_AND_COMMAND_REQUIRED",
              },
            );

            return;
          }


          /*
           * Remote command safety whitelist.
           *
           * lvcandtcclear:
           *   real LIGHT strategy when supported.
           *
           * matelematics_sim_j1939_dm11_dm3_clear:
           *   SIMULATOR ONLY.
           *   Never send this command to a real FMC650.
           */
          const j1939SimulatorCommand =
            "matelematics_sim_j1939_dm11_dm3_clear";

          const j1939SimulatorImei =
            process.env
              .TELTONIKA_J1939_SIM_IMEI ??
            "356307042441650";

          /*
           * REAL J1939 HARD LOCK V1.
           *
           * Even if a caller bypasses the web UI/API,
           * no command in the real-J1939 namespace
           * may reach a tracker.
           */
          if (
            command.startsWith(
              "matelematics_real_j1939_",
            )
          ) {
            jsonResponse(
              response,
              403,
              {
                error:
                  "REAL_J1939_TRANSMISSION_HARD_LOCKED",
              },
            );

            return;
          }


          const commandAllowed =
            command ===
              "lvcandtcclear" ||
            command ===
              j1939SimulatorCommand;

          if (
            !commandAllowed
          ) {
            jsonResponse(
              response,
              400,
              {
                error:
                  "COMMAND_NOT_ALLOWED",
              },
            );

            return;
          }

          /*
           * Second safety barrier:
           * simulation command is accepted only for
           * the dedicated J1939 simulator IMEI.
           */
          if (
            command ===
              j1939SimulatorCommand &&
            imei !==
              j1939SimulatorImei
          ) {
            jsonResponse(
              response,
              403,
              {
                error:
                  "J1939_SIMULATOR_COMMAND_FORBIDDEN",
              },
            );

            return;
          }


          const commandResponse =
            await sendCommand(
              imei,
              command,
            );


          jsonResponse(
            response,
            200,
            {
              ok:
                true,

              response:
                commandResponse,
            },
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          console.error("[Teltonika control] command failed");

          jsonResponse(
            response,
            503,
            {
              ok:
                false,

              error:
                ["TRACKER_NOT_READY", "COMMAND_ALREADY_PENDING", "COMMAND_TIMEOUT", "TRACKER_DISCONNECTED", "REQUEST_TOO_LARGE", "INVALID_JSON"].includes(message)
                  ? message : "COMMAND_FAILED",
            },
          );
        }
      },
    );


  server.listen(
    port,
    host,
    () => {
      console.log(
        `[Teltonika] Matelematics ingestion engine listening on ${host}:${port}`,
      );
    },
  );


  controlServer.listen(
    controlPort,
    controlHost,
    () => {
      console.log(
        `[Teltonika] local command bridge listening on ${controlHost}:${controlPort}`,
      );
    },
  );
}


start().catch(
  (
    error,
  ) => {
    console.error(
      "[Teltonika] startup failed",
    );

    process.exitCode =
      1;
  },
);