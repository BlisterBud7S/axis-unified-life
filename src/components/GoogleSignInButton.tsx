import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
  disabled?: boolean;
}

export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  const renderButton = useCallback(() => {
    if (!window.google || !containerRef.current) return;

    const clientId = import.meta.env["VITE_GOOGLE_CLIENT_ID"];
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => {
        callbackRef.current(response.credential);
      },
      ux_mode: "popup",
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      shape: "rectangular",
      theme: "outline",
      text,
      size: "large",
      width: containerRef.current.offsetWidth,
      logo_alignment: "center",
    });
  }, [text]);

  useEffect(() => {
    if (window.google) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [renderButton]);

  return (
    <div
      ref={containerRef}
      className={disabled ? "pointer-events-none opacity-50" : ""}
      style={{ minHeight: 44 }}
    />
  );
}
