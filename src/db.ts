import { nanoid } from "nanoid";
import type { Env, SiteConfig, NavLink, NavLinkRow, AiTool, AiToolRow, PostRow, PostListRow, SocialLink } from "./types";
import { boolToInt, isSafeHref } from "./utils";

// ========== DB Access ==========

export async function dbOrThrow(env: Env): Promise<D1Database> {
  if (!env.DB) throw new Error("Missing D1 binding: DB");
  return env.DB;
}

// ========== Posts ==========

export async function listPosts(env: Env, limit: number): Promise<PostListRow[]> {
  const db = await dbOrThrow(env);
  const res = await db
    .prepare("SELECT id, slug, title, excerpt, tags_json, cover_url, created_at, updated_at FROM posts ORDER BY created_at DESC LIMIT ?1")
    .bind(limit)
    .all<PostListRow>();
  return res.results || [];
}

export async function listPostsForFeed(env: Env, limit: number): Promise<PostRow[]> {
  const db = await dbOrThrow(env);
  const res = await db
    .prepare("SELECT id, slug, title, excerpt, tags_json, cover_url, created_at, updated_at, content_md FROM posts ORDER BY created_at DESC LIMIT ?1")
    .bind(limit)
    .all<PostRow>();
  return res.results || [];
}

export async function getPostBySlug(env: Env, slug: string): Promise<PostRow | null> {
  const db = await dbOrThrow(env);
  const row = await db
    .prepare("SELECT id, slug, title, excerpt, tags_json, cover_url, created_at, updated_at, content_md FROM posts WHERE slug = ?1 LIMIT 1")
    .bind(slug)
    .first<PostRow>();
  return row || null;
}

export async function slugExists(env: Env, slug: string): Promise<boolean> {
  const db = await dbOrThrow(env);
  const row = await db.prepare("SELECT 1 AS ok FROM posts WHERE slug = ?1 LIMIT 1").bind(slug).first<{ ok: number }>();
  return !!row;
}

// ========== Site Config ==========

export function defaultSiteConfig(env: Env): SiteConfig {
  return {
    blogTitle: (env.BLOG_TITLE || "zhaoxu的个人博客").trim() || "zhaoxu的个人博客",
    blogDescription: (env.BLOG_DESCRIPTION || "Cloudflare Workers + D1 动态博客").trim(),
    authorName: (env.AUTHOR_NAME || "zhaoxu").trim() || "zhaoxu",
    slogan: "大家好我zhaoxu，欢迎交流。",
    profileBio: (env.PROFILE_BIO || "啥也不会的混子。").trim(),
    githubUrl: (env.GITHUB_URL || "https://github.com/zhaoxuya520").trim(),
    email: (env.EMAIL || "ww7517437@gmail.com").trim(),
    socialLinks: [],
  };
}

export function normalizeSocialLinks(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const id = String(source.id || `social-${index}-${nanoid(6)}`).trim();
      const name = String(source.name || source.platform || "").trim();
      const url = String(source.url || "").trim();
      if (!name || !url || !isSafeHref(url)) return null;
      return { id, name, url };
    })
    .filter((item): item is SocialLink => !!item);
}

export async function getSiteConfig(env: Env): Promise<SiteConfig> {
  const fallback = defaultSiteConfig(env);
  try {
    const db = await dbOrThrow(env);
    const row = await db.prepare("SELECT value_json FROM site_settings WHERE key = 'site_config' LIMIT 1").first<{ value_json: string }>();
    if (!row?.value_json) return fallback;
    const parsed = JSON.parse(row.value_json) as Partial<SiteConfig>;
    return {
      blogTitle: String(parsed.blogTitle ?? fallback.blogTitle).trim() || fallback.blogTitle,
      blogDescription: String(parsed.blogDescription ?? fallback.blogDescription).trim(),
      authorName: String(parsed.authorName ?? fallback.authorName).trim() || fallback.authorName,
      slogan: String(parsed.slogan ?? fallback.slogan).trim(),
      profileBio: String(parsed.profileBio ?? fallback.profileBio).trim() || fallback.profileBio,
      githubUrl: String(parsed.githubUrl ?? fallback.githubUrl).trim(),
      email: String(parsed.email ?? fallback.email).trim(),
      socialLinks: normalizeSocialLinks(parsed.socialLinks ?? fallback.socialLinks),
    };
  } catch {
    return fallback;
  }
}

export async function saveSiteConfig(env: Env, config: SiteConfig): Promise<void> {
  const db = await dbOrThrow(env);
  const now = Date.now();
  await db
    .prepare("INSERT INTO site_settings (key, value_json, updated_at) VALUES ('site_config', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at")
    .bind(JSON.stringify(config), now)
    .run();
}

// ========== Nav Links ==========

export function defaultNavLinks(): NavLink[] {
  return [
    { id: "nav-home-fallback", label: "首页", href: "/", sortOrder: 0, openInNewTab: false },
    { id: "nav-posts-fallback", label: "文章", href: "/posts", sortOrder: 5, openInNewTab: false },
    { id: "nav-ai-fallback", label: "AI工具", href: "/ai/", sortOrder: 10, openInNewTab: false },
    { id: "nav-mail-fallback", label: "域名邮箱", href: "https://mail.linuxai.de", sortOrder: 20, openInNewTab: true },
    { id: "nav-about-fallback", label: "关于", href: "/about/", sortOrder: 30, openInNewTab: false },
  ];
}

function toNavLink(row: NavLinkRow): NavLink {
  return { id: row.id, label: row.label, href: row.href, sortOrder: row.sort_order, openInNewTab: !!row.open_in_new_tab };
}

export async function listNavLinks(env: Env): Promise<NavLink[]> {
  try {
    const db = await dbOrThrow(env);
    const result = await db
      .prepare("SELECT id, label, href, sort_order, open_in_new_tab, created_at, updated_at FROM nav_links ORDER BY sort_order ASC, created_at ASC")
      .all<NavLinkRow>();
    return (result.results || []).map(toNavLink);
  } catch {
    return defaultNavLinks();
  }
}

export async function createNavLink(env: Env, input: { label: string; href: string; sortOrder: number; openInNewTab: boolean }): Promise<NavLink> {
  const db = await dbOrThrow(env);
  const now = Date.now();
  const id = nanoid(16);
  await db
    .prepare("INSERT INTO nav_links (id, label, href, sort_order, open_in_new_tab, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(id, input.label, input.href, input.sortOrder, boolToInt(input.openInNewTab), now, now)
    .run();
  return { id, label: input.label, href: input.href, sortOrder: input.sortOrder, openInNewTab: input.openInNewTab };
}

export async function updateNavLink(env: Env, id: string, input: { label: string; href: string; sortOrder: number; openInNewTab: boolean }): Promise<NavLink | null> {
  const db = await dbOrThrow(env);
  const exists = await db.prepare("SELECT id FROM nav_links WHERE id = ?1 LIMIT 1").bind(id).first<{ id: string }>();
  if (!exists) return null;
  await db
    .prepare("UPDATE nav_links SET label = ?1, href = ?2, sort_order = ?3, open_in_new_tab = ?4, updated_at = ?5 WHERE id = ?6")
    .bind(input.label, input.href, input.sortOrder, boolToInt(input.openInNewTab), Date.now(), id)
    .run();
  return { id, label: input.label, href: input.href, sortOrder: input.sortOrder, openInNewTab: input.openInNewTab };
}

export async function deleteNavLink(env: Env, id: string): Promise<boolean> {
  const db = await dbOrThrow(env);
  const result = await db.prepare("DELETE FROM nav_links WHERE id = ?1").bind(id).run();
  return (result.meta?.changes || 0) > 0;
}

// ========== AI Tools ==========

function toAiTool(row: AiToolRow): AiTool {
  return { id: row.id, name: row.name, url: row.url, imageUrl: row.image_url, description: row.description, sortOrder: row.sort_order };
}

export async function listAiTools(env: Env): Promise<AiTool[]> {
  try {
    const db = await dbOrThrow(env);
    const result = await db
      .prepare("SELECT id, name, url, image_url, description, sort_order, created_at, updated_at FROM ai_tools ORDER BY sort_order ASC, created_at ASC")
      .all<AiToolRow>();
    return (result.results || []).map(toAiTool);
  } catch {
    return [];
  }
}

export async function createAiTool(env: Env, input: { name: string; url: string; imageUrl: string; description: string; sortOrder: number }): Promise<AiTool> {
  const db = await dbOrThrow(env);
  const now = Date.now();
  const id = nanoid(16);
  await db
    .prepare("INSERT INTO ai_tools (id, name, url, image_url, description, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
    .bind(id, input.name, input.url, input.imageUrl, input.description, input.sortOrder, now, now)
    .run();
  return { id, ...input };
}

export async function updateAiTool(env: Env, id: string, input: { name: string; url: string; imageUrl: string; description: string; sortOrder: number }): Promise<AiTool | null> {
  const db = await dbOrThrow(env);
  const exists = await db.prepare("SELECT id FROM ai_tools WHERE id = ?1 LIMIT 1").bind(id).first<{ id: string }>();
  if (!exists) return null;
  await db
    .prepare("UPDATE ai_tools SET name = ?1, url = ?2, image_url = ?3, description = ?4, sort_order = ?5, updated_at = ?6 WHERE id = ?7")
    .bind(input.name, input.url, input.imageUrl, input.description, input.sortOrder, Date.now(), id)
    .run();
  return { id, ...input };
}

export async function deleteAiTool(env: Env, id: string): Promise<boolean> {
  const db = await dbOrThrow(env);
  const result = await db.prepare("DELETE FROM ai_tools WHERE id = ?1").bind(id).run();
  return (result.meta?.changes || 0) > 0;
}

// ========== Resolve Site State ==========

export async function resolveSiteState(env: Env): Promise<import("./types").SiteState> {
  const [siteConfig, navLinks, aiTools] = await Promise.all([getSiteConfig(env), listNavLinks(env), listAiTools(env)]);
  return { siteConfig, navLinks, aiTools };
}


// ========== Comments ==========

import type { Comment, CommentRow } from "./types";

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postSlug: row.post_slug,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listComments(env: Env, postSlug: string): Promise<Comment[]> {
  try {
    const db = await dbOrThrow(env);
    const result = await db
      .prepare("SELECT id, post_slug, author_name, content, ip_hash, approved, created_at FROM comments WHERE post_slug = ?1 AND approved = 1 ORDER BY created_at ASC")
      .bind(postSlug)
      .all<CommentRow>();
    return (result.results || []).map(toComment);
  } catch {
    return [];
  }
}

export async function listAllComments(env: Env, limit: number = 200): Promise<Comment[]> {
  try {
    const db = await dbOrThrow(env);
    const result = await db
      .prepare("SELECT id, post_slug, author_name, content, ip_hash, approved, created_at FROM comments ORDER BY created_at DESC LIMIT ?1")
      .bind(limit)
      .all<CommentRow>();
    return (result.results || []).map(toComment);
  } catch {
    return [];
  }
}

export async function createComment(env: Env, input: { postSlug: string; authorName: string; content: string; ipHash: string }): Promise<Comment> {
  const db = await dbOrThrow(env);
  const id = nanoid(16);
  const now = Date.now();
  await db
    .prepare("INSERT INTO comments (id, post_slug, author_name, content, ip_hash, approved, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)")
    .bind(id, input.postSlug, input.authorName, input.content, input.ipHash, now)
    .run();
  return { id, postSlug: input.postSlug, authorName: input.authorName, content: input.content, createdAt: now };
}

export async function deleteComment(env: Env, id: string): Promise<boolean> {
  const db = await dbOrThrow(env);
  const result = await db.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return (result.meta?.changes || 0) > 0;
}

export async function countComments(env: Env): Promise<number> {
  try {
    const db = await dbOrThrow(env);
    const row = await db.prepare("SELECT COUNT(*) AS c FROM comments").first<{ c: number }>();
    return row?.c || 0;
  } catch {
    return 0;
  }
}

// ========== Search ==========

export async function searchPosts(env: Env, query: string, limit: number = 30): Promise<PostListRow[]> {
  try {
    const db = await dbOrThrow(env);
    const q = `%${query.trim().toLowerCase()}%`;
    const res = await db
      .prepare(
        "SELECT id, slug, title, excerpt, tags_json, cover_url, created_at, updated_at FROM posts " +
        "WHERE LOWER(title) LIKE ?1 OR LOWER(excerpt) LIKE ?1 OR LOWER(content_md) LIKE ?1 OR LOWER(tags_json) LIKE ?1 " +
        "ORDER BY created_at DESC LIMIT ?2"
      )
      .bind(q, limit)
      .all<PostListRow>();
    return res.results || [];
  } catch {
    return [];
  }
}



// ========== 首页配置 ==========

import type { HomeConfig, HomeProject } from "./types";

export function defaultHomeConfig(): HomeConfig {
  return {
    greeting: "写代码、搞安全、瞎折腾",
    headline: "记录一些有意思的东西。",
    bio: "",
    projects: [
      { icon: "🤖", title: "AI 全栈交付工作流", desc: "17 个岗位 · 100+ 技能模块 · 总控 + 路由 + 自进化", url: "https://github.com/zhaoxuya520" },
      { icon: "🔓", title: "逆向 & 渗透工作流", desc: "14 个模块 · 40+ CTF 子技能 · 完整渗透方法论", url: "https://github.com/zhaoxuya520" },
    ],
  };
}

export async function getHomeConfig(env: Env): Promise<HomeConfig> {
  const fallback = defaultHomeConfig();
  try {
    const db = await dbOrThrow(env);
    const row = await db.prepare("SELECT value_json FROM site_settings WHERE key = 'home_config' LIMIT 1").first<{ value_json: string }>();
    if (!row?.value_json) return fallback;
    const parsed = JSON.parse(row.value_json) as Partial<HomeConfig>;
    return {
      greeting: String(parsed.greeting ?? fallback.greeting).trim() || fallback.greeting,
      headline: String(parsed.headline ?? fallback.headline).trim() || fallback.headline,
      bio: String(parsed.bio ?? fallback.bio).trim(),
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((p: any) => ({
        icon: String(p.icon || "📦").slice(0, 4),
        title: String(p.title || "").trim().slice(0, 60),
        desc: String(p.desc || "").trim().slice(0, 120),
        url: String(p.url || "").trim().slice(0, 300),
      })).filter((p: HomeProject) => p.title) : fallback.projects,
    };
  } catch {
    return fallback;
  }
}

export async function saveHomeConfig(env: Env, config: HomeConfig): Promise<void> {
  const db = await dbOrThrow(env);
  const now = Date.now();
  await db
    .prepare("INSERT INTO site_settings (key, value_json, updated_at) VALUES ('home_config', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at")
    .bind(JSON.stringify(config), now)
    .run();
}
