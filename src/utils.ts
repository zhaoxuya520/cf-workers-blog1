import type { Env, JsonValue } from "./types";

// ========== HTML/XML 转义 ==========

export function esc(s: string): string {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeCodeHtml(s: string): string {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function xmlEscape(value: string): string {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]*>/g, "");
}

// ========== 文本处理 ==========

export function excerptFromMarkdown(mdText: string): string {
  const lines = (mdText || "").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const cleaned = t
      .replace(/^#{1,6}\s+/, "")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      .replace(/\[[^\]]+\]\([^)]+\)/g, (m) => m.replace(/[[\]()]/g, ""))
      .replace(/[`*_~]/g, "");
    const out = cleaned.trim();
    if (!out) continue;
    return out.length > 160 ? out.slice(0, 160) + "…" : out;
  }
  return "";
}

export function slugify(input: string): string {
  const s = (input || "").trim().toLowerCase();
  const ascii = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseTags(tagsJson: string): string[] {
  try {
    const v = JSON.parse(tagsJson || "[]");
    if (Array.isArray(v)) return v.map((t) => String(t)).filter(Boolean);
  } catch {}
  return [];
}

export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index);
}

// ========== 安全验证 ==========

export function isSafeHref(url: string): boolean {
  const value = (url || "").trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith("javascript:") || value.startsWith("data:")) return false;
  return value.startsWith("/") || value.startsWith("#") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:");
}

export function isSafeImageUrl(url: string): boolean {
  const value = (url || "").trim().toLowerCase();
  if (!value) return true;
  if (value.startsWith("javascript:")) return false;
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");
}

// ========== HTTP 响应构建 ==========

export function withSecurityHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self' https: data:",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return h;
}

export function json(data: JsonValue, init: ResponseInit = {}): Response {
  const headers = withSecurityHeaders(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-cache");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function html(body: string, init: ResponseInit = {}): Response {
  const headers = withSecurityHeaders(init.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return new Response(body, { ...init, headers });
}

export function xml(body: string, init: ResponseInit = {}): Response {
  const headers = withSecurityHeaders(init.headers);
  headers.set("Content-Type", "application/xml; charset=utf-8");
  return new Response(body, { ...init, headers });
}

export function badRequest(message: string): Response {
  return json({ ok: false, error: message }, { status: 400 });
}

export function unauthorized(): Response {
  return json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export function conflict(message: string): Response {
  return json({ ok: false, error: message }, { status: 409 });
}

// ========== CORS ==========

export function parseAllowedOrigins(env: Env): string[] {
  return String(env.CORS_ALLOW_ORIGINS || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(request: Request, env: Env): Headers | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = parseAllowedOrigins(env);
  if (!allowed.length) return null;
  if (!allowed.includes(origin)) return null;
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return headers;
}

export function applyCors(request: Request, env: Env, response: Response): Response {
  const cors = buildCorsHeaders(request, env);
  if (!cors) return response;
  const headers = new Headers(response.headers);
  cors.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function getSiteOrigin(request: Request, env: Env): string {
  const configured = String(env.SITE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

// ========== 杂项 ==========

export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

export function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}
