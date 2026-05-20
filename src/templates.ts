import type { SiteState, NavLink } from "./types";
import { esc } from "./utils";

// ========== 导航相关 ==========

function iconSvg(kind: "home" | "posts" | "ai" | "about" | "mail" | "link"): string {
  const icons = {
    home: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    posts: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    ai: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
    about: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    mail: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    link: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11 4"></path><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19"></path></svg>`,
  };
  return icons[kind];
}

function navKind(link: NavLink): "home" | "posts" | "ai" | "about" | "mail" | "link" {
  const href = link.href.toLowerCase();
  const label = link.label.toLowerCase();
  if (href === "/" || label.includes("首页")) return "home";
  if (href.startsWith("/posts") || label.includes("文章")) return "posts";
  if (href.startsWith("/ai") || label.includes("ai")) return "ai";
  if (href.startsWith("/about") || label.includes("关于")) return "about";
  if (href.includes("mail") || label.includes("邮箱")) return "mail";
  return "link";
}

function navLinkAttrs(link: NavLink): string {
  return link.openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : "";
}

function isActiveNav(link: NavLink, title?: string): boolean {
  if (!title || title === "首页") return link.href === "/";
  if (title === "文章") return link.href.startsWith("/posts");
  if (title === "AI工具") return link.href.startsWith("/ai");
  if (title === "关于") return link.href.startsWith("/about");
  return false;
}

export function renderNavItems(navLinks: NavLink[], title?: string): string {
  return navLinks
    .map((link) => {
      const kind = navKind(link);
      const active = isActiveNav(link, title);
      const external = link.openInNewTab ? " nav-external" : "";
      return `<a href="${esc(link.href)}" class="nav-item${active ? " active" : ""}${external}"${navLinkAttrs(link)}>
        ${iconSvg(kind)}
        <span class="nav-text">${esc(link.label)}</span>
      </a>`;
    })
    .join("\n");
}

// ========== 主布局模板 ==========

type LayoutOptions = {
  title?: string;
  description?: string;
  body: string;
  extraHead?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: string;
};

export function layout(state: SiteState, opts: LayoutOptions): string {
  const fullTitle = opts.title ? `${opts.title} · ${state.siteConfig.blogTitle}` : state.siteConfig.blogTitle;
  const desc = opts.description || state.siteConfig.blogDescription || "";
  const navHtml = renderNavItems(state.navLinks, opts.title);

  const canonicalTag = opts.canonicalPath ? `<link rel="canonical" href="${esc(opts.canonicalPath)}" />` : "";
  const ogImageTag = opts.ogImage ? `<meta property="og:image" content="${esc(opts.ogImage)}" />` : "";
  const ogTypeTag = opts.ogType || "website";
  const twitterCard = opts.ogImage ? "summary_large_image" : "summary";
  const jsonLdTag = opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(fullTitle)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="${ogTypeTag}" />
  ${ogImageTag}
  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${esc(fullTitle)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  ${canonicalTag}
  ${jsonLdTag}
  <script>
    (function() {
      var storageKey = "neonlab.theme";
      try {
        var saved = localStorage.getItem(storageKey);
        if (saved === "light" || saved === "dark") {
          document.documentElement.dataset.theme = saved;
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
          document.documentElement.dataset.theme = "light";
        } else {
          document.documentElement.dataset.theme = "dark";
        }
      } catch (e) {
        document.documentElement.dataset.theme = "dark";
      }
    })();
  </script>
  <link rel="stylesheet" href="/assets/css/style.min.css?v=20260520" />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="alternate" type="application/rss+xml" title="${esc(state.siteConfig.blogTitle)} RSS" href="/rss.xml" />
  <link rel="alternate" type="application/atom+xml" title="${esc(state.siteConfig.blogTitle)} Atom" href="/atom.xml" />
  ${opts.extraHead || ""}
</head>
<body>
  <canvas id="stars-canvas" aria-hidden="true"></canvas>
  <div class="cursor-glow" aria-hidden="true"></div>
  <div class="scroll-progress" aria-hidden="true"></div>
  <div class="bg" aria-hidden="true"></div>
  <header class="hero-banner">
    <nav class="navbar">
      <a class="navbar-left" href="/">
        <div class="avatar">
          <img src="/assets/avatar.webp" alt="头像" loading="lazy" onerror="this.src='/assets/avatar.jpg'">
        </div>
        <div class="site-name">
          <span>${esc(state.siteConfig.blogTitle)}</span>
        </div>
      </a>
      <div class="navbar-center" id="site-nav">${navHtml}</div>
      <div class="navbar-right">
        <button class="icon-btn" type="button" data-theme-toggle aria-label="切换主题" title="切换主题">
          <svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button class="hamburger" id="hamburger" aria-label="菜单" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div class="mobile-menu" id="mobileMenu">${navHtml}</div>
  </header>
  <main class="container content">${opts.body}</main>
  <footer class="site-footer">
    <div class="container">
      <p class="footer-text">
        © ${new Date().getFullYear()} ${esc(state.siteConfig.blogTitle)}
        <span class="footer-sep">·</span>
        <a class="footer-link" href="${esc(state.siteConfig.githubUrl || "https://github.com/zhaoxuya520")}" rel="noopener" target="_blank">GitHub</a>
        <span class="footer-sep">·</span>
        <a class="footer-link" href="/rss.xml">RSS</a>
      </p>
    </div>
  </footer>
  <button class="back-to-top" aria-label="返回顶部">↑</button>
  <div class="lightbox" aria-hidden="true">
    <button class="lightbox-close" aria-label="关闭">×</button>
    <img src="" alt="" />
  </div>
  <script src="/assets/js/sw-register.js" defer></script>
  <script src="/assets/js/main.js?v=20260520" defer></script>
</body>
</html>`;
}
