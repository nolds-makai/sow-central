import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      // Reconcile against the current DB by email so stale JWTs (e.g. from a
      // prior DB) don't strand the session with a non-existent user id.
      if (session.user && token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
        } else if (token.id) {
          session.user.id = token.id as string;
        }
      } else if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
