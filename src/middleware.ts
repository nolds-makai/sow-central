import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isAuthPage = path === "/signin";

  if (!isLoggedIn && !isAuthPage) {
    const signInUrl = new URL("/signin", req.nextUrl);
    if (path !== "/") signInUrl.searchParams.set("callbackUrl", path);
    return Response.redirect(signInUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
