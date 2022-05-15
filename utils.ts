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