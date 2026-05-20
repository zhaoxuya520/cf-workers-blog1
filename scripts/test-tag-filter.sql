INSERT OR REPLACE INTO posts (id, slug, title, excerpt, tags_json, cover_url, content_md, created_at, updated_at)
VALUES (
  'p_test_tag_001',
  'cloudflare-workers-blog-dev',
  '用 Cloudflare Workers 搭建个人博客的踩坑记录',
  '从零开始用 Workers + D1 搭建动态博客系统的完整过程，含 SSR、玻璃拟态 UI、后台管理。',
  '["Cloudflare","Workers","前端","博客"]',
  '',
  '## 为什么选 Workers

轻量、边缘部署、免费额度够用。不需要服务器，不需要 Docker，代码推上去就跑。

## 技术栈

- **运行时**：Cloudflare Workers
- **数据库**：D1（SQLite at edge）
- **渲染**：SSR（服务端 Markdown → HTML）
- **样式**：手写 CSS，玻璃拟态风格
- **构建**：LightningCSS + PurgeCSS + Sharp

## 踩过的坑

1. D1 在 local 模式下的 `access violation` — 需要装最新 VC++ 运行库
2. Assets binding 会在 Worker 代码之前拦截请求 — admin 页面鉴权被绕过
3. PurgeCSS 会干掉 `[data-theme="light"]` 相关规则 — 需要 greedy safelist
4. Service Worker 缓存 admin HTML — 导致登录状态闪烁

## 总结

Workers 适合轻量级全栈应用。D1 还在 beta 但够用了。
',
  (unixepoch() - 7200) * 1000,
  unixepoch() * 1000
);
