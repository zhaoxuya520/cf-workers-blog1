// Admin HTML pages served directly by the Worker (NOT from static assets)
// This prevents Cloudflare's edge from auto-serving them before auth check.

const THEME_INIT = `(function(){var k="neonlab.theme";try{var s=localStorage.getItem(k);if(s==="light"||s==="dark")document.documentElement.dataset.theme=s;else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)document.documentElement.dataset.theme="light";else document.documentElement.dataset.theme="dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export const ADMIN_LOGIN_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark light"/>
<title>后台登录</title>
<script>${THEME_INIT}</script>
<link rel="stylesheet" href="/assets/css/style.min.css?v=20260520"/>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
</head>
<body>
<canvas id="stars-canvas" aria-hidden="true"></canvas>
<div class="cursor-glow" aria-hidden="true"></div>
<div class="bg" aria-hidden="true"></div>
<main class="container content admin-login-shell">
<section class="admin-login-layout">
<article class="glass panel admin-login-story">
<p class="badge">控制�?/p>
<h1 class="admin-login-title">回到我的后台</h1>
<p class="lead">管内容、管页面、管导航。一切由你决定�?/p>
<div class="admin-login-glow"></div>
<div class="admin-login-metrics">
<div class="admin-login-metric"><span class="admin-login-metric-value">📝 文章管理</span><span class="admin-login-metric-label">创建、编辑、删除文�?/span></div>
<div class="admin-login-metric"><span class="admin-login-metric-value">🧭 导航配置</span><span class="admin-login-metric-label">自定义前台导航入�?/span></div>
<div class="admin-login-metric"><span class="admin-login-metric-value">🤖 AI工具</span><span class="admin-login-metric-label">管理AI工具卡片</span></div>
<div class="admin-login-metric"><span class="admin-login-metric-value">👤 个人资料</span><span class="admin-login-metric-label">设置作者信息与社交链接</span></div>
</div>
</article>
<article class="glass panel admin-login-card">
<div class="admin-login-card-head"><p class="badge">身份验证</p><h2 class="admin-panel-title">登录</h2><p class="admin-panel-desc">验证身份后进入管理面板�?/p></div>
<form id="loginForm" class="admin-form admin-login-form">
<label class="admin-field"><span class="admin-label">用户�?/span><input id="loginUsername" type="text" autocomplete="username" placeholder="输入用户�? required/></label>
<label class="admin-field"><span class="admin-label">密码</span><input id="loginPassword" type="password" autocomplete="current-password" placeholder="输入密码" required/></label>
<button class="btn primary admin-login-submit" type="submit">登录</button>
</form>
<p id="loginStatus" class="admin-status"></p>
<div class="admin-login-footer"><a class="btn ghost" href="/">�?返回首页</a></div>
</article>
</section>
</main>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/admin-login.js" defer></script>
</body>
</html>`;

export const ADMIN_INDEX_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark light"/>
<title>博客后台</title>
<script>${THEME_INIT}</script>
<style>body{opacity:0;pointer-events:none}body.admin-ready{opacity:1;pointer-events:auto;transition:opacity .2s ease}</style>
<link rel="stylesheet" href="/assets/css/style.min.css?v=20260520"/>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
</head>
<body>
<canvas id="stars-canvas" aria-hidden="true"></canvas>
<div class="cursor-glow" aria-hidden="true"></div>
<div class="scroll-progress" aria-hidden="true"></div>
<div class="bg" aria-hidden="true"></div>
<main class="container content">
<header class="page-header" style="margin-bottom:8px">
<div class="admin-page-head"><div><p class="badge">Admin Console</p><h1 class="page-title">博客后台</h1><p class="page-desc">管理文章、导航、AI工具和个人资料�?/p></div>
<div class="admin-head-actions"><a class="btn ghost" href="/" target="_blank">查看前台</a><button id="refreshButton" class="btn ghost" type="button">🔄 刷新</button>
<button class="icon-btn" type="button" data-theme-toggle aria-label="切换主题" title="切换主题"><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
<button id="logoutButton" class="btn admin-danger" type="button">退�?/button></div></div>
</header>
<section class="glass panel admin-auth-panel"><p id="adminStatus" class="admin-status">正在加载后台数据...</p></section>
<div class="admin-posts-layout">
<nav class="admin-sidebar glass panel"><div id="pageNav" class="admin-post-list">
<button class="admin-post-item is-active" data-page-target="overview" type="button"><span class="admin-post-item-title">📊 概览</span><span class="admin-post-item-meta">站点状�?/span></button>
<button class="admin-post-item" data-page-target="posts" type="button"><span class="admin-post-item-title">📝 文章</span><span class="admin-post-item-meta">创建与编�?/span></button>
<button class="admin-post-item" data-page-target="nav" type="button"><span class="admin-post-item-title">🧭 导航</span><span class="admin-post-item-meta">前台入口</span></button>
<button class="admin-post-item" data-page-target="ai-tools" type="button"><span class="admin-post-item-title">🤖 AI工具</span><span class="admin-post-item-meta">卡片管理</span></button>
<button class="admin-post-item" data-page-target="profile" type="button"><span class="admin-post-item-title">👤 个人资料</span><span class="admin-post-item-meta">作者信�?/span></button>
<button class="admin-post-item" data-page-target="comments" type="button"><span class="admin-post-item-title">💬 评论</span><span class="admin-post-item-meta">审核管理</span></button>
<button class="admin-post-item" data-page-target="homepage" type="button"><span class="admin-post-item-title">🏠 首页</span><span class="admin-post-item-meta">文案与项�?/span></button>
<button class="admin-post-item" data-page-target="settings" type="button"><span class="admin-post-item-title">⚙️ 站点设置</span><span class="admin-post-item-meta">标题与简�?/span></button>
</div></nav>
<div id="adminPages">
<div class="admin-page admin-page--active" data-page="overview"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">站点概览</h2><p class="admin-panel-desc">当前博客的主要内容统计�?/p></div></div><div id="overviewStats" class="admin-nav-list"></div></section></div>
<div class="admin-page" data-page="posts"><section class="glass panel admin-panel admin-posts-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">文章管理</h2><p class="admin-panel-desc">新建、编辑、删除博客文章�?/p></div><button id="newPostButton" class="btn primary" type="button">+ 新建文章</button></div><div class="admin-posts-layout"><aside class="admin-posts-sidebar"><div id="postList" class="admin-post-list"></div></aside><section class="admin-post-editor"><form id="postForm" class="admin-form"><div class="admin-two-col"><label class="admin-field"><span class="admin-label">标题</span><input id="postTitle" type="text" maxlength="120" placeholder="文章标题"/></label><label class="admin-field"><span class="admin-label">Slug</span><input id="postSlug" type="text" maxlength="160" placeholder="自动生成"/></label></div><label class="admin-field"><span class="admin-label">摘要</span><textarea id="postExcerpt" rows="2" placeholder="可�?></textarea></label><div class="admin-two-col"><label class="admin-field"><span class="admin-label">标签（逗号分隔�?/span><input id="postTags" type="text" placeholder="前端, Workers"/></label><label class="admin-field"><span class="admin-label">封面�?URL</span><input id="postCoverUrl" type="url" placeholder="https://..."/></label></div><label class="admin-field"><span class="admin-label">Markdown 正文</span><textarea id="postContent" rows="16" placeholder="# 标题"></textarea></label><div class="admin-inline-actions"><button class="btn primary" type="submit">💾 保存</button><button id="previewPostButton" class="btn ghost" type="button">👁 预览</button><button id="deletePostButton" class="btn admin-danger" type="button" disabled>🗑 删除</button></div></form></section></div></section></div>
<div class="admin-page" data-page="nav"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">导航管理</h2><p class="admin-panel-desc">配置前台导航栏�?/p></div><button id="addNavButton" class="btn primary" type="button">+ 新增</button></div><div id="navList" class="admin-nav-list"></div></section></div>
<div class="admin-page" data-page="ai-tools"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">AI 工具管理</h2><p class="admin-panel-desc">管理 AI 工具页卡片�?/p></div><button id="addAiButton" class="btn primary" type="button">+ 新增</button></div><div id="aiList" class="admin-ai-list"></div></section></div>
<div class="admin-page" data-page="profile"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">个人资料</h2><p class="admin-panel-desc">修改作者信息�?/p></div><button id="addSocialLinkButton" class="btn ghost" type="button">+ 社交链接</button></div><form id="profileForm" class="admin-form"><div class="admin-two-col"><label class="admin-field"><span class="admin-label">作者名</span><input id="authorName" type="text" maxlength="80"/></label><label class="admin-field"><span class="admin-label">Slogan</span><input id="slogan" type="text" maxlength="120"/></label></div><div class="admin-two-col"><label class="admin-field"><span class="admin-label">GitHub</span><input id="githubUrl" type="url"/></label><label class="admin-field"><span class="admin-label">邮箱</span><input id="email" type="email"/></label></div><label class="admin-field"><span class="admin-label">个人简�?/span><textarea id="profileBio" rows="6"></textarea></label><div id="socialLinksList" class="admin-nav-list"></div><div class="admin-inline-actions"><button class="btn primary" type="submit">💾 保存</button></div></form></section></div>
<div class="admin-page" data-page="comments"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">评论管理</h2><p class="admin-panel-desc">查看和管理所有文章评论�?/p></div></div><div id="commentsList" class="admin-nav-list"></div></section></div>
<div class="admin-page" data-page="homepage"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">首页配置</h2><p class="admin-panel-desc">编辑首页展示的文案和项目卡片�?/p></div><button id="addHomeProject" class="btn ghost" type="button">+ 项目卡片</button></div><form id="homeConfigForm" class="admin-form"><div class="admin-two-col"><label class="admin-field"><span class="admin-label">Greeting（小字）</span><input id="homeGreeting" type="text" maxlength="80" placeholder="写代码、搞安全、瞎折腾"/></label><label class="admin-field"><span class="admin-label">Headline（大字）</span><input id="homeHeadline" type="text" maxlength="120" placeholder="记录一些有意思的东西�?/></label></div><label class="admin-field"><span class="admin-label">Bio（可选，留空用个人简介）</span><textarea id="homeBio" rows="2" maxlength="300"></textarea></label><div id="homeProjectsList" class="admin-nav-list"></div><div class="admin-inline-actions"><button class="btn primary" type="submit">💾 保存首页</button></div></form></section></div>
<div class="admin-page" data-page="settings"><section class="glass panel admin-panel"><div class="admin-panel-head"><div><h2 class="admin-panel-title">站点设置</h2><p class="admin-panel-desc">修改标题和简介�?/p></div></div><form id="siteConfigForm" class="admin-form"><label class="admin-field"><span class="admin-label">博客标题</span><input id="blogTitle" type="text" maxlength="120"/></label><label class="admin-field"><span class="admin-label">博客简�?/span><textarea id="blogDescription" rows="3"></textarea></label><div class="admin-inline-actions"><button class="btn primary" type="submit">💾 保存</button></div></form></section></div>
</div></div>
</main>
<button class="back-to-top" aria-label="返回顶部">�?/button>
<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/admin.js" defer></script>
</body>
</html>`;
