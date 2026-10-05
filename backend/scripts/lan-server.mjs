import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";
import { getResponder } from "@homebridge/ciao";
import { isLanDiscoveryEnabled, stopLanServices } from "./lan-server-utils.mjs";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const mode = process.argv[2] === "start" ? "start" : "dev";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const scheme =
  process.env.LAN_DISCOVERY_SCHEME === "https" ? "https" : "http";
const instanceId =
  process.env.LAN_DISCOVERY_INSTANCE_ID?.trim() || "sanantoniosafe-local";
const serviceName =
  process.env.LAN_DISCOVERY_NAME?.trim() || "SanAntonioSafe Command Center";
const discoveryEnabled = isLanDiscoveryEnabled(
  process.env.LAN_DISCOVERY_ENABLED ?? "true",
);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const child = spawn(
  process.execPath,
  [nextBin, mode, "-H", "0.0.0.0", "-p", String(port)],
  { stdio: "inherit", env: process.env },
);

let responder;
let service;
let stopping = false;

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  const url = `${scheme}://127.0.0.1:${port}/api/discovery`;
  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // Next.js is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`SanAntonioSafe backend did not become ready at ${url}`);
}

async function advertise() {
  if (!discoveryEnabled) {
    console.log("LAN discovery disabled (LAN_DISCOVERY_ENABLED=false).");
    return;
  }
  await waitForServer();
  responder = getResponder();
  service = responder.createService({
    name: serviceName,
    type: "sanantoniosafe",
    port,
    txt: {
      service: "sanantoniosafe-api",
      instanceId,
      apiVersion: "1",
      scheme,
      apiBasePath: "/",
    },
  });
  await service.advertise();
  console.log(
    `SanAntonioSafe LAN discovery active: _sanantoniosafe._tcp on port ${port}`,
  );
}

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  try {
    await stopLanServices({ service, responder, child });
  } catch (error) {
    console.error("Failed to stop LAN discovery cleanly:", error);
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
child.on("exit", (code) => void shutdown(code ?? 0));
child.on("error", (error) => {
  console.error("Failed to start Next.js:", error);
  void shutdown(1);
});

advertise().catch((error) => {
  console.error("LAN discovery failed:", error);
  void shutdown(1);
});