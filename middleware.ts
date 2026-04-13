import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Marriott Admin", charset="UTF-8"',
    },
  });
}

function decodeBasicAuth(value: string) {
  if (!value.startsWith("Basic ")) {
    return null;
  }

  const encoded = value.slice("Basic ".length).trim();

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return new NextResponse("Admin credentials are not configured.", {
      status: 500,
    });
  }

  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return unauthorizedResponse();
  }

  const credentials = decodeBasicAuth(authorization);

  if (!credentials) {
    return unauthorizedResponse();
  }

  if (
    credentials.username !== adminUsername ||
    credentials.password !== adminPassword
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
