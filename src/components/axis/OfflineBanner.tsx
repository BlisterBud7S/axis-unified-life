import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const sync = () => {
      const isOffline = !navigator.onLine;
      setOffline((prev) => {
        if (prev && !isOffline) setWasOffline(true);
        return isOffline;
      });
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!wasOffline) return;
    const timer = setTimeout(() => setWasOffline(false), 3000);
    return () => clearTimeout(timer);
  }, [wasOffline]);

  if (!offline && !wasOffline) return null;

  if (wasOffline) {
    return (
      <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-center text-xs font-medium text-emerald-200 backdrop-blur animate-in fade-in duration-300">
        <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Back online — syncing your data.</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-xs font-medium text-amber-200 backdrop-blur">
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Offline — showing your last saved data. Changes will sync when you reconnect.</span>
    </div>
  );
}
