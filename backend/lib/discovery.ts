export const LAN_DISCOVERY_SERVICE = "sanantoniosafe-api";
export const LAN_DISCOVERY_API_VERSION = 1;

export type DiscoveryInfo = {
  service: typeof LAN_DISCOVERY_SERVICE;
  apiVersion: typeof LAN_DISCOVERY_API_VERSION;
  instanceId: string;
  name: string;
  scheme: "http" | "https";
  port: number;
  apiBasePath: "/";
  serverTime: string;
};

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;
}

export function getDiscoveryInfo(now = new Date()): DiscoveryInfo {
  const scheme =
    process.env.LAN_DISCOVERY_SCHEME === "https" ? "https" : "http";
  return {
    service: LAN_DISCOVERY_SERVICE,
    apiVersion: LAN_DISCOVERY_API_VERSION,
    instanceId:
      process.env.LAN_DISCOVERY_INSTANCE_ID?.trim() || "sanantoniosafe-local",
    name:
      process.env.LAN_DISCOVERY_NAME?.trim() ||
      "SanAntonioSafe Command Center",
    scheme,
    port: parsePort(process.env.PORT),
    apiBasePath: "/",
    serverTime: now.toISOString(),
  };
}