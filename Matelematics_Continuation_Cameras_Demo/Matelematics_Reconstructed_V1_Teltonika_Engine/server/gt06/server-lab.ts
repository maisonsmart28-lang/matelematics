import net from "node:net";
import { attachGt06Protocol } from "./protocol";

// Loopback-only synthetic protocol check. Database writes require an explicit opt-in.
const testImei = "864180070000001";
const host = "127.0.0.1";
const testWrites = process.env.GT06_ENABLE_TEST_WRITES === "I_ACCEPT_TEST_ONLY_WRITES";
if (testWrites && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)) {
  throw new Error("Mode écriture : SUPABASE_URL et SUPABASE_SECRET_KEY sont requis côté serveur.");
}
const port = Number(process.env.GT06_LAB_PORT ?? "5024");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GT06_LAB_PORT doit être un port TCP valide.");
}

const server = net.createServer((socket) => {
  socket.setTimeout(120_000, () => socket.destroy());
  attachGt06Protocol(socket, {
    acceptLogin: (imei) => imei === testImei,
    onLogin: () => console.log("[GT06 lab] connexion du simulateur autorisée"),
    onPosition: (position) => {
      const age = Math.abs(Date.now() - Date.parse(position.timestamp));
      if (position.imei !== testImei || !position.gpsValid || age > 300_000) {
        console.log("[GT06 lab] position synthétique rejetée");
        return;
      }
      console.log(`[GT06 lab] position synthétique décodée (protocole=${position.protocol}, satellites=${position.satellites})`);
      if (!testWrites) return;
      socket.pause();
      void import("./storage")
        .then(({ persistGt06Position }) => persistGt06Position(position))
        .then(({ result }) => console.log(`[GT06 lab] transaction synthétique : ${result}`))
        .catch((error: unknown) => {
          console.error(`[GT06 lab] écriture refusée : ${error instanceof Error ? error.message : "erreur inconnue"}`);
          socket.destroy();
        })
        .finally(() => socket.resume());
    },
    onUnknown: (protocol) => console.log(`[GT06 lab] protocole non géré: ${protocol}`),
  });
  socket.on("error", () => socket.destroy());
});

server.listen(port, host, () => {
  console.log(`[GT06 lab] écoute locale ${host}:${port}, IMEI synthétique uniquement, mode=${testWrites ? "test-write" : "read-only"}`);
});
