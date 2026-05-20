-- 原生评论系统
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
