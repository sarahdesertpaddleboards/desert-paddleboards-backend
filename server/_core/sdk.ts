import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
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
      openId: adminId,               // REQUIRED
      appId: "admin",                // REQUIRED (can be any non-empty string)
      name: options.name ?? "",      // REQUIRED
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
    if (!cookieValue) {
      return null;
    }
  
    try {
      const { payload } = await jwtVerify(
        cookieValue,
        this.getSessionSecret(),
        { algorithms: ["HS256"] }
      );
  
      const { openId, name } = payload as Record<string, unknown>;
  
      if (
        typeof openId !== "string" ||
        typeof name !== "string" ||
        openId.length === 0
      ) {
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

export const sdk = new SDKServer();
