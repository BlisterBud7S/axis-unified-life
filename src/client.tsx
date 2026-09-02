import { StrictMode, startTransition } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

declare global {
  interface Window {
    $_TSR?: unknown;
  }
}

startTransition(() => {
  if (window.$_TSR) {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  } else {
    const router = getRouter();
    const container = document.getElementById("root") || document.body;
    createRoot(container).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  }
});
