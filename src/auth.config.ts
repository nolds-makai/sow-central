import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = "@makailabs.ai";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          hd: "makailabs.ai",
        },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    signIn({ profile, account }) {
      if (account?.provider !== "google") return false;
      const email = profile?.email;
      const verified = profile?.email_verified;
      if (!email || !verified) return false;
      return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
