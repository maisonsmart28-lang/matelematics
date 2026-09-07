import net from "node:net";
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
        `[Teltonika] command sent imei=${imei} command=${command}`,
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
      `[Teltonika] unsolicited command response imei=${imei}: ${response}`,
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
    `[Teltonika] command response imei=${imei}: ${response}`,
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
        socket.setKeepAlive(
          true,
          30_000,
        );

        socket.setNoDelay(
          true,
        );

        console.log(
          `[Teltonika] TCP connection from ${socket.remoteAddress}:${socket.remotePort}`,
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
                `[Teltonika] ${imei} ${telemetry.timestamp} ` +
                `${telemetry.latitude.toFixed(6)},${telemetry.longitude.toFixed(6)} ` +
                `${telemetry.speedKph} km/h`,
              );

              const saved =
                await persistTelemetry(
                  telemetry,
                );

              console.log(
                `[Teltonika] persisted device=${saved.deviceId} ` +
                `vehicle=${saved.vehicleId} ` +
                `recorded_at=${saved.recordedAt}`,
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
                `[Teltonika] session authenticated imei=${imei}`,
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
              "[Teltonika] socket error:",
              error.message,
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

          console.error(
            "[Teltonika control]",
            message,
          );

          jsonResponse(
            response,
            503,
            {
              ok:
                false,

              error:
                message,
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
      "[Teltonika] startup error:",
      error,
    );

    process.exitCode =
      1;
  },
);