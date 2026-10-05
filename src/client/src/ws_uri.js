// Which WebBridge the page connects to.
//
// A ?wsUri= query wins. Otherwise the viewer config's wsUri is used, except
// that a loopback wsUri (ws://127.0.0.1:...) on a page opened from another
// machine (http://<simulation-host>:<port>/...) takes the page's host, so a
// browser on the same LAN reaches the WebBridge on the simulation host.

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function wsUriForPage(configWsUri, pageUrl) {
  let page;
  try {
    page = new URL(pageUrl);
  } catch {
    return configWsUri;
  }
  const queried = page.searchParams.get("wsUri");
  if (queried) return queried;
  if (!configWsUri) return configWsUri;
  let ws;
  try {
    ws = new URL(configWsUri);
  } catch {
    return configWsUri;
  }
  if (!LOOPBACK_HOSTS.has(ws.hostname) || !page.hostname || LOOPBACK_HOSTS.has(page.hostname)) {
    return configWsUri;
  }
  ws.hostname = page.hostname;
  const rewritten = ws.toString();
  return configWsUri.endsWith("/") ? rewritten : rewritten.replace(/\/$/, "");
}
