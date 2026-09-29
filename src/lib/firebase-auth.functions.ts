import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const firebaseGoogleSignIn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ idToken: z.string().min(100).max(10000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { signInWithFirebaseToken } = await import("@/lib/firebase-auth.server");
    return signInWithFirebaseToken(data.idToken);
  });
