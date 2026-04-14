(() => {
  const state = {
    posts: [],
    navLinks: [],
    aiTools: [],
    socialLinks: [],
    currentPage: "overview",
    originalSlug: "",
    slugEdited: false,
  };

  const els = {
    status: document.getElementById("adminStatus"),
    refreshButton: document.getElementById("refreshButton"),
    logoutButton: document.getElementById("logoutButton"),
    pageNav: document.getElementById("pageNav"),
    pages: Array.from(document.querySelectorAll(".admin-page")),
    overviewStats: document.getElementById("overviewStats"),
    siteConfigForm: document.getElementById("siteConfigForm"),
    blogTitle: document.getElementById("blogTitle"),
    blogDescription: document.getElementById("blogDescription"),
    profileForm: document.getElementById("profileForm"),
    authorName: document.getElementById("authorName"),
    slogan: document.getElementById("slogan"),
    githubUrl: document.getElementById("githubUrl"),
    email: document.getElementById("email"),
    profileBio: document.getElementById("profileBio"),
    socialLinksList: document.getElementById("socialLinksList"),
    addSocialLinkButton: document.getElementById("addSocialLinkButton"),
    addNavButton: document.getElementById("addNavButton"),
    navList: document.getElementById("navList"),
    addAiButton: document.getElementById("addAiButton"),
    aiList: document.getElementById("aiList"),
    postList: document.getElementById("postList"),
    newPostButton: document.getElementById("newPostButton"),
    postForm: document.getElementById("postForm"),
    postTitle: document.getElementById("postTitle"),
    postSlug: document.getElementById("postSlug"),
    postExcerpt: document.getElementById("postExcerpt"),
    postTags: document.getElementById("postTags"),
    postCoverUrl: document.getElementById("postCoverUrl"),
    postContent: document.getElementById("postContent"),
    previewPostButton: document.getElementById("previewPostButton"),
    deletePostButton: document.getElementById("deletePostButton"),
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function setStatus(message, kind = "info") {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.dataset.kind = kind;
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    let body = options.body;

    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      body,
      credentials: "same-origin",
    });

    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { ok: response.ok, raw };
    }

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/admin/login.html";
      }
      throw new Error(data.error || `请求失败（${response.status}）`);
    }

    return data;
  }

  async function verifySession() {
    const response = await fetch("/api/admin/session", {
      credentials: "same-origin",
    });
    if (!response.ok) {
      window.location.href = "/admin/login.html";
      return;
    }
    document.body.classList.add("admin-ready");
  }

  function switchPage(pageName) {
    state.currentPage = pageName;

    els.pages.forEach((page) => {
      page.classList.toggle("admin-page--active", page.dataset.page === pageName);
    });

    els.pageNav?.querySelectorAll(".admin-post-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.pageTarget === pageName);
    });
  }

  function renderOverview() {
    if (!els.overviewStats) return;
    const cards = [
      { title: "文章", value: `${state.posts.length} 篇`, desc: "已发布和草稿内容" },
      { title: "导航", value: `${state.navLinks.length} 项`, desc: "前台顶部入口" },
      { title: "AI工具", value: `${state.aiTools.length} 项`, desc: "AI 工具页卡片" },
      { title: "社交链接", value: `${state.socialLinks.length} 项`, desc: "作者对外展示链接" },
    ];

    els.overviewStats.innerHTML = cards
      .map(
        (card) => `<article class="admin-nav-item">
  <div class="admin-panel-head">
    <div>
      <h3 class="admin-panel-title">${escapeHtml(card.title)}</h3>
      <p class="admin-panel-desc">${escapeHtml(card.desc)}</p>
    </div>
    <strong class="admin-post-item-title">${escapeHtml(card.value)}</strong>
  </div>
</article>`
      )
      .join("");
  }

  function readSiteConfigForm() {
    return {
      blogTitle: els.blogTitle.value.trim(),
      blogDescription: els.blogDescription.value.trim(),
    };
  }

  function fillSiteConfigForm(config) {
    els.blogTitle.value = config.blogTitle || "";
    els.blogDescription.value = config.blogDescription || "";
  }

  function renderSocialLinks() {
    if (!els.socialLinksList) return;

    if (!state.socialLinks.length) {
      els.socialLinksList.innerHTML = `<div class="admin-empty">还没有社交链接，点上面的“新增社交链接”开始添加。</div>`;
      return;
    }

    els.socialLinksList.innerHTML = state.socialLinks
      .map(
        (item) => `<article class="admin-nav-item" data-id="${escapeHtml(item.id)}">
  <div class="admin-two-col">
    <label class="admin-field">
      <span class="admin-label">平台名</span>
      <input data-field="name" type="text" value="${escapeHtml(item.name)}" />
    </label>
    <label class="admin-field">
      <span class="admin-label">URL</span>
      <input data-field="url" type="url" value="${escapeHtml(item.url)}" />
    </label>
  </div>
  <div class="admin-inline-actions">
    <button class="btn admin-danger" data-action="delete-social" type="button">删除</button>
  </div>
</article>`
      )
      .join("");
  }

  function fillProfileForm(config) {
    els.authorName.value = config.authorName || "";
    els.slogan.value = config.slogan || "";
    els.githubUrl.value = config.githubUrl || "";
    els.email.value = config.email || "";
    els.profileBio.value = config.profileBio || "";
    state.socialLinks = Array.isArray(config.socialLinks) ? config.socialLinks.map((item) => ({ ...item })) : [];
    renderSocialLinks();
  }

  function readProfileForm() {
    const socialLinks = Array.from(els.socialLinksList?.querySelectorAll(".admin-nav-item") || []).map((item, index) => ({
      id: item.dataset.id || `social-${index}`,
      name: item.querySelector('[data-field="name"]').value.trim(),
      url: item.querySelector('[data-field="url"]').value.trim(),
    }));

    return {
      authorName: els.authorName.value.trim(),
      slogan: els.slogan.value.trim(),
      githubUrl: els.githubUrl.value.trim(),
      email: els.email.value.trim(),
      profileBio: els.profileBio.value.trim(),
      socialLinks,
    };
  }

  function addSocialLinkDraft() {
    state.socialLinks.push({
      id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      url: "",
    });
    renderSocialLinks();
  }

  function renderNavList() {
    if (!els.navList) return;

    if (!state.navLinks.length) {
      els.navList.innerHTML = `<div class="admin-empty">还没有导航链接，点上面的“新增导航”开始配置。</div>`;
      return;
    }

    els.navList.innerHTML = state.navLinks
      .map(
        (item) => `<article class="admin-nav-item" data-id="${escapeHtml(item.id)}">
  <div class="admin-two-col">
    <label class="admin-field">
      <span class="admin-label">标题</span>
      <input data-field="label" type="text" value="${escapeHtml(item.label)}" />
    </label>
    <label class="admin-field">
      <span class="admin-label">链接</span>
      <input data-field="href" type="text" value="${escapeHtml(item.href)}" />
    </label>
  </div>
  <div class="admin-nav-row">
    <label class="admin-field admin-field-small">
      <span class="admin-label">排序</span>
      <input data-field="sortOrder" type="number" value="${escapeHtml(item.sortOrder)}" />
    </label>
    <label class="admin-checkbox">
      <input data-field="openInNewTab" type="checkbox" ${item.openInNewTab ? "checked" : ""} />
      <span>新窗口打开</span>
    </label>
    <div class="admin-inline-actions">
      <button class="btn ghost" data-action="save-nav" type="button">保存</button>
      <button class="btn admin-danger" data-action="delete-nav" type="button">删除</button>
    </div>
  </div>
</article>`
      )
      .join("");
  }

  function readNavCard(card) {
    return {
      label: card.querySelector('[data-field="label"]').value.trim(),
      href: card.querySelector('[data-field="href"]').value.trim(),
      sortOrder: Number(card.querySelector('[data-field="sortOrder"]').value || 0),
      openInNewTab: !!card.querySelector('[data-field="openInNewTab"]').checked,
    };
  }

  function addNavDraft() {
    state.navLinks.push({
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: "",
      href: "/",
      sortOrder: state.navLinks.length * 10,
      openInNewTab: false,
    });
    renderNavList();
  }

  async function saveNav(card) {
    const id = card.dataset.id;
    const payload = readNavCard(card);
    const isDraft = id.startsWith("draft-");
    const data = isDraft
      ? await api("/api/admin/nav", { method: "POST", body: payload })
      : await api(`/api/admin/nav/${encodeURIComponent(id)}`, { method: "PUT", body: payload });

    state.navLinks = state.navLinks
      .filter((item) => item.id !== id)
      .concat(data.navLink)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    renderNavList();
    renderOverview();
    setStatus("导航已保存。", "success");
  }

  async function deleteNav(card) {
    const id = card.dataset.id;
    if (!confirm("确定删除这个导航吗？")) return;

    if (!id.startsWith("draft-")) {
      await api(`/api/admin/nav/${encodeURIComponent(id)}`, { method: "DELETE" });
    }

    state.navLinks = state.navLinks.filter((item) => item.id !== id);
    renderNavList();
    renderOverview();
    setStatus("导航已删除。", "success");
  }

  function renderAiList() {
    if (!els.aiList) return;

    if (!state.aiTools.length) {
      els.aiList.innerHTML = `<div class="admin-empty">还没有 AI 工具，点上面的“新增工具”开始配置。</div>`;
      return;
    }

    els.aiList.innerHTML = state.aiTools
      .map((item) => {
        const preview = item.imageUrl
          ? `<img src="${escapeHtml(item.imageUrl)}" alt="" style="width:32px;height:32px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,.12)">`
          : `<div class="tool-icon-wrap no-img" aria-hidden="true"><span class="tool-fallback">${escapeHtml(item.name.slice(0, 2).toUpperCase())}</span></div>`;

        return `<article class="admin-nav-item" data-id="${escapeHtml(item.id)}">
  <div class="admin-panel-head">
    <div class="admin-inline-actions">
      ${preview}
      <div>
        <h3 class="admin-panel-title">${escapeHtml(item.name)}</h3>
        <p class="admin-panel-desc">${escapeHtml(item.url)}</p>
      </div>
    </div>
  </div>
  <div class="admin-two-col">
    <label class="admin-field">
      <span class="admin-label">工具名</span>
      <input data-field="name" type="text" value="${escapeHtml(item.name)}" />
    </label>
    <label class="admin-field">
      <span class="admin-label">URL</span>
      <input data-field="url" type="url" value="${escapeHtml(item.url)}" />
    </label>
  </div>
  <div class="admin-two-col">
    <label class="admin-field">
      <span class="admin-label">图片 URL（选填）</span>
      <input data-field="imageUrl" type="url" value="${escapeHtml(item.imageUrl || "")}" />
    </label>
    <label class="admin-field admin-field-small">
      <span class="admin-label">排序</span>
      <input data-field="sortOrder" type="number" value="${escapeHtml(item.sortOrder)}" />
    </label>
  </div>
  <label class="admin-field">
    <span class="admin-label">描述（选填）</span>
    <textarea data-field="description" rows="3">${escapeHtml(item.description || "")}</textarea>
  </label>
  <div class="admin-inline-actions">
    <button class="btn ghost" data-action="save-ai" type="button">保存</button>
    <button class="btn admin-danger" data-action="delete-ai" type="button">删除</button>
  </div>
</article>`;
      })
      .join("");
  }

  function addAiDraft() {
    state.aiTools.push({
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      url: "",
      imageUrl: "",
      description: "",
      sortOrder: state.aiTools.length * 10,
    });
    renderAiList();
  }

  function readAiCard(card) {
    return {
      name: card.querySelector('[data-field="name"]').value.trim(),
      url: card.querySelector('[data-field="url"]').value.trim(),
      imageUrl: card.querySelector('[data-field="imageUrl"]').value.trim(),
      description: card.querySelector('[data-field="description"]').value.trim(),
      sortOrder: Number(card.querySelector('[data-field="sortOrder"]').value || 0),
    };
  }

  async function saveAi(card) {
    const id = card.dataset.id;
    const payload = readAiCard(card);
    const isDraft = id.startsWith("draft-");
    const data = isDraft
      ? await api("/api/admin/ai", { method: "POST", body: payload })
      : await api(`/api/admin/ai/${encodeURIComponent(id)}`, { method: "PUT", body: payload });

    state.aiTools = state.aiTools
      .filter((item) => item.id !== id)
      .concat(data.aiTool)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    renderAiList();
    renderOverview();
    setStatus("AI 工具已保存。", "success");
  }

  async function deleteAi(card) {
    const id = card.dataset.id;
    if (!confirm("确定删除这个 AI 工具吗？")) return;

    if (!id.startsWith("draft-")) {
      await api(`/api/admin/ai/${encodeURIComponent(id)}`, { method: "DELETE" });
    }

    state.aiTools = state.aiTools.filter((item) => item.id !== id);
    renderAiList();
    renderOverview();
    setStatus("AI 工具已删除。", "success");
  }

  function renderPostList() {
    if (!els.postList) return;

    if (!state.posts.length) {
      els.postList.innerHTML = `<div class="admin-empty">还没有文章，右上角可以直接新建。</div>`;
      return;
    }

    els.postList.innerHTML = state.posts
      .map(
        (post) => `<button class="admin-post-item${state.originalSlug === post.slug ? " is-active" : ""}" data-slug="${escapeHtml(post.slug)}" type="button">
  <span class="admin-post-item-title">${escapeHtml(post.title)}</span>
  <span class="admin-post-item-meta">${escapeHtml(post.slug)}</span>
</button>`
      )
      .join("");
  }

  function resetPostForm() {
    state.originalSlug = "";
    state.slugEdited = false;
    els.postTitle.value = "";
    els.postSlug.value = "";
    els.postExcerpt.value = "";
    els.postTags.value = "";
    els.postCoverUrl.value = "";
    els.postContent.value = "";
    els.deletePostButton.disabled = true;
    renderPostList();
  }

  async function loadPost(slug) {
    const data = await api(`/api/posts/${encodeURIComponent(slug)}`);
    const post = data.post;
    state.originalSlug = post.slug;
    state.slugEdited = true;
    els.postTitle.value = post.title || "";
    els.postSlug.value = post.slug || "";
    els.postExcerpt.value = post.excerpt || "";
    els.postTags.value = Array.isArray(post.tags) ? post.tags.join(", ") : "";
    els.postCoverUrl.value = post.coverUrl || "";
    els.postContent.value = post.contentMd || "";
    els.deletePostButton.disabled = false;
    renderPostList();
    switchPage("posts");
  }

  async function loadBootstrap(selectedSlug = "") {
    const data = await api("/api/admin/bootstrap");
    state.posts = Array.isArray(data.posts) ? data.posts : [];
    state.navLinks = Array.isArray(data.navLinks) ? data.navLinks : [];
    state.aiTools = Array.isArray(data.aiTools) ? data.aiTools : [];
    fillSiteConfigForm(data.siteConfig || {});
    fillProfileForm(data.siteConfig || {});
    renderNavList();
    renderAiList();
    renderPostList();
    renderOverview();

    const nextSlug = selectedSlug || state.originalSlug;
    if (nextSlug && state.posts.some((post) => post.slug === nextSlug)) {
      await loadPost(nextSlug);
    } else {
      resetPostForm();
    }

    setStatus("后台数据已同步。", "success");
  }

  async function savePost(event) {
    event.preventDefault();
    const payload = {
      title: els.postTitle.value.trim(),
      slug: els.postSlug.value.trim(),
      excerpt: els.postExcerpt.value.trim(),
      tags: els.postTags.value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      coverUrl: els.postCoverUrl.value.trim(),
      contentMd: els.postContent.value,
    };

    if (!payload.title || !payload.contentMd.trim()) {
      setStatus("标题和正文不能为空。", "error");
      return;
    }

    const data = state.originalSlug
      ? await api(`/api/posts/${encodeURIComponent(state.originalSlug)}`, { method: "PUT", body: payload })
      : await api("/api/posts", { method: "POST", body: payload });

    await loadBootstrap(data.slug || payload.slug || state.originalSlug);
    renderOverview();
    setStatus(state.originalSlug ? "文章已更新。" : "文章已创建。", "success");
  }

  async function deleteCurrentPost() {
    if (!state.originalSlug) return;
    if (!confirm("确定删除这篇文章吗？")) return;
    await api(`/api/posts/${encodeURIComponent(state.originalSlug)}`, { method: "DELETE" });
    await loadBootstrap();
    renderOverview();
    setStatus("文章已删除。", "success");
  }

  function previewCurrentPost() {
    const slug = els.postSlug.value.trim() || slugify(els.postTitle.value);
    if (!slug) {
      setStatus("请先填写标题或 slug。", "error");
      return;
    }
    window.open(`/posts/${encodeURIComponent(slug)}`, "_blank", "noopener");
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login.html";
  }

  function bindEvents() {
    els.pageNav?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page-target]");
      if (!button) return;
      switchPage(button.dataset.pageTarget);
    });

    els.refreshButton?.addEventListener("click", async () => {
      try {
        await loadBootstrap();
      } catch (error) {
        setStatus(error.message || "刷新失败。", "error");
      }
    });

    els.logoutButton?.addEventListener("click", async () => {
      try {
        await logout();
      } catch (error) {
        setStatus(error.message || "退出登录失败。", "error");
      }
    });

    els.siteConfigForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await api("/api/admin/site-config", { method: "PUT", body: readSiteConfigForm() });
        fillSiteConfigForm(data.siteConfig || {});
        setStatus("站点设置已保存。", "success");
      } catch (error) {
        setStatus(error.message || "保存站点设置失败。", "error");
      }
    });

    els.profileForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await api("/api/admin/profile", { method: "PUT", body: readProfileForm() });
        fillProfileForm(data.profile || {});
        renderOverview();
        setStatus("个人资料已保存。", "success");
      } catch (error) {
        setStatus(error.message || "保存个人资料失败。", "error");
      }
    });

    els.addSocialLinkButton?.addEventListener("click", addSocialLinkDraft);
    els.socialLinksList?.addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="delete-social"]');
      if (!button) return;
      const card = button.closest(".admin-nav-item");
      if (!card) return;
      state.socialLinks = state.socialLinks.filter((item) => item.id !== card.dataset.id);
      renderSocialLinks();
    });

    els.addNavButton?.addEventListener("click", () => {
      addNavDraft();
      switchPage("nav");
    });

    els.navList?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const card = button.closest(".admin-nav-item");
      if (!card) return;
      try {
        if (button.dataset.action === "save-nav") await saveNav(card);
        if (button.dataset.action === "delete-nav") await deleteNav(card);
      } catch (error) {
        setStatus(error.message || "导航操作失败。", "error");
      }
    });

    els.addAiButton?.addEventListener("click", () => {
      addAiDraft();
      switchPage("ai-tools");
    });

    els.aiList?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const card = button.closest(".admin-nav-item");
      if (!card) return;
      try {
        if (button.dataset.action === "save-ai") await saveAi(card);
        if (button.dataset.action === "delete-ai") await deleteAi(card);
      } catch (error) {
        setStatus(error.message || "AI 工具操作失败。", "error");
      }
    });

    els.newPostButton?.addEventListener("click", () => {
      resetPostForm();
      switchPage("posts");
    });

    els.postList?.addEventListener("click", async (event) => {
      const button = event.target.closest(".admin-post-item");
      if (!button) return;
      try {
        await loadPost(button.dataset.slug);
      } catch (error) {
        setStatus(error.message || "加载文章失败。", "error");
      }
    });

    els.postTitle?.addEventListener("input", () => {
      if (!state.originalSlug && !state.slugEdited) {
        els.postSlug.value = slugify(els.postTitle.value);
      }
    });

    els.postSlug?.addEventListener("input", () => {
      state.slugEdited = true;
    });

    els.postForm?.addEventListener("submit", async (event) => {
      try {
        await savePost(event);
      } catch (error) {
        setStatus(error.message || "保存文章失败。", "error");
      }
    });

    els.deletePostButton?.addEventListener("click", async () => {
      try {
        await deleteCurrentPost();
      } catch (error) {
        setStatus(error.message || "删除文章失败。", "error");
      }
    });

    els.previewPostButton?.addEventListener("click", previewCurrentPost);
  }

  async function bootstrap() {
    await verifySession();
    await loadBootstrap();
    switchPage(state.currentPage);
  }

  bindEvents();
  bootstrap().catch((error) => {
    document.body.classList.add("admin-ready");
    setStatus(error.message || "加载后台失败。", "error");
  });
})();
