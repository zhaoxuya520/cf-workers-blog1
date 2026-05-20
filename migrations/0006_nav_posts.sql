-- 添加"文章"导航
INSERT OR IGNORE INTO nav_links (id, label, href, sort_order, open_in_new_tab, created_at, updated_at)
VALUES ('nav-posts', '文章', '/posts', 5, 0, unixepoch() * 1000, unixepoch() * 1000);
