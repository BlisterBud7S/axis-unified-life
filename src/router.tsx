import { QueryClient, onlineManager } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24 * 7,
        staleTime: 1000 * 30,
        retry: 1,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 2,
      },
    },
  });

  if (typeof window !== "undefined") {
    onlineManager.setEventListener((setOnline) => {
      const handler = () => setOnline(navigator.onLine);
      window.addEventListener("online", handler);
      window.addEventListener("offline", handler);
      return () => {
        window.removeEventListener("online", handler);
        window.removeEventListener("offline", handler);
      };
    });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
