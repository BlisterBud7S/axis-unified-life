/**
 * Guarded service-worker registration.
 *
 * AXIS caches its app shell so the app opens and shows your last-loaded data
 * without a connection. Registration is refused in dev, inside iframes and in
 * Lovable preview hosts, and `?sw=off` unregisters everything.
 */

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerOfflineSupport() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).has("sw") === false
      ? false
      : false;

  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const blocked =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    killSwitch ||
    refused;

  if (blocked) {
    void unregisterAppWorkers();
    return;
  }

  void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
    // offline support is optional — never break the app over it
  });
}
