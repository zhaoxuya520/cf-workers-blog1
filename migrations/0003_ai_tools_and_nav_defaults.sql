CREATE TABLE IF NOT EXISTS ai_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_sort_order ON ai_tools(sort_order ASC, created_at ASC);

INSERT OR IGNORE INTO nav_links (id, label, href, sort_order, open_in_new_tab, created_at, updated_at)
VALUES
  ('nav-mail', '域名邮箱', 'https://mail.linuxai.de', 30, 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO ai_tools (id, name, url, image_url, description, sort_order, created_at, updated_at)
VALUES
  ('ai-deepseek', 'DeepSeek', 'https://chat.deepseek.com/', 'https://chat.deepseek.com/favicon.ico', '推理与代码能力强，适合做分析、总结与编程辅助。', 10, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-chatgpt', 'ChatGPT', 'https://chatgpt.com/', 'https://chatgpt.com/favicon.ico', '通用对话与写作/代码助手，多场景综合表现稳定。', 20, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-claude', 'Claude', 'https://claude.ai/', 'https://claude.ai/favicon.ico', '长文本理解与写作很强，适合整理文档与方案输出。', 30, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-gemini', 'Gemini', 'https://gemini.google.com/', 'https://gemini.google.com/favicon.ico', 'Google 系列模型入口，适合多模态与日常信息处理。', 40, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-ai-studio', 'Google AI Studio', 'https://aistudio.google.com/', 'https://aistudio.google.com/favicon.ico', '官方开发/调试入口，强调可免费试用 Gemini 3 Pro（按官方额度/政策为准）。', 50, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-grok', 'Grok', 'https://grok.com/', 'https://grok.com/favicon.ico', 'xAI 的对话模型入口，偏实时问答与内容探索。', 60, unixepoch() * 1000, unixepoch() * 1000),
  ('ai-linuxdo', 'LinuxDo', 'https://linux.do/', 'https://linux.do/favicon.ico', '国内最大的 AI 工具社区，讨论工具、提示词、工作流与应用落地。', 70, unixepoch() * 1000, unixepoch() * 1000);
