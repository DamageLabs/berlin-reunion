import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient(), adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = authClient;
