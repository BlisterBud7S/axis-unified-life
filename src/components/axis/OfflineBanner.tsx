import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Shows a slim bar when the device has no connection, so it's obvious that the
 * numbers on screen are the last saved copy and that AI / saving are paused.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-xs font-medium text-amber-200 backdrop-blur">
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Offline — showing your last saved data. Saving and AI resume when you reconnect.</span>
    </div>
  );
}
