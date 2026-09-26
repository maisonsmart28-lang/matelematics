import net from "node:net";
import { attachGt06Protocol } from "./protocol";

// Local-only synthetic protocol check. This process has no database client.
const testImei = "864180070000001";
const host = "127.0.0.1";
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
    },
    onUnknown: (protocol) => console.log(`[GT06 lab] protocole non géré: ${protocol}`),
  });
  socket.on("error", () => socket.destroy());
});

server.listen(port, host, () => {
  console.log(`[GT06 lab] écoute locale ${host}:${port}, IMEI synthétique uniquement, aucune écriture en base`);
});
