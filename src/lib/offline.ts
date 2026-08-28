const SW_URL = "/sw.js";

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
  const blocked = !import.meta.env.PROD || window.self !== window.top || killSwitch;

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
      // offline support is optional
    });
}
