import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import type { Env, PostRow, PostListRow } from "./types";
import { esc, escapeCodeHtml, html, xml, xmlEscape, stripHtml, formatDate, parseTags, isSafeHref, getSiteOrigin, json } from "./utils";
import { resolveSiteState, listPosts, listPostsForFeed, getPostBySlug, getHomeConfig } from "./db";
import { layout, renderNavItems } from "./templates";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language, ignoreIllegals: true }).value}</code></pre>`;
    }
    if (code.trim()) {
      return `<pre class="hljs"><code>${hljs.highlightAuto(code).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${escapeCodeHtml(code)}</code></pre>`;
  },
});
md.validateLink = (url: string) => isSafeHref(url);

// 如果 markdown 第一行是 H1 且内容和文章标题相同/相似，则去掉避免重复
function stripLeadingH1(mdText: string, title: string): string {
  const lines = mdText.split(/\r?\n/);
  const first = (lines[0] || "").trim();
  if (/^#\s+/.test(first)) {
    const h1Text = first.replace(/^#\s+/, "").trim();
    // 如果 H1 内容和 title 匹配（去掉标点差异），跳过这行
    const normalize = (s: string) => s.replace(/[：:""「」\s]/g, "").toLowerCase();
    if (normalize(h1Text) === normalize(title) || h1Text === title) {
      lines.shift();
      // 去掉紧跟的空行
      while (lines.length && !lines[0].trim()) lines.shift();
      return lines.join("\n");
    }
  }
  return mdText;
}

// ========== 404 ==========

export async function notFoundPage(env: Env): Promise<Response> {
  const state = await resolveSiteState(env);
  return html(
    layout(state, {
      title: "404",
      body: `<section class="glass panel error-page"><h1 class="error-code">404</h1><p class="error-text">页面不存在</p><a class="btn primary" href="/">返回首页</a></section>`,
    }),
    { status: 404 }
  );
}

// ========== 首页（介绍页） ==========

export async function handleHome(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });

  const state = await resolveSiteState(env);
  const homeConfig = await getHomeConfig(env);
  let recentPosts: PostListRow[] = [];
  try { recentPosts = await listPosts(env, 3); } catch { recentPosts = []; }

  const recentSection = recentPosts.length
    ? `<section class="home-section">
  <div class="home-section-head">
    <h2 class="home-section-title">📰 最新文章</h2>
    <a class="home-section-more" href="/posts">查看全部 →</a>
  </div>
  <div class="recent-list">
    ${recentPosts.map((p) => {
      const tags = parseTags(p.tags_json);
      return `<a class="recent-item" href="/posts/${encodeURIComponent(p.slug)}">
        <div class="recent-item-head">
          <time class="recent-item-date">${esc(formatDate(p.created_at))}</time>
          ${tags.length ? `<span class="recent-item-tag">#${esc(tags[0])}</span>` : ""}
        </div>
        <h3 class="recent-item-title">${esc(p.title)}</h3>
        <p class="recent-item-excerpt">${esc(p.excerpt || "")}</p>
      </a>`;
    }).join("")}
  </div>
</section>`
    : "";

  return html(
    layout(state, {
      title: "首页",
      description: state.siteConfig.blogDescription,
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: state.siteConfig.blogTitle,
        description: state.siteConfig.blogDescription,
        author: { "@type": "Person", name: state.siteConfig.authorName },
        url: getSiteOrigin(request, env),
      }),
      body: `<div class="home-intro">
  <!-- 介绍 Hero -->
  <section class="home-hero glass panel">
    <div class="home-hero-bg" aria-hidden="true"></div>
    <div class="home-hero-avatar">
      <img src="/assets/avatar.webp" alt="${esc(state.siteConfig.authorName)}" onerror="this.src='/assets/avatar.jpg'" />
    </div>
    <p class="home-hero-greeting">${esc(homeConfig.greeting)}</p>
    <h1 class="home-hero-headline">${esc(homeConfig.headline)}</h1>
    <p class="home-hero-bio">${esc(homeConfig.bio || state.siteConfig.profileBio)}</p>
    <div class="clock-display" id="heroClock">
      <span class="clock-digit" data-unit="h1">0</span><span class="clock-digit" data-unit="h2">0</span>
      <span class="clock-sep">:</span>
      <span class="clock-digit" data-unit="m1">0</span><span class="clock-digit" data-unit="m2">0</span>
      <span class="clock-sep">:</span>
      <span class="clock-digit" data-unit="s1">0</span><span class="clock-digit" data-unit="s2">0</span>
      <span class="clock-ms" id="clockMs">000</span>
    </div>
    <p class="clock-info" id="clockInfo"></p>
    <div class="home-hero-actions">
      <p class="clock-quote" id="clockQuote">每一秒都是新的开始 ✨</p>
    </div>
  </section>

  <!-- 项目卡片 -->
  <section class="home-section">
    <h2 class="home-section-title">🚀 正在折腾</h2>
    <div class="home-projects">
      ${homeConfig.projects.map((p) => `<a class="home-project-card" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
        <div class="home-project-icon">${esc(p.icon)}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
        <span class="home-project-arrow">↗</span>
      </a>`).join("")}
    </div>
  </section>

  ${recentSection}
</div>`,
    })
  );
}

// ========== 文章列表页 /posts ==========

export async function handlePostsList(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });

  const state = await resolveSiteState(env);
  let posts: PostListRow[] = [];
  try { posts = await listPosts(env, 100); } catch { posts = []; }

  const allTags = Array.from(new Set(posts.flatMap((p) => parseTags(p.tags_json))));

  const body = posts.length
    ? `<div class="posts-page">
  <div class="posts-toolbar glass panel">
    <div class="posts-search-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="postsSearch" placeholder="搜索标题、摘要或标签..." />
    </div>
    ${allTags.length ? `<div class="posts-tag-filters">
      <button class="tag-chip is-active" data-tag="">全部</button>
      ${allTags.map((t) => `<button class="tag-chip" data-tag="${esc(t.toLowerCase())}">#${esc(t)}</button>`).join("")}
    </div>` : ""}
  </div>

  <section class="posts-grid">
${posts.map((post) => {
  const tags = parseTags(post.tags_json);
  const tagsAttr = tags.join(",").toLowerCase();
  const tagHtml = tags.length > 0
    ? `<div class="card-tags">${tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join("")}</div>`
    : "";
  const cover = post.cover_url
    ? `<div class="card-cover"><img src="${esc(post.cover_url)}" alt="${esc(post.title)}" loading="lazy"></div>`
    : "";

  return `<article class="post-card glass panel${post.cover_url ? " has-cover" : ""}"
  data-title="${esc(post.title.toLowerCase())}"
  data-excerpt="${esc((post.excerpt || "").toLowerCase())}"
  data-tags="${esc(tagsAttr)}">
  ${cover}
  <div class="card-body">
    <div class="card-meta">
      <time datetime="${esc(new Date(post.created_at).toISOString())}">${esc(formatDate(post.created_at))}</time>
      ${tagHtml}
    </div>
    <h2 class="card-title"><a href="/posts/${encodeURIComponent(post.slug)}">${esc(post.title)}</a></h2>
    <p class="card-excerpt">${esc(post.excerpt || "")}</p>
    <a class="card-link" href="/posts/${encodeURIComponent(post.slug)}">阅读全文 →</a>
  </div>
</article>`;
}).join("\n")}
  </section>

  <div class="posts-empty-result" id="postsEmpty" hidden>
    <div class="empty-icon">🔍</div>
    <p>没有匹配的文章</p>
  </div>
</div>`
    : `<section class="empty-state glass panel">
  <div class="empty-icon">✍️</div>
  <h2 class="empty-title">还没有文章</h2>
  <p class="empty-desc">发布第一篇文章后，这里会展示文章列表。</p>
  <a class="btn primary" href="/admin">进入后台</a>
</section>`;

  return html(
    layout(state, {
      title: "文章",
      description: "全部博客文章",
      body,
    })
  );
}

// ========== 文章详情 ==========

export async function handlePost(request: Request, env: Env, slug: string): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  if (!slug) return notFoundPage(env);

  const state = await resolveSiteState(env);
  let post: PostRow | null = null;
  try { post = await getPostBySlug(env, slug); } catch (e) {
    return html(layout(state, { title: "错误", body: `<section class="glass panel"><h1>DB Error</h1><pre>${esc(String(e))}</pre></section>` }), { status: 500 });
  }
  if (!post) return notFoundPage(env);

  const tags = parseTags(post.tags_json);
  const tagHtml = tags.length ? tags.map((t) => `<a class="tag" href="/?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(" ") : "";
  const contentHtml = md.render(stripLeadingH1(post.content_md || "", post.title));
  const words = stripHtml(contentHtml).trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.floor(words / 300) + 1);
  const postUrl = getSiteOrigin(request, env) + "/posts/" + encodeURIComponent(post.slug);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || "",
    datePublished: new Date(post.created_at).toISOString(),
    dateModified: new Date(post.updated_at).toISOString(),
    author: { "@type": "Person", name: state.siteConfig.authorName },
    url: postUrl,
    ...(post.cover_url ? { image: post.cover_url } : {}),
    keywords: tags.join(", "),
  });

  const commentsBlock = `<section class="comments" aria-label="评论">
    <h2 class="comments-title">评论</h2>
    <form id="commentForm" class="comment-form" data-slug="${esc(post.slug)}">
      <div class="comment-form-row">
        <input id="commentName" type="text" maxlength="40" placeholder="你的昵称" required />
      </div>
      <textarea id="commentContent" rows="3" maxlength="2000" placeholder="说点什么..." required></textarea>
      <div class="comment-form-actions">
        <span class="comment-tip">支持纯文本，最多 2000 字</span>
        <button type="submit" class="btn primary">发布评论</button>
      </div>
      <p id="commentStatus" class="comment-status"></p>
    </form>
    <div class="comment-list" id="commentList">
      <div class="comment-loading">加载评论中...</div>
    </div>
  </section>`;

  return html(
    layout(state, {
      title: post.title,
      description: stripHtml(post.excerpt || ""),
      canonicalPath: postUrl,
      ogImage: post.cover_url || undefined,
      ogType: "article",
      jsonLd,
      extraHead: `<script src="/assets/js/comments.js" defer></script>`,
      body: `<div class="post-layout">
  <article class="post glass panel" id="article-content">
    <header class="post-header">
      <div class="post-meta">
        <time datetime="${esc(new Date(post.created_at).toISOString())}">${esc(formatDate(post.created_at))}</time>
        <span class="meta-sep">·</span>
        <span>${readingTime} 分钟阅读</span>
      </div>
      <h1 class="post-title">${esc(post.title)}</h1>
      ${tagHtml ? `<div class="post-tags">${tagHtml}</div>` : ""}
    </header>
    <div class="prose">${contentHtml}</div>
    ${commentsBlock}
    <footer class="post-footer"><a class="btn ghost" href="/">← 返回列表</a></footer>
  </article>
  <aside class="toc-sidebar" id="toc">
    <nav class="toc-nav" aria-label="文章目录">
      <h3 class="toc-title">目录</h3>
      <ul class="toc-list" id="toc-list"></ul>
    </nav>
  </aside>
</div>`,
    })
  );
}

// ========== 关于页 ==========

export async function handleAbout(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const state = await resolveSiteState(env);

  const socialLinks = [
    state.siteConfig.githubUrl ? `<a class="about-social-btn" href="${esc(state.siteConfig.githubUrl)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> GitHub</a>` : "",
    state.siteConfig.email ? `<a class="about-social-btn" href="mailto:${esc(state.siteConfig.email)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> 邮件</a>` : "",
    ...state.siteConfig.socialLinks.map((item) => `<a class="about-social-btn" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.name)}</a>`),
  ].filter(Boolean).join("");

  return html(
    layout(state, {
      title: "关于",
      description: state.siteConfig.profileBio,
      body: `<div class="about-page">
  <!-- Hero 名片区 -->
  <section class="about-hero glass panel">
    <div class="about-hero-bg" aria-hidden="true"></div>
    <div class="about-avatar-wrap">
      <img class="about-avatar" src="/assets/avatar.webp" alt="${esc(state.siteConfig.authorName)}" onerror="this.src='/assets/avatar.jpg'" />
    </div>
    <h1 class="about-name">${esc(state.siteConfig.authorName)}</h1>
    ${state.siteConfig.slogan ? `<p class="about-slogan">${esc(state.siteConfig.slogan)}</p>` : ""}
    <div class="about-social">${socialLinks}</div>
    <div class="about-stats">
      <div class="about-stat">
        <span class="about-stat-value">17+</span>
        <span class="about-stat-label">工作流</span>
      </div>
      <div class="about-stat">
        <span class="about-stat-value">40+</span>
        <span class="about-stat-label">技能模块</span>
      </div>
      <div class="about-stat">
        <span class="about-stat-value">全栈</span>
        <span class="about-stat-label">开发能力</span>
      </div>
    </div>
  </section>

  <!-- 关于我 -->
  <section class="about-section glass panel">
    <h2 class="section-title">👋 关于我</h2>
    <div class="about-bio">${esc(state.siteConfig.profileBio)}</div>
  </section>

  <!-- 技能 -->
  <section class="about-section glass panel">
    <h2 class="section-title">🛠 技术栈</h2>
    <div class="skill-grid">
      <div class="skill-group">
        <h3 class="skill-group-title">前端</h3>
        <div class="skill-tags">
          <span class="skill-tag">HTML / CSS / JavaScript</span>
          <span class="skill-tag">React</span>
          <span class="skill-tag">TypeScript</span>
          <span class="skill-tag">Tailwind CSS</span>
        </div>
      </div>
      <div class="skill-group">
        <h3 class="skill-group-title">后端 & 运行时</h3>
        <div class="skill-tags">
          <span class="skill-tag">Node.js</span>
          <span class="skill-tag">Python</span>
          <span class="skill-tag">Cloudflare Workers</span>
          <span class="skill-tag">Java</span>
        </div>
      </div>
      <div class="skill-group">
        <h3 class="skill-group-title">安全 & 逆向</h3>
        <div class="skill-tags">
          <span class="skill-tag">渗透测试</span>
          <span class="skill-tag">逆向工程</span>
          <span class="skill-tag">CTF</span>
          <span class="skill-tag">Web 安全</span>
        </div>
      </div>
      <div class="skill-group">
        <h3 class="skill-group-title">DevOps & 工具</h3>
        <div class="skill-tags">
          <span class="skill-tag">Docker</span>
          <span class="skill-tag">Git</span>
          <span class="skill-tag">Linux</span>
          <span class="skill-tag">CI/CD</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 项目 -->
  <section class="about-section glass panel">
    <h2 class="section-title">🚀 开源项目</h2>
    <div class="project-grid">
      <a class="project-card" href="https://github.com/zhaoxuya520/cf-workers-blog1" target="_blank" rel="noopener noreferrer">
        <div class="project-icon">🌐</div>
        <div class="project-info">
          <h3 class="project-name">CF Workers Blog</h3>
          <p class="project-desc">基于 Cloudflare Workers + D1 的动态博客系统，SSR 渲染、玻璃拟态 UI、后台管理面板。</p>
          <div class="project-tech">
            <span>TypeScript</span><span>Workers</span><span>D1</span>
          </div>
        </div>
      </a>
      <a class="project-card" href="https://github.com/zhaoxuya520" target="_blank" rel="noopener noreferrer">
        <div class="project-icon">🤖</div>
        <div class="project-info">
          <h3 class="project-name">AI Full-stack Delivery Workflow</h3>
          <p class="project-desc">面向完整软件交付的 AI 集合工作流总控系统。17 个技术岗位工作流、100+ 技能模块，覆盖从产品设计到部署运维的全链路。</p>
          <div class="project-tech">
            <span>AI Workflow</span><span>17 Roles</span><span>Full-stack</span>
          </div>
        </div>
      </a>
      <a class="project-card" href="https://github.com/zhaoxuya520" target="_blank" rel="noopener noreferrer">
        <div class="project-icon">🔓</div>
        <div class="project-info">
          <h3 class="project-name">Reverse & Pentest Workflow</h3>
          <p class="project-desc">逆向工程与渗透测试工作流。内置 14 个技能模块 + 40 余个 CTF 子技能，从信息收集到漏洞利用的完整方法论。</p>
          <div class="project-tech">
            <span>Security</span><span>Reverse</span><span>CTF 40+</span>
          </div>
        </div>
      </a>
    </div>
  </section>

  <!-- 时间线 -->
  <section class="about-section glass panel">
    <h2 class="section-title">📅 经历</h2>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-date">2025 - 至今</span>
          <h3 class="timeline-title">全栈工程师 & 安全研究员</h3>
          <p class="timeline-desc">独立开发与维护多个开源项目，专注 AI 工作流系统设计与 Web 安全研究。</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-date">持续学习</span>
          <h3 class="timeline-title">技术探索者</h3>
          <p class="timeline-desc">热衷于前沿技术研究，包括 AI 大模型应用、Cloudflare 生态和安全攻防。</p>
        </div>
      </div>
    </div>
  </section>
</div>`,
    })
  );
}

// ========== AI工具页 ==========

export async function handleAi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  const state = await resolveSiteState(env);

  const toolsHtml = state.aiTools.length
    ? state.aiTools.map((tool) => {
        const fallback = esc(tool.name.slice(0, 2).toUpperCase());
        const image = tool.imageUrl
          ? `<img class="tool-icon" src="${esc(tool.imageUrl)}" alt="" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-img');" />`
          : "";
        return `<a class="tool-card glass" href="${esc(tool.url)}" target="_blank" rel="noopener noreferrer">
    <span class="tool-icon-wrap${tool.imageUrl ? "" : " no-img"}" aria-hidden="true">
      ${image}<span class="tool-fallback">${fallback}</span>
    </span>
    <div class="tool-body">
      <div class="tool-title">${esc(tool.name)}</div>
      <div class="tool-desc">${esc(tool.description)}</div>
      <div class="tool-meta">${esc(new URL(tool.url).host)}</div>
    </div>
  </a>`;
      }).join("\n")
    : `<div class="empty-state"><p>暂无 AI 工具，可在后台管理中添加。</p></div>`;

  return html(
    layout(state, {
      title: "AI工具",
      description: "AI 工具导航",
      body: `<header class="page-header">
  <h1 class="page-title">AI 工具导航</h1>
  <p class="page-desc">常用大模型入口与简单介绍，点击卡片直达。</p>
</header>
<section class="tool-grid">${toolsHtml}</section>`,
    })
  );
}

// ========== RSS ==========

export async function handleRss(request: Request, env: Env): Promise<Response> {
  const state = await resolveSiteState(env);
  const origin = getSiteOrigin(request, env);
  const posts = await listPostsForFeed(env, 20);
  const updatedAt = posts[0]?.updated_at || Date.now();
  const items = posts.map((post) => {
    const url = `${origin}/posts/${encodeURIComponent(post.slug)}`;
    const content = md.render(post.content_md || "");
    return `<item><title>${xmlEscape(post.title)}</title><link>${xmlEscape(url)}</link><guid>${xmlEscape(url)}</guid><pubDate>${new Date(post.created_at).toUTCString()}</pubDate><description>${xmlEscape(post.excerpt || "")}</description><content:encoded><![CDATA[${content}]]></content:encoded></item>`;
  }).join("\n");

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>${xmlEscape(state.siteConfig.blogTitle)}</title><link>${xmlEscape(origin)}</link><description>${xmlEscape(state.siteConfig.blogDescription)}</description><lastBuildDate>${new Date(updatedAt).toUTCString()}</lastBuildDate>
${items}
</channel></rss>`);
}

// ========== Atom ==========

export async function handleAtom(request: Request, env: Env): Promise<Response> {
  const state = await resolveSiteState(env);
  const origin = getSiteOrigin(request, env);
  const posts = await listPostsForFeed(env, 20);
  const updatedAt = new Date(posts[0]?.updated_at || Date.now()).toISOString();
  const entries = posts.map((post) => {
    const url = `${origin}/posts/${encodeURIComponent(post.slug)}`;
    const content = md.render(post.content_md || "");
    return `<entry><title>${xmlEscape(post.title)}</title><id>${xmlEscape(url)}</id><link href="${xmlEscape(url)}" /><updated>${new Date(post.updated_at).toISOString()}</updated><published>${new Date(post.created_at).toISOString()}</published><summary>${xmlEscape(post.excerpt || "")}</summary><content type="html"><![CDATA[${content}]]></content></entry>`;
  }).join("\n");

  return xml(`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>${xmlEscape(state.siteConfig.blogTitle)}</title><id>${xmlEscape(origin)}</id><link href="${xmlEscape(origin)}/atom.xml" rel="self" /><link href="${xmlEscape(origin)}" /><updated>${updatedAt}</updated><subtitle>${xmlEscape(state.siteConfig.blogDescription)}</subtitle>
${entries}
</feed>`);
}

// ========== Sitemap ==========

export async function handleSitemap(request: Request, env: Env): Promise<Response> {
  const origin = getSiteOrigin(request, env);
  const posts = await listPostsForFeed(env, 200);
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/about", priority: "0.8", changefreq: "monthly" },
    { loc: "/ai", priority: "0.7", changefreq: "weekly" },
  ];
  const urls = staticPages
    .map((p) => `<url><loc>${xmlEscape(origin + p.loc)}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`)
    .concat(posts.map((post) => `<url><loc>${xmlEscape(origin + "/posts/" + encodeURIComponent(post.slug))}</loc><lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`))
    .join("\n");

  return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
}
