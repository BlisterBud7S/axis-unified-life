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

async function clearAppWorkerState() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.allSettled(
      cacheNames.filter((name) => name.startsWith("axis-")).map((name) => caches.delete(name)),
    );
  }
}

export function registerOfflineSupport() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const blocked =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    killSwitch;


  if (blocked) {
    void clearAppWorkerState();
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  void navigator.serviceWorker
    .register(SW_URL, { scope: "/", updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => {
      // offline support is optional — never break the app over it
    });
}
