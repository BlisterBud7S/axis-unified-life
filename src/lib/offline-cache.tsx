import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

let persister: ReturnType<typeof createSyncStoragePersister> | undefined;

function getPersister() {
  if (!persister) {
    persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "axis-offline-cache",
      throttleTime: 1000,
    });
  }
  return persister;
}

/**
 * Keeps the last successfully loaded AXIS data in local storage so the app can
 * be opened and read with no connection. Writing still requires internet.
 */
export function OfflineCacheProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister: getPersister(), maxAge: ONE_WEEK }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
