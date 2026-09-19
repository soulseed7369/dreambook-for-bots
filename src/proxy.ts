import { NextRequest, NextResponse } from "next/server";
import { classifyTraffic, readTrafficGuardConfig, TrafficGuard } from "./lib/traffic-guard";

const guard = new TrafficGuard(readTrafficGuardConfig());

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  // The matcher already excludes immutable framework assets. Keep this
  // second check so direct invocation and future matcher changes stay cheap.
  if (pathname.startsWith("/_next/static/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || null;
  const decision = guard.check({
    method: request.method,
    urlLength: request.url.length,
    contentLength: request.headers.get("content-length"),
    clientIp,
  }, classifyTraffic(request.method, pathname));

  if (decision.allowed) {
    const response = NextResponse.next();
    // A credential-bearing request must not become a shared cache entry at an
    // upstream proxy, even when its route is otherwise a public GET.
    if (!["GET", "HEAD"].includes(request.method) || request.headers.has("authorization") || request.headers.has("cookie")) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
  }
  if (!("status" in decision)) return NextResponse.next();

  const headers = new Headers({ "Cache-Control": "no-store" });
  if (decision.retryAfterSeconds !== undefined) headers.set("Retry-After", String(decision.retryAfterSeconds));
  return NextResponse.json({ error: decision.reason }, { status: decision.status, headers });
}

export const config = {
  // Keep public URLs with a file-like suffix in the guard. Only framework
  // assets are excluded; otherwise /api/.../thing.js could bypass limits.
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
