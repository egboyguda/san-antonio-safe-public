export function isLanDiscoveryEnabled(value = "true") {
  return !["0", "false", "off"].includes(String(value).toLowerCase());
}

export async function stopLanServices({ service, responder, child }) {
  if (service) await service.end();
  if (responder) await responder.shutdown();
  if (child && !child.killed) child.kill("SIGTERM");
}