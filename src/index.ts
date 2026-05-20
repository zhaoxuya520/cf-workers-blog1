/**
 * CF Workers Blog - 入口路由
 *
 * 项目结构：
 * src/
 * ├── index.ts       ← 入口路由（你在看的）
 * ├── types.ts       ← 类型定义
 * ├── utils.ts       ← 工具函数（转义/响应/CORS等）
 * ├── auth.ts        ← 认证鉴权（Session/Cookie/HMAC）
 * ├── db.ts          ← 数据访问层（D1 CRUD）
 * ├── templates.ts   ← 页面模板（layout/nav/calendar）
 * ├── pages.ts       ← 前台页面处理器
 * └── api.ts         ← API 路由处理器
 */

import type { Env } from "./types";
import { json, normalizePath, buildCorsHeaders, applyCors, html, withSecurityHeaders } from "./utils";
import { readAdminSession } from "./auth";
import { handleHome, handlePost, handleAbout, handleAi, handleRss, handleAtom, handleSitemap, notFoundPage, handlePostsList } from "./pages";
import {
  handleApiAdminSession, handleApiAdminLogin, handleApiAdminLogout,
  handleApiListPosts, handleApiGetPost, handleApiCreatePost, handleApiUpdatePost, handleApiDeletePost,
  handleApiAdminBootstrap, handleApiAdminSiteConfig, handleApiAdminProfile,
  handleApiAdminNavCollection, handleApiAdminNavItem,
  handleApiAdminAiCollection, handleApiAdminAiItem,
  handleApiListComments, handleApiCreateComment, handleApiAdminListComments, handleApiAdminDeleteComment,
  handleApiSearch, handleApiAdminHomeConfig,
} from "./api";
import { ADMIN_LOGIN_HTML, ADMIN_INDEX_HTML } from "./admin-html";

function adminHtmlResponse(body: string): Response {
  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);
    const isApiRequest = pathname.startsWith("/api/");

    // Admin pages — served inline by Worker, NOT from Assets CDN
    if (pathname === "/admin/index.html" || pathname === "/admin" || pathname === "/admin/") {
      if (!(await readAdminSession(request, env))) {
        return adminHtmlResponse(ADMIN_LOGIN_HTML);
      }
      return adminHtmlResponse(ADMIN_INDEX_HTML);
    }

    if (pathname === "/admin/login.html" || pathname === "/admin/login") {
      if (await readAdminSession(request, env)) {
        return Response.redirect(new URL("/admin", request.url).toString(), 302);
      }
      return adminHtmlResponse(ADMIN_LOGIN_HTML);
    }

    // CORS preflight
    if (isApiRequest && request.method === "OPTIONS") {
      const cors = buildCorsHeaders(request, env);
      if (!cors && request.headers.get("Origin")) {
        return json({ ok: false, error: "Origin not allowed" }, { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors || undefined });
    }

    // Try static assets (CSS/JS/images in ./public) — exclude /admin to enforce auth
    if (request.method === "GET" && !pathname.startsWith("/admin")) {
      try {
        const assetResp = await env.ASSETS.fetch(request);
        if (assetResp.status !== 404) return assetResp;
      } catch { /* continue to dynamic routes */ }
    }

    let response: Response;

    // ========== 前台页面路由 ==========
    if (pathname === "/") {
      response = await handleHome(request, env);
    } else if (pathname === "/about") {
      response = await handleAbout(request, env);
    } else if (pathname === "/posts") {
      response = await handlePostsList(request, env);
    } else if (pathname === "/ai") {
      response = await handleAi(request, env);
    } else if (pathname === "/rss.xml") {
      response = await handleRss(request, env);
    } else if (pathname === "/atom.xml") {
      response = await handleAtom(request, env);
    } else if (pathname === "/sitemap.xml") {
      response = await handleSitemap(request, env);
    } else if (pathname.startsWith("/posts/")) {
      response = await handlePost(request, env, pathname.slice("/posts/".length));

    // ========== API 路由 ==========
    } else if (pathname === "/api/posts") {
      if (request.method === "GET") response = await handleApiListPosts(request, env);
      else if (request.method === "POST") response = await handleApiCreatePost(request, env);
      else response = json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
    } else if (pathname.startsWith("/api/posts/")) {
      const slug = pathname.slice("/api/posts/".length);
      if (!slug) response = json({ ok: false, error: "Not Found" }, { status: 404 });
      else if (request.method === "GET") response = await handleApiGetPost(request, env, slug);
      else if (request.method === "PUT") response = await handleApiUpdatePost(request, env, slug);
      else if (request.method === "DELETE") response = await handleApiDeletePost(request, env, slug);
      else response = json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
    } else if (pathname === "/api/admin/bootstrap") {
      response = await handleApiAdminBootstrap(request, env);
    } else if (pathname === "/api/admin/session") {
      response = await handleApiAdminSession(request, env);
    } else if (pathname === "/api/admin/login") {
      response = await handleApiAdminLogin(request, env);
    } else if (pathname === "/api/admin/logout") {
      response = await handleApiAdminLogout(request);
    } else if (pathname === "/api/admin/site-config") {
      response = await handleApiAdminSiteConfig(request, env);
    } else if (pathname === "/api/admin/home-config") {
      response = await handleApiAdminHomeConfig(request, env);
    } else if (pathname === "/api/admin/profile") {
      response = await handleApiAdminProfile(request, env);
    } else if (pathname === "/api/admin/nav") {
      response = await handleApiAdminNavCollection(request, env);
    } else if (pathname === "/api/admin/ai") {
      response = await handleApiAdminAiCollection(request, env);
    } else if (pathname.startsWith("/api/admin/nav/")) {
      response = await handleApiAdminNavItem(request, env, pathname.slice("/api/admin/nav/".length));
    } else if (pathname.startsWith("/api/admin/ai/")) {
      response = await handleApiAdminAiItem(request, env, pathname.slice("/api/admin/ai/".length));
    } else if (pathname === "/api/admin/comments") {
      response = await handleApiAdminListComments(request, env);
    } else if (pathname.startsWith("/api/admin/comments/")) {
      response = await handleApiAdminDeleteComment(request, env, pathname.slice("/api/admin/comments/".length));
    } else if (pathname.startsWith("/api/comments/")) {
      const slug = pathname.slice("/api/comments/".length);
      if (request.method === "GET") response = await handleApiListComments(request, env, slug);
      else if (request.method === "POST") response = await handleApiCreateComment(request, env, slug);
      else response = json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
    } else if (pathname === "/api/search") {
      response = await handleApiSearch(request, env);
    } else {
      response = await notFoundPage(env);
    }

    return isApiRequest ? applyCors(request, env, response) : response;
  },
};
