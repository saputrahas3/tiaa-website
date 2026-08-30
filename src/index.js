/**
 * TIAA — Worker entrypoint.
 *
 * This Worker does two jobs:
 *   1) Serve the static site (dashboard, landing page, images) via the
 *      `ASSETS` binding configured in wrangler.toml.
 *   2) Proxy Binance REST + WebSocket calls through Cloudflare's own network,
 *      so the end user's browser never talks to *.binance.com directly.
 *
 * Why: several Indonesian ISPs / mobile carriers block Binance's domains at
 * the network level. When the browser calls Binance directly, users on those
 * networks get "Gagal memuat data crypto" even though the site itself is up.
 * Routing the request through this Worker instead means the *browser* only
 * ever talks to our own domain — Cloudflare's edge (not the user's ISP) is
 * the one reaching out to Binance, which isn't blocked.
 *
 * Proxy path scheme (kept deliberately generic so any current or future
 * Binance REST endpoint works without code changes here):
 *   /binance-proxy/futures/<any-fapi-path>   -> https://fapi.binance.com/<any-fapi-path>
 *   /binance-proxy/spot/<any-api-path>       -> https://api.binance.com/<any-api-path>
 *   /binance-proxy/ws/futures-ticker         -> wss://fstream.binance.com/ws/!ticker@arr
 *   /binance-proxy/ws/spot-ticker            -> wss://stream.binance.com:9443/ws/!ticker@arr
 */

const FUTURES_PREFIX = "/binance-proxy/futures/";
const SPOT_PREFIX = "/binance-proxy/spot/";
const WS_FUTURES_PATH = "/binance-proxy/ws/futures-ticker";
const WS_SPOT_PATH = "/binance-proxy/ws/spot-ticker";

// Small allowlist of upstream hosts we're willing to proxy to — even though the
// path prefix already fully determines the target, this is a second guardrail
// so this Worker can never be tricked into proxying to an arbitrary host.
const ALLOWED_REST_TARGETS = {
  futures: "https://fapi.binance.com/",
  spot: "https://api.binance.com/",
};
const ALLOWED_WS_TARGETS = {
  [WS_FUTURES_PATH]: "wss://fstream.binance.com/ws/!ticker@arr",
  [WS_SPOT_PATH]: "wss://stream.binance.com:9443/ws/!ticker@arr",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith(FUTURES_PREFIX)) {
        return proxyRest(request, url, ALLOWED_REST_TARGETS.futures, path.slice(FUTURES_PREFIX.length));
      }
      if (path.startsWith(SPOT_PREFIX)) {
        return proxyRest(request, url, ALLOWED_REST_TARGETS.spot, path.slice(SPOT_PREFIX.length));
      }
      if (path === WS_FUTURES_PATH || path === WS_SPOT_PATH) {
        return proxyWebSocket(request, ALLOWED_WS_TARGETS[path]);
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "proxy_error", detail: String(err && err.message ? err.message : err) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Everything else: serve the static site (HTML/CSS/JS/images) from ./public.
    return env.ASSETS.fetch(request);
  },
};

/** Proxies a REST call to Binance and relays the JSON response back as-is. */
async function proxyRest(request, url, targetBase, remainderPath) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = targetBase + remainderPath + url.search;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: { Accept: "application/json" },
      signal: controller.signal,
      // Cache public, read-only market data very briefly at Cloudflare's edge to
      // shave latency off repeated identical calls without serving stale prices.
      cf: { cacheTtl: 2, cacheEverything: true },
    });

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Proxies a WebSocket connection: accepts the browser's Upgrade request,
 * opens a matching outbound WebSocket to Binance from Cloudflare's network,
 * and relays messages in both directions until either side closes.
 */
async function proxyWebSocket(request, target) {
  if (!target) {
    return new Response("Unknown WebSocket route", { status: 404 });
  }
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  // Open the outbound connection to Binance first — if this fails (e.g. Binance
  // is genuinely down), fail fast instead of accepting the client socket.
  const upstreamResp = await fetch(target, { headers: { Upgrade: "websocket" } });
  const upstreamWS = upstreamResp.webSocket;
  if (!upstreamWS) {
    return new Response("Upstream WebSocket connect failed", { status: 502 });
  }
  upstreamWS.accept();

  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();

  const closeBoth = () => {
    try { upstreamWS.close(); } catch (e) {}
    try { server.close(); } catch (e) {}
  };

  upstreamWS.addEventListener("message", (evt) => {
    try { server.send(evt.data); } catch (e) {}
  });
  server.addEventListener("message", (evt) => {
    try { upstreamWS.send(evt.data); } catch (e) {}
  });
  upstreamWS.addEventListener("close", closeBoth);
  server.addEventListener("close", closeBoth);
  upstreamWS.addEventListener("error", closeBoth);
  server.addEventListener("error", closeBoth);

  return new Response(null, { status: 101, webSocket: client });
}
