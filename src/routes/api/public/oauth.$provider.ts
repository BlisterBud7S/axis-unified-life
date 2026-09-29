import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/oauth/$provider")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const providerId = String(params.provider ?? "");
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          return new Response(popupHtml(false, error), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        if (!code || !state) {
          return new Response(popupHtml(false, "Missing code or state"), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        try {
          const { handleOAuthCallback } = await import("@/lib/oauth.server");
          await handleOAuthCallback({ providerId, code, state });
          return new Response(popupHtml(true), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error(`[oauth] Callback error for ${providerId}:`, msg);
          return new Response(popupHtml(false, msg), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      },
    },
  },
});

function popupHtml(success: boolean, error?: string): string {
  const title = success ? "Connected!" : "Connection failed";
  const body = success
    ? "You can close this window."
    : `Something went wrong: ${error ?? "Unknown error"}. Please close this window and try again.`;

  return `<!DOCTYPE html>
<html><head><title>${title}</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff">
<div style="text-align:center;max-width:400px;padding:2rem">
<h2>${title}</h2>
<p style="color:#999">${body}</p>
</div>
<script>
if(window.opener){window.opener.postMessage({type:"axis-oauth-complete",success:${success}},"*")}
setTimeout(function(){window.close()},${success ? 2000 : 5000});
</script>
</body></html>`;
}
