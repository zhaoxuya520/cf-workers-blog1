import type { Env } from "./types";
import { json, unauthorized } from "./utils";

const SESSION_COOKIE = "blog_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie") || "";
  const entries = header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      return idx >= 0 ? [part.slice(0, idx), part.slice(idx + 1)] : [part, ""];
    });
  return Object.fromEntries(entries);
}

async function signSession(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(env: Env, username: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({ username, exp: Date.now() + SESSION_TTL_MS })
    )
  );
  const signature = await signSession((env.ADMIN_TOKEN || "").trim(), payload);
  return `${payload}.${signature}`;
}

export async function readAdminSession(request: Request, env: Env): Promise<{ username: string } | null> {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || !(env.ADMIN_TOKEN || "").trim()) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await signSession((env.ADMIN_TOKEN || "").trim(), payload);
  if (expected !== signature) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { username?: string; exp?: number };
    if (!parsed.username || !parsed.exp || parsed.exp < Date.now()) return null;
    return { username: parsed.username };
  } catch {
    return null;
  }
}

export function hasAdminConfigured(env: Env): boolean {
  return !!(env.ADMIN_TOKEN || "").trim();
}

export function hasLoginConfigured(env: Env): boolean {
  return !!(env.ADMIN_TOKEN || "").trim() && !!(env.ADMIN_LOGIN_USERNAME || "").trim() && !!(env.ADMIN_LOGIN_PASSWORD || "").trim();
}

export function adminDisabled(): Response {
  return json({ ok: false, error: "ADMIN_TOKEN not configured." }, { status: 503 });
}

export function loginDisabled(): Response {
  return json({ ok: false, error: "Admin login is not configured." }, { status: 503 });
}

export async function ensureAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!hasAdminConfigured(env)) return adminDisabled();
  const session = await readAdminSession(request, env);
  if (session) return null;
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorized();
  if (match[1].trim() !== (env.ADMIN_TOKEN || "").trim()) return unauthorized();
  return null;
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
