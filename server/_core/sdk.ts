import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

/**
 * Session payload for admin users
 */
export type SessionPayload = {
  adminUserId: string;
  email: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

class SDKServer {
  private getSessionSecret() {
    if (!ENV.cookieSecret) {
      throw new Error("COOKIE_SECRET is not set");
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Create a signed session token for an admin user
   */
  async createSessionToken(
    adminId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: adminId,
      appId: "admin",
      name: options.name ?? "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify session cookie and return admin identity
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(
        cookieValue,
        this.getSessionSecret(),
        { algorithms: ["HS256"] }
      );

      const { openId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) {
        return null;
      }

      return {
        adminUserId: openId,
        email: name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Require an authenticated admin session
   */
  async requireAdmin(req: Request): Promise<SessionPayload> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Admin authentication required");
    }

    return session;
  }
}

/**
 * 🔑 SDK INSTANCE
 */
export const sdk = new SDKServer();

/**
 * 🍪 CREATE ADMIN SESSION COOKIE
 */
export async function createAdminSession(
  res: Response,
  payload: { adminId: number; email: string }
) {
  const token = await sdk.createSessionToken(String(payload.adminId), {
    name: payload.email,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: ONE_YEAR_MS,
  });
}

/**
 * 🧹 CLEAR ADMIN SESSION COOKIE
 */
export function clearAdminSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
