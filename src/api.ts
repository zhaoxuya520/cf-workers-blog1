import { nanoid } from "nanoid";
import type { Env } from "./types";
import { json, badRequest, conflict, isSafeHref, isSafeImageUrl, slugify, normalizeTags, excerptFromMarkdown, parseTags, withSecurityHeaders } from "./utils";
import { ensureAdmin, hasLoginConfigured, readAdminSession, createSessionToken, buildSessionCookie, clearSessionCookie, SESSION_TTL_SECONDS } from "./auth";
import { dbOrThrow, listPosts, getPostBySlug, slugExists, getSiteConfig, saveSiteConfig, listNavLinks, createNavLink, updateNavLink, deleteNavLink, listAiTools, createAiTool, updateAiTool, deleteAiTool, resolveSiteState, normalizeSocialLinks, listComments, listAllComments, createComment, deleteComment, searchPosts, getHomeConfig, saveHomeConfig } from "./db";
import type { SiteConfig, HomeConfig } from "./types";

function sessionResponse(data: unknown, cookie: string, init: ResponseInit = {}): Response {
  const headers = withSecurityHeaders(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(data), { ...init, headers });
}

// ========== 输入规范化 ==========

function normalizeSiteConfigInput(input: unknown, fallback: SiteConfig): SiteConfig {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const githubUrl = String(source.githubUrl ?? fallback.githubUrl).trim();
  const email = String(source.email ?? fallback.email).trim();
  if (githubUrl && !isSafeHref(githubUrl)) throw new Error("GitHub 链接格式不正确");
  return {
    blogTitle: String(source.blogTitle ?? fallback.blogTitle).trim().slice(0, 120) || fallback.blogTitle,
    blogDescription: String(source.blogDescription ?? fallback.blogDescription).trim().slice(0, 280),
    authorName: String(source.authorName ?? fallback.authorName).trim().slice(0, 80) || fallback.authorName,
    slogan: String(source.slogan ?? fallback.slogan).trim().slice(0, 120),
    profileBio: String(source.profileBio ?? fallback.profileBio).trim() || fallback.profileBio,
    githubUrl,
    email,
    socialLinks: normalizeSocialLinks(source.socialLinks ?? fallback.socialLinks),
  };
}

function normalizeNavLinkInput(input: unknown): { label: string; href: string; sortOrder: number; openInNewTab: boolean } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const label = String(source.label ?? "").trim().slice(0, 40);
  const href = String(source.href ?? "").trim().slice(0, 320);
  const sortOrder = Number.parseInt(String(source.sortOrder ?? 0), 10);
  const openInNewTab = !!source.openInNewTab;
  if (!label) throw new Error("导航标题不能为空");
  if (!href) throw new Error("导航链接不能为空");
  if (!isSafeHref(href)) throw new Error("导航链接格式不正确");
  return { label, href, sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder, openInNewTab };
}

function normalizeAiToolInput(input: unknown): { name: string; url: string; imageUrl: string; description: string; sortOrder: number } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const name = String(source.name ?? "").trim().slice(0, 80);
  const url = String(source.url ?? "").trim().slice(0, 320);
  const imageUrl = String(source.imageUrl ?? "").trim().slice(0, 320);
  const description = String(source.description ?? "").trim().slice(0, 180);
  const sortOrder = Number.parseInt(String(source.sortOrder ?? 0), 10);
  if (!name) throw new Error("工具名称不能为空");
  if (!url) throw new Error("工具链接不能为空");
  if (!/^https?:\/\//i.test(url)) throw new Error("工具链接需要是 http 或 https 地址");
  if (imageUrl && !isSafeImageUrl(imageUrl)) throw new Error("图片链接格式不正确");
  return { name, url, imageUrl, description, sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder };
}

// ========== Admin Session ==========

export async function handleApiAdminSession(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const session = await readAdminSession(request, env);
  if (!session) return json({ ok: false, authenticated: false }, { status: 401 });
  return json({ ok: true, authenticated: true, username: session.username });
}

export async function handleApiAdminLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  if (!hasLoginConfigured(env)) return json({ ok: false, error: "Admin login is not configured." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return badRequest("Invalid JSON"); }
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return badRequest("用户名和密码不能为空");
  if (username !== (env.ADMIN_LOGIN_USERNAME || "").trim() || password !== (env.ADMIN_LOGIN_PASSWORD || "")) {
    return json({ ok: false, error: "用户名或密码错误" }, { status: 401 });
  }
  const token = await createSessionToken(env, username);
  return sessionResponse({ ok: true, username }, buildSessionCookie(token, SESSION_TTL_SECONDS));
}

export async function handleApiAdminLogout(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  return sessionResponse({ ok: true }, clearSessionCookie());
}

// ========== Posts API ==========

export async function handleApiListPosts(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const limitParam = new URL(request.url).searchParams.get("limit") || "50";
  const limit = Math.max(1, Math.min(200, Number(limitParam) || 50));
  try {
    const posts = await listPosts(env, limit);
    return json({ ok: true, posts: posts.map((p) => ({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, tags: parseTags(p.tags_json), coverUrl: p.cover_url, createdAt: p.created_at, updatedAt: p.updated_at })) });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

export async function handleApiGetPost(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try {
    const post = await getPostBySlug(env, slug);
    if (!post) return json({ ok: false, error: "Not Found" }, { status: 404 });
    return json({ ok: true, post: { id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt, tags: parseTags(post.tags_json), coverUrl: post.cover_url, contentMd: post.content_md, createdAt: post.created_at, updatedAt: post.updated_at } });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

export async function handleApiCreatePost(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return badRequest("Invalid JSON"); }
  const title = String(body.title || "").trim();
  const contentMd = String(body.contentMd || body.content || "").trim();
  const tags = normalizeTags(body.tags);
  const coverUrl = String(body.coverUrl || "").trim();
  if (!title) return badRequest("Missing title");
  if (!contentMd) return badRequest("Missing contentMd");
  if (!isSafeImageUrl(coverUrl)) return badRequest("coverUrl 格式不正确");
  const wantedSlug = slugify(String(body.slug || "").trim());
  let slug = wantedSlug || slugify(title);
  if (!slug) slug = `post-${nanoid(10)}`;
  try {
    if (await slugExists(env, slug)) return conflict("Slug already exists");
    const now = Date.now();
    const excerpt = String(body?.excerpt || "").trim() || excerptFromMarkdown(contentMd);
    const id = nanoid(16);
    const db = await dbOrThrow(env);
    await db.prepare("INSERT INTO posts (id, slug, title, excerpt, tags_json, cover_url, content_md, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
      .bind(id, slug, title, excerpt, JSON.stringify(tags), coverUrl, contentMd, now, now).run();
    return json({ ok: true, id, slug });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

export async function handleApiUpdatePost(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "PUT") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return badRequest("Invalid JSON"); }
  try {
    const db = await dbOrThrow(env);
    const existing = await getPostBySlug(env, slug);
    if (!existing) return json({ ok: false, error: "Not Found" }, { status: 404 });
    const nextTitle = body.title != null ? String(body.title).trim() : existing.title;
    const nextContent = body.contentMd != null ? String(body.contentMd).trim() : body.content != null ? String(body.content).trim() : existing.content_md;
    const nextExcerpt = body.excerpt != null ? String(body.excerpt).trim() : existing.excerpt;
    const nextCover = body.coverUrl != null ? String(body.coverUrl).trim() : existing.cover_url;
    const nextTags = body.tags != null ? normalizeTags(body.tags) : parseTags(existing.tags_json);
    const requestedSlug = body.slug != null ? slugify(String(body.slug).trim()) : existing.slug;
    const nextSlug = requestedSlug || slugify(nextTitle) || existing.slug;
    if (!nextTitle) return badRequest("Missing title");
    if (!nextContent) return badRequest("Missing contentMd");
    if (!isSafeImageUrl(nextCover)) return badRequest("coverUrl 格式不正确");
    if (nextSlug !== existing.slug && (await slugExists(env, nextSlug))) return conflict("Slug already exists");
    await db.prepare("UPDATE posts SET slug=?1, title=?2, excerpt=?3, tags_json=?4, cover_url=?5, content_md=?6, updated_at=?7 WHERE slug=?8")
      .bind(nextSlug, nextTitle, nextExcerpt || excerptFromMarkdown(nextContent), JSON.stringify(nextTags), nextCover, nextContent, Date.now(), slug).run();
    return json({ ok: true, slug: nextSlug });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

export async function handleApiDeletePost(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "DELETE") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  try {
    const db = await dbOrThrow(env);
    await db.prepare("DELETE FROM posts WHERE slug=?1").bind(slug).run();
    return json({ ok: true });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

// ========== Admin Bootstrap ==========

export async function handleApiAdminBootstrap(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  try {
    const [state, posts] = await Promise.all([resolveSiteState(env), listPosts(env, 200)]);
    return json({ ok: true, siteConfig: state.siteConfig, navLinks: state.navLinks, aiTools: state.aiTools, posts: posts.map((post) => ({ id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt, tags: parseTags(post.tags_json), coverUrl: post.cover_url, createdAt: post.created_at, updatedAt: post.updated_at })) });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}

// ========== Site Config & Profile ==========

export async function handleApiAdminSiteConfig(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method === "GET") { try { return json({ ok: true, siteConfig: await getSiteConfig(env) }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  if (request.method !== "PUT") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try {
    const current = await getSiteConfig(env);
    const payload = await request.json() as Record<string, unknown>;
    const next = normalizeSiteConfigInput({ ...current, blogTitle: payload.blogTitle, blogDescription: payload.blogDescription }, current);
    await saveSiteConfig(env, next);
    return json({ ok: true, siteConfig: next });
  } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); }
}

export async function handleApiAdminProfile(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method === "GET") { try { return json({ ok: true, profile: await getSiteConfig(env) }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  if (request.method !== "PUT") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try {
    const current = await getSiteConfig(env);
    const payload = (await request.json()) as Record<string, unknown>;
    const next = normalizeSiteConfigInput({ ...current, authorName: payload.authorName, slogan: payload.slogan, githubUrl: payload.githubUrl, email: payload.email, profileBio: payload.profileBio, socialLinks: payload.socialLinks }, current);
    await saveSiteConfig(env, next);
    return json({ ok: true, profile: next });
  } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); }
}

// ========== Nav Admin ==========

export async function handleApiAdminNavCollection(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method === "GET") { try { return json({ ok: true, navLinks: await listNavLinks(env) }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try { const navLink = await createNavLink(env, normalizeNavLinkInput(await request.json())); return json({ ok: true, navLink }); } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); }
}

export async function handleApiAdminNavItem(request: Request, env: Env, id: string): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (!id) return json({ ok: false, error: "Not Found" }, { status: 404 });
  if (request.method === "PUT") { try { const navLink = await updateNavLink(env, id, normalizeNavLinkInput(await request.json())); if (!navLink) return json({ ok: false, error: "Not Found" }, { status: 404 }); return json({ ok: true, navLink }); } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); } }
  if (request.method === "DELETE") { try { const deleted = await deleteNavLink(env, id); if (!deleted) return json({ ok: false, error: "Not Found" }, { status: 404 }); return json({ ok: true }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}

// ========== AI Tools Admin ==========

export async function handleApiAdminAiCollection(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method === "GET") { try { return json({ ok: true, aiTools: await listAiTools(env) }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try { const aiTool = await createAiTool(env, normalizeAiToolInput(await request.json())); return json({ ok: true, aiTool }); } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); }
}

export async function handleApiAdminAiItem(request: Request, env: Env, id: string): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (!id) return json({ ok: false, error: "Not Found" }, { status: 404 });
  if (request.method === "PUT") { try { const aiTool = await updateAiTool(env, id, normalizeAiToolInput(await request.json())); if (!aiTool) return json({ ok: false, error: "Not Found" }, { status: 404 }); return json({ ok: true, aiTool }); } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); } }
  if (request.method === "DELETE") { try { const deleted = await deleteAiTool(env, id); if (!deleted) return json({ ok: false, error: "Not Found" }, { status: 404 }); return json({ ok: true }); } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); } }
  return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}


// ========== Comments API ==========

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "|blog-comment-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleApiListComments(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  if (!slug) return badRequest("Missing slug");
  try {
    const comments = await listComments(env, slug);
    return json({ ok: true, comments });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function handleApiCreateComment(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  if (!slug) return badRequest("Missing slug");

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return badRequest("Invalid JSON"); }

  const authorName = String(body.authorName || body.name || "").trim().slice(0, 40);
  const content = String(body.content || "").trim().slice(0, 2000);

  if (!authorName) return badRequest("昵称不能为空");
  if (!content) return badRequest("评论内容不能为空");
  if (content.length < 2) return badRequest("评论内容太短");

  // 简单防垃圾：URL 不能太多
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) return badRequest("链接过多，请精简内容");

  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
  const ipHash = await hashIp(ip);

  try {
    const comment = await createComment(env, { postSlug: slug, authorName, content, ipHash });
    return json({ ok: true, comment });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function handleApiAdminListComments(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try {
    const comments = await listAllComments(env, 500);
    return json({ ok: true, comments });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function handleApiAdminDeleteComment(request: Request, env: Env, id: string): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method !== "DELETE") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  if (!id) return json({ ok: false, error: "Not Found" }, { status: 404 });
  try {
    const deleted = await deleteComment(env, id);
    if (!deleted) return json({ ok: false, error: "Not Found" }, { status: 404 });
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// ========== Search API ==========

export async function handleApiAdminHomeConfig(request: Request, env: Env): Promise<Response> {
  const denied = await ensureAdmin(request, env); if (denied) return denied;
  if (request.method === "GET") {
    try { return json({ ok: true, homeConfig: await getHomeConfig(env) }); }
    catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
  }
  if (request.method !== "PUT") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const current = await getHomeConfig(env);
    const next: HomeConfig = {
      greeting: String(payload.greeting ?? current.greeting).trim().slice(0, 80) || current.greeting,
      headline: String(payload.headline ?? current.headline).trim().slice(0, 120) || current.headline,
      bio: String(payload.bio ?? current.bio).trim().slice(0, 300),
      projects: Array.isArray(payload.projects) ? payload.projects.map((p: any) => ({
        icon: String(p.icon || "📦").slice(0, 4),
        title: String(p.title || "").trim().slice(0, 60),
        desc: String(p.desc || "").trim().slice(0, 120),
        url: String(p.url || "").trim().slice(0, 300),
      })).filter((p: any) => p.title).slice(0, 6) : current.projects,
    };
    await saveHomeConfig(env, next);
    return json({ ok: true, homeConfig: next });
  } catch (e) { return badRequest(e instanceof Error ? e.message : String(e)); }
}

export async function handleApiSearch(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  if (!query) return json({ ok: true, posts: [] });
  if (query.length > 100) return badRequest("query too long");

  try {
    const posts = await searchPosts(env, query, 30);
    return json({
      ok: true,
      posts: posts.map((p) => ({
        slug: p.slug, title: p.title, excerpt: p.excerpt,
        tags: parseTags(p.tags_json), createdAt: p.created_at,
      })),
    });
  } catch (e) { return json({ ok: false, error: String(e) }, { status: 500 }); }
}
