// Sandboxed iframes (e.g. an embedded preview) can render the app fine but
// silently block anchor-click downloads unless the embedder opts in with the
// `allow-downloads` sandbox flag. There's no reliable way to detect whether a
// download actually succeeded from inside the page, so callers that trigger a
// download should treat this as "may be blocked" and say so rather than
// claiming success.
export function isEmbeddedInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
