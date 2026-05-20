(() => {
  const form = document.getElementById("commentForm");
  const list = document.getElementById("commentList");
  const status = document.getElementById("commentStatus");
  if (!form || !list) return;

  const slug = form.dataset.slug;
  if (!slug) return;

  const NAME_KEY = "blog.comment.name";

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function timeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + " 天前";
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function formatContent(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
  }

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    const colors = [
      "linear-gradient(135deg,#06d6a0,#118ab2)",
      "linear-gradient(135deg,#ef476f,#ffd166)",
      "linear-gradient(135deg,#118ab2,#073b4c)",
      "linear-gradient(135deg,#ffd166,#ef476f)",
      "linear-gradient(135deg,#06d6a0,#073b4c)",
      "linear-gradient(135deg,#7e57c2,#118ab2)",
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  function renderComment(c) {
    const initial = (c.authorName || "?").charAt(0).toUpperCase();
    return `<article class="comment-item">
      <div class="comment-avatar" style="background:${avatarColor(c.authorName)}">${escapeHtml(initial)}</div>
      <div class="comment-body">
        <div class="comment-head">
          <span class="comment-author">${escapeHtml(c.authorName)}</span>
          <span class="comment-time">${escapeHtml(timeAgo(c.createdAt))}</span>
        </div>
        <div class="comment-content">${formatContent(c.content)}</div>
      </div>
    </article>`;
  }

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg || "";
    status.dataset.kind = kind || "";
  }

  async function loadComments() {
    try {
      const r = await fetch(`/api/comments/${encodeURIComponent(slug)}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "加载失败");
      const comments = data.comments || [];
      if (!comments.length) {
        list.innerHTML = `<div class="comment-empty">还没有评论，来抢沙发 🛋️</div>`;
        return;
      }
      list.innerHTML = `<div class="comment-count">${comments.length} 条评论</div>` + comments.map(renderComment).join("");
    } catch (e) {
      list.innerHTML = `<div class="comment-empty">加载评论失败：${escapeHtml(e.message)}</div>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById("commentName");
    const contentEl = document.getElementById("commentContent");
    const name = nameEl.value.trim();
    const content = contentEl.value.trim();

    if (!name) { setStatus("请填写昵称", "error"); return; }
    if (!content) { setStatus("请填写评论内容", "error"); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus("发送中...", "info");

    try {
      const r = await fetch(`/api/comments/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, content }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "发送失败");

      try { localStorage.setItem(NAME_KEY, name); } catch {}
      contentEl.value = "";
      setStatus("评论已发布 ✓", "success");
      await loadComments();
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      setStatus(e.message || "发送失败", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // 恢复昵称
  try {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) document.getElementById("commentName").value = saved;
  } catch {}

  loadComments();
})();
