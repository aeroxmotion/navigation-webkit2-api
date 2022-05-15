export function generateRandomGroupID() {
  return [
    Date.now().toString(36),
    performance.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join('-');
}

export function debugPossibleUnhandledURL(deeplink: string, url: URL) {
  const params = [...url.searchParams.entries()];

  console.warn(`Possible unhandled URL: ${url.origin + url.pathname}

  --- Query Params ---
  ${params.length
    ? params
        .map(([key, value]) => `${key}: ${value}`)
        .join(`\n  `)
    : 'No query params found...'}

  --- Full parsed URL ---
  ${url.toString()}

  --- Unparsed URL ---
  ${deeplink}`);
}

export function getTargetURL(deeplink: string, rewriteHostDev = true) {
  const __inDev = window.location.hostname.startsWith('dev.');

  const parsedDeeplink = new URL(deeplink);
  const sniffedURL = parsedDeeplink.searchParams.get('url');
  const targetURL = sniffedURL ? new URL(sniffedURL) : parsedDeeplink;

  if (sniffedURL && __inDev && rewriteHostDev) {
    // Rewrite host pointing to self location
    targetURL.host = this._location.host;
  }

  if (!targetURL.protocol.startsWith('http')) {
    debugPossibleUnhandledURL(deeplink, targetURL);
  }

  return targetURL;
}
