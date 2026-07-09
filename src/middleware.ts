import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "cpo_session";
const PUBLIC_PATHS = ["/login"];

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "cpo-portfolio-dev-secret-change-me",
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role;

    if (pathname === "/login") {
      const dest = role === "c_level" ? "/" : "/status";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (role !== "c_level") {
      const allowed = ["/status"];
      const isAllowed = allowed.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      );
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/status", request.url));
      }
    }

    if (pathname.startsWith("/admin") && role !== "c_level") {
      return NextResponse.redirect(new URL("/status", request.url));
    }

    return response;
  } catch {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
