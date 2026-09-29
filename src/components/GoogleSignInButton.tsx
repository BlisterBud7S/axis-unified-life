import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

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
  label?: string;
  disabled?: boolean;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
  label = "Continue with Google",
  disabled = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [gsiLoaded, setGsiLoaded] = useState(false);

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

    setGsiLoaded(true);
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
    <div className="relative" style={{ minHeight: 44 }}>
      {/* Fallback button shown until GIS renders */}
      {!gsiLoaded && (
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-gray-50 disabled:opacity-50 dark:bg-[#131314] dark:text-[#e3e3e3] dark:border-[#747775] dark:hover:bg-[#1f1f1f]"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          {label}
        </button>
      )}
      {/* GIS renders its button here */}
      <div
        ref={containerRef}
        className={`${gsiLoaded ? "" : "absolute inset-0 opacity-0 overflow-hidden"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />
    </div>
  );
}
