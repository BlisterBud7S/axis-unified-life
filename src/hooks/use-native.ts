import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function useIsNative() {
  return Capacitor.isNativePlatform();
}

export function useNativeSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#09090b" }).catch(() => {});
      }

      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide().catch(() => {});

      const { Keyboard } = await import("@capacitor/keyboard");
      Keyboard.addListener("keyboardWillShow", (info) => {
        document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      });
      Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.style.setProperty("--keyboard-height", "0px");
      });
    })();
  }, []);
}
