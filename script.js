const demoPrompts = [
  {
    id: "demo-midnight-product",
    title: "Midnight Monolith Product Campaign",
    category: "Midjourney",
    creator: "Aarav Syntax",
    image: "/assets/img/1.jpg",
    prompt: "A black titanium smart fragrance bottle standing on a wet obsidian plinth, soft cream rim light, premium product photography, minimal cinematic atmosphere, shallow depth of field, ultra clean luxury campaign.",
    tags: ["product", "luxury", "campaign"],
    likes: 1284,
    liked: false,
    saved: false,
    trending: true
  },
  {
    id: "demo-glass-oracle",
    title: "Glass Oracle Fashion Portrait",
    category: "Flux",
    creator: "Mira Voss",
    image: "/assets/img/2.jpg",
    prompt: "High fashion portrait of an oracle wearing translucent glass armor, black studio void, soft white halo gradients, expensive editorial lighting, future couture, cinematic realism.",
    tags: ["portrait", "fashion", "glass"],
    likes: 974,
    liked: false,
    saved: false,
    trending: true
  },
  {
    id: "demo-brand-system",
    title: "Elite Brand Strategy System",
    category: "ChatGPT",
    creator: "Noor Atlas",
    image: "/assets/img/18.jpg",
    prompt: "Act as a senior brand strategist and creative director. Build a premium positioning system for a futuristic AI startup with audience psychology, visual language, offer ladder, and homepage messaging.",
    tags: ["strategy", "startup", "system"],
    likes: 846,
    liked: false,
    saved: false,
    trending: false
  },
  {
    id: "demo-vertical-city",
    title: "Rainlit Vertical City",
    category: "Stable Diffusion",
    creator: "Kenji Frame",
    image: "/assets/img/38.jpg",
    prompt: "A massive vertical city at night after rain, reflective black streets, white holographic signage, cinematic fog layers, futuristic minimal architecture, elegant cyberpunk realism.",
    tags: ["city", "cyberpunk", "rain"],
    likes: 1532,
    liked: false,
    saved: false,
    trending: true
  },
  {
    id: "demo-grok-saas",
    title: "Viral AI Tool Ideas",
    category: "Grok",
    creator: "Isha Vector",
    image: "/assets/img/39.jpg",
    prompt: "Generate 25 commercially realistic AI micro-SaaS ideas for solo builders. Include target user, pain, MVP, pricing angle, and viral demo hook.",
    tags: ["ideas", "saas", "builder"],
    likes: 621,
    liked: false,
    saved: false,
    trending: false
  },
  {
    id: "demo-luxury-interior",
    title: "Silent Luxury Interior",
    category: "Flux",
    creator: "Elena Darkroom",
    image: "/assets/img/40.jpg",
    prompt: "A silent luxury penthouse interior at blue hour, black stone, warm indirect light, sculptural furniture, futuristic skyline, museum-grade minimalism, editorial realism.",
    tags: ["interior", "luxury", "calm"],
    likes: 1198,
    liked: false,
    saved: false,
    trending: true
  }
];

function readStoredSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch (_error) {
    return new Set();
  }
}

function writeStoredSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch (_error) {
    // Non-critical: interaction state can degrade without persistence.
  }
}

const HYDROZEN = {
  supabase: null,
  session: null,
  prompts: [],
  category: "All",
  query: "",
  realtimeChannel: null,
  localSaved: readStoredSet("hydrozen:saved"),
  localLiked: readStoredSet("hydrozen:liked")
};

const uiSelectors = {
  loader: "#pageLoader",
  navbar: "#navbar",
  navToggle: "#navToggle",
  navMenu: ".nav-menu",
  search: "#searchInput",
  grid: "#promptGrid",
  resultCount: "#resultCount",
  totalPrompts: "#totalPrompts",
  savedCount: "#savedCount",
  resetFilters: "#resetFilters",
  syncStatus: "#syncStatus",
  googleLogin: "#googleLogin",
  logoutButton: "#logoutButton",
  userPill: "#userPill",
  modal: "#promptModal",
  uploadForm: "#uploadForm",
  formStatus: "#formStatus",
  submitButton: ".submit-button",
  imageUpload: "#imageUpload",
  imagePreview: "#imagePreview",
  uploadDrop: ".upload-drop",
  uploadDropText: "#uploadDropText",
  mobileSearch: "[data-mobile-search]",
  mobileAccount: "[data-mobile-account]"
};

function safeQuery(selector, root = document) {
  if (!selector || !root?.querySelector) return null;
  try {
    return root.querySelector(selector);
  } catch (_error) {
    return null;
  }
}

function safeQueryAll(selector, root = document) {
  if (!selector || !root?.querySelectorAll) return [];
  try {
    return [...root.querySelectorAll(selector)];
  } catch (_error) {
    return [];
  }
}

function safeBind(element, event, handler, options) {
  if (!element?.addEventListener || typeof handler !== "function") return false;
  element.addEventListener(event, (...args) => {
    try {
      const result = handler(...args);
      if (result?.catch) result.catch(error => console.error(`[HYDROZEN:${event}]`, error));
    } catch (error) {
      console.error(`[HYDROZEN:${event}]`, error);
    }
  }, options);
  return true;
}

function safeRun(label, task) {
  try {
    return task();
  } catch (error) {
    console.error(`[HYDROZEN:${label}]`, error);
    return null;
  }
}

async function safeRunAsync(label, task) {
  try {
    return await task();
  } catch (error) {
    console.error(`[HYDROZEN:${label}]`, error);
    return null;
  }
}

const ui = new Proxy({}, {
  get(_target, key) {
    return safeQuery(uiSelectors[key]);
  }
});

const $ = safeQuery;
const $$ = safeQueryAll;

function getSupabaseConfig() {
  const env = window.HYDROZEN_ENV || {};
  return {
    url: env.SUPABASE_URL || "",
    anonKey: env.SUPABASE_ANON_KEY || ""
  };
}

function waitForSupabaseClient(timeout = 2500) {
  if (window.supabase?.createClient) return Promise.resolve(true);

  return new Promise(resolve => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.supabase?.createClient) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - started >= timeout) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 80);
  });
}

async function initSupabase() {
  const config = getSupabaseConfig();
  const hasClient = await waitForSupabaseClient();

  if (!config.url || !config.anonKey || !hasClient) {
    setStatus("Demo mode", "Supabase env missing");
    return;
  }

  HYDROZEN.supabase = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: { eventsPerSecond: 8 }
    }
  });
  setStatus("Supabase", "Connected");
}

async function initAuth() {
  if (!HYDROZEN.supabase) {
    renderAuth();
    return;
  }

  const { data } = await HYDROZEN.supabase.auth.getSession();
  HYDROZEN.session = data.session;
  renderAuth();

  HYDROZEN.supabase.auth.onAuthStateChange((_event, session) => {
    HYDROZEN.session = session;
    renderAuth();
    return safeRunAsync("auth-change-prompts", loadPrompts);
  });
}

function renderAuth() {
  const user = HYDROZEN.session?.user;
  if (ui.googleLogin) ui.googleLogin.hidden = Boolean(user);
  if (ui.logoutButton) ui.logoutButton.hidden = !user;
  if (ui.userPill) {
    ui.userPill.hidden = !user;
    ui.userPill.textContent = user?.user_metadata?.full_name || user?.email || "";
  }
}

async function loginWithGoogle() {
  if (!HYDROZEN.supabase) {
    notify("Connect Supabase env vars first.", true);
    return;
  }

  const { error } = await HYDROZEN.supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) notify(error.message, true);
}

async function logout() {
  if (!HYDROZEN.supabase) return;
  await HYDROZEN.supabase.auth.signOut();
}

async function loadPrompts() {
  if (!HYDROZEN.prompts.length) {
    HYDROZEN.prompts = demoPrompts.map(prompt => ({
      ...prompt,
      saved: HYDROZEN.localSaved.has(prompt.id),
      liked: HYDROZEN.localLiked.has(prompt.id),
      likes: prompt.likes + (HYDROZEN.localLiked.has(prompt.id) ? 1 : 0)
    }));
    renderPrompts();
  }

  if (!HYDROZEN.supabase) {
    return;
  }

  try {
    const userId = HYDROZEN.session?.user?.id || null;
    const { data, error } = await HYDROZEN.supabase
      .from("prompts_with_counts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;

    let likedIds = new Set();
    let savedIds = new Set();

    if (userId) {
      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        HYDROZEN.supabase.from("prompt_likes").select("prompt_id").eq("user_id", userId),
        HYDROZEN.supabase.from("prompt_bookmarks").select("prompt_id").eq("user_id", userId)
      ]);
      likedIds = new Set((likes || []).map(item => item.prompt_id));
      savedIds = new Set((bookmarks || []).map(item => item.prompt_id));
    }

    HYDROZEN.prompts = (data || []).map(row => {
      const isLocallyLiked = !userId && HYDROZEN.localLiked.has(row.id);
      const likeCount = (row.like_count || 0) + (isLocallyLiked ? 1 : 0);

      return {
        id: row.id,
        title: row.title,
        category: row.category,
        creator: row.creator_name || "Hydrozen Creator",
        image: row.image_url || "/assets/img/18.jpg",
        prompt: row.prompt,
        tags: row.tags || [],
        likes: likeCount,
        liked: userId ? likedIds.has(row.id) : HYDROZEN.localLiked.has(row.id),
        saved: userId ? savedIds.has(row.id) : HYDROZEN.localSaved.has(row.id),
        trending: likeCount >= 10
      };
    });

    if (!HYDROZEN.prompts.length) HYDROZEN.prompts = [...demoPrompts];
    renderPrompts();
  } catch (error) {
    console.error(error);
    setStatus("Fallback", "Supabase read failed");
    HYDROZEN.prompts = [...demoPrompts];
    renderPrompts();
  }
}

function renderSkeleton() {
  const grid = ui.grid;
  if (grid) {
    grid.classList.add("skeleton-grid");
    grid.innerHTML = '<article class="skeleton-card"></article><article class="skeleton-card"></article><article class="skeleton-card"></article>';
  }
  if (ui.resultCount) ui.resultCount.textContent = "Loading prompts";
}

function filteredPrompts() {
  const query = HYDROZEN.query.toLowerCase();
  return HYDROZEN.prompts.filter(prompt => {
    const tags = Array.isArray(prompt.tags) ? prompt.tags.join(" ") : "";
    const haystack = `${prompt.title || ""} ${prompt.category || ""} ${prompt.creator || ""} ${prompt.prompt || ""} ${tags}`.toLowerCase();
    return (!query || haystack.includes(query)) && (HYDROZEN.category === "All" || prompt.category === HYDROZEN.category);
  });
}

function renderPrompts() {
  const grid = ui.grid;
  if (!grid) return;

  const prompts = filteredPrompts();
  grid.classList.remove("skeleton-grid");
  grid.innerHTML = "";
  if (ui.totalPrompts) ui.totalPrompts.textContent = HYDROZEN.prompts.length;
  if (ui.savedCount) ui.savedCount.textContent = HYDROZEN.prompts.filter(prompt => prompt.saved).length + HYDROZEN.localSaved.size;
  if (ui.resultCount) ui.resultCount.textContent = prompts.length === 1 ? "1 prompt found" : `${prompts.length} prompts found`;

  if (!prompts.length) {
    grid.innerHTML = '<div class="empty-state"><div><h3>No matching prompt found.</h3><p>Try another keyword or reset filters.</p></div></div>';
    return;
  }

  prompts.forEach(prompt => {
    const card = document.createElement("article");
    card.className = "prompt-card";
    card.tabIndex = 0;
    card.dataset.cardOpen = prompt.id;
    card.innerHTML = `
      <div class="card-media">
        <picture>
          <source srcset="${escapeHtml(toWebpHint(prompt.image))}" type="image/webp">
          <img src="${escapeHtml(prompt.image)}" alt="${escapeHtml(prompt.title)} preview" loading="lazy" decoding="async">
        </picture>
        ${prompt.trending ? '<span class="trending-badge">Trending</span>' : ""}
        <button class="save-button ${prompt.saved ? "is-saved" : ""}" type="button" data-save="${prompt.id}">${prompt.saved ? "Saved" : "Save"}</button>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="engine-chip">${escapeHtml(prompt.category)}</span>
          <button class="likes ${prompt.liked ? "is-liked" : ""}" type="button" data-like="${prompt.id}">${formatLikes(prompt.likes)} likes</button>
        </div>
        <h3>${escapeHtml(prompt.title)}</h3>
        <p class="creator">by ${escapeHtml(prompt.creator)}</p>
        <p class="prompt-preview">${escapeHtml(prompt.prompt)}</p>
        <div class="tag-list">${(Array.isArray(prompt.tags) ? prompt.tags : []).slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions">
          <button class="card-action" type="button" data-open="${prompt.id}">View Prompt</button>
          <button class="card-action" type="button" data-copy="${prompt.id}">Copy</button>
        </div>
      </div>
    `;
    safeBind(card, "keydown", event => {
      if (event.key === "Enter") openModal(prompt.id);
    });
    grid.append(card);
  });
}

async function uploadImage(file) {
  if (!file) return "/assets/img/44.jpg";
  if (!HYDROZEN.supabase || !HYDROZEN.session?.user) return readLocalImage(file);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${HYDROZEN.session.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await HYDROZEN.supabase.storage.from("prompt-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false
  });
  if (error) throw error;

  const { data } = HYDROZEN.supabase.storage.from("prompt-images").getPublicUrl(path);
  return data.publicUrl;
}

function readLocalImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function submitPrompt(event) {
  event.preventDefault();
  const formElement = ui.uploadForm;
  if (!formElement) return;

  setSubmitting(true);
  notify("Publishing prompt...");

  try {
    const form = new FormData(formElement);
    const file = ui.imageUpload?.files?.[0];
    const imageUrl = await uploadImage(file);
    const payload = {
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category") || "ChatGPT"),
      prompt: String(form.get("prompt") || "").trim(),
      tags: String(form.get("tags") || "").split(",").map(tag => tag.trim()).filter(Boolean),
      image_url: imageUrl
    };

    if (!payload.title || payload.prompt.length < 20) throw new Error("Add a title and a prompt with at least 20 characters.");

    if (HYDROZEN.supabase && HYDROZEN.session?.user) {
      const { error } = await HYDROZEN.supabase.from("prompts").insert(payload);
      if (error) throw error;
      notify("Prompt published to Supabase.");
    } else if (HYDROZEN.supabase && !HYDROZEN.session?.user) {
      throw new Error("Login with Google before publishing to Supabase.");
    } else {
      HYDROZEN.prompts.unshift({
        id: `local-${Date.now()}`,
        title: payload.title,
        category: payload.category,
        creator: "Local Creator",
        image: imageUrl,
        prompt: payload.prompt,
        tags: payload.tags,
        likes: 0,
        liked: false,
        saved: false,
        trending: false
      });
      notify("Saved locally in demo mode.");
      renderPrompts();
    }

    formElement.reset();
    resetImagePreview();
    await loadPrompts();
  } catch (error) {
    notify(error.message, true);
  } finally {
    setSubmitting(false);
  }
}

async function toggleLike(id) {
  const prompt = HYDROZEN.prompts.find(item => item.id === id);
  if (!prompt) return;

  if (!HYDROZEN.supabase || !HYDROZEN.session?.user || id.startsWith("demo")) {
    prompt.liked = !prompt.liked;
    prompt.likes += prompt.liked ? 1 : -1;
    prompt.liked ? HYDROZEN.localLiked.add(id) : HYDROZEN.localLiked.delete(id);
    writeStoredSet("hydrozen:liked", HYDROZEN.localLiked);
    renderPrompts();
    return;
  }

  try {
    if (prompt.liked) {
      await HYDROZEN.supabase.from("prompt_likes").delete().eq("prompt_id", id).eq("user_id", HYDROZEN.session.user.id);
    } else {
      await HYDROZEN.supabase.from("prompt_likes").insert({ prompt_id: id });
    }
    await loadPrompts();
  } catch (error) {
    notify(error.message, true);
  }
}

async function toggleSave(id) {
  const prompt = HYDROZEN.prompts.find(item => item.id === id);
  if (!prompt) return;

  if (!HYDROZEN.supabase || !HYDROZEN.session?.user || id.startsWith("demo")) {
    prompt.saved = !prompt.saved;
    prompt.saved ? HYDROZEN.localSaved.add(id) : HYDROZEN.localSaved.delete(id);
    writeStoredSet("hydrozen:saved", HYDROZEN.localSaved);
    renderPrompts();
    return;
  }

  try {
    if (prompt.saved) {
      await HYDROZEN.supabase.from("prompt_bookmarks").delete().eq("prompt_id", id).eq("user_id", HYDROZEN.session.user.id);
    } else {
      await HYDROZEN.supabase.from("prompt_bookmarks").insert({ prompt_id: id });
    }
    await loadPrompts();
  } catch (error) {
    notify(error.message, true);
  }
}

function subscribeRealtime() {
  if (!HYDROZEN.supabase) return;
  if (HYDROZEN.realtimeChannel) HYDROZEN.supabase.removeChannel(HYDROZEN.realtimeChannel);
  HYDROZEN.realtimeChannel = HYDROZEN.supabase
    .channel("hydrozen-prompts")
    .on("postgres_changes", { event: "*", schema: "public", table: "prompts" }, loadPrompts)
    .on("postgres_changes", { event: "*", schema: "public", table: "prompt_likes" }, loadPrompts)
    .on("postgres_changes", { event: "*", schema: "public", table: "prompt_bookmarks" }, loadPrompts)
    .subscribe();
}

function openModal(id) {
  const prompt = HYDROZEN.prompts.find(item => item.id === id);
  if (!prompt) return;
  const modal = ui.modal;
  if (!modal) return;

  HYDROZEN.activePrompt = prompt;
  const modalImage = $("#modalImage");
  if (modalImage) {
    modalImage.src = prompt.image;
    modalImage.alt = `${prompt.title} preview`;
  }
  if ($("#modalCategory")) $("#modalCategory").textContent = prompt.category;
  if ($("#modalLikes")) $("#modalLikes").textContent = `${formatLikes(prompt.likes)} likes`;
  if ($("#modalTitle")) $("#modalTitle").textContent = prompt.title;
  if ($("#modalCreator")) $("#modalCreator").textContent = `Created by ${prompt.creator}`;
  if ($("#modalPrompt")) $("#modalPrompt").textContent = prompt.prompt;
  if ($("#modalTags")) $("#modalTags").innerHTML = (Array.isArray(prompt.tags) ? prompt.tags : []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  modal.hidden = false;
  document.body?.classList.add("modal-open");
  $(".modal-close")?.focus();
}

function closeModal() {
  if (ui.modal) ui.modal.hidden = true;
  document.body?.classList.remove("modal-open");
}

async function copyPrompt(id, button) {
  const prompt = HYDROZEN.prompts.find(item => item.id === id) || HYDROZEN.activePrompt;
  if (!prompt) return;
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(prompt.prompt);
  if (!button) return;
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = original), 1200);
}

async function sharePrompt() {
  if (!HYDROZEN.activePrompt) return;
  const data = { title: HYDROZEN.activePrompt.title, text: HYDROZEN.activePrompt.prompt, url: location.href };
  if (navigator.share) await navigator.share(data);
  else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(`${data.title}\n\n${data.text}`);
}

function downloadPrompt() {
  if (!HYDROZEN.activePrompt) return;
  const blob = new Blob([HYDROZEN.activePrompt.prompt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${HYDROZEN.activePrompt.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleImagePreview(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (ui.imagePreview) ui.imagePreview.src = reader.result;
    ui.uploadDrop?.classList.add("has-image");
    if (ui.uploadDropText) ui.uploadDropText.textContent = "Preview attached";
  };
  reader.readAsDataURL(file);
}

function resetImagePreview() {
  ui.imagePreview?.removeAttribute("src");
  ui.uploadDrop?.classList.remove("has-image");
  if (ui.uploadDropText) ui.uploadDropText.textContent = "Drop or select a cinematic preview image";
}

function setStatus(label, title = "") {
  if (!ui.syncStatus) return;
  ui.syncStatus.textContent = label;
  ui.syncStatus.title = title;
}

function notify(message, isError = false) {
  if (!ui.formStatus) return;
  ui.formStatus.textContent = message;
  ui.formStatus.classList.toggle("is-error", isError);
}

function setSubmitting(isSubmitting) {
  if (!ui.submitButton) return;
  ui.submitButton.classList.toggle("is-submitting", isSubmitting);
  ui.submitButton.disabled = isSubmitting;
}

function formatLikes(value) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(Math.max(value, 0));
}

function toWebpHint(src) {
  return src.startsWith("data:") || src.includes("supabase") ? src : src.replace(/\.(jpg|jpeg|png)$/i, ".webp");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function initReveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".reveal").forEach(element => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  $$(".reveal").forEach(element => observer.observe(element));
}

function bindEvents() {
  safeBind(window, "load", () => setTimeout(() => ui.loader?.classList.add("is-hidden"), 250));
  safeBind(window, "scroll", () => ui.navbar?.classList.toggle("is-scrolled", window.scrollY > 14), { passive: true });

  safeBind(ui.navToggle, "click", () => {
    const isOpen = Boolean(ui.navMenu?.classList.toggle("is-open"));
    ui.navToggle?.setAttribute("aria-expanded", String(isOpen));
  });
  safeBind(ui.navMenu, "click", event => {
    if (!event.target?.closest?.("a")) return;
    ui.navMenu?.classList.remove("is-open");
    ui.navToggle?.setAttribute("aria-expanded", "false");
  });
  safeBind(window, "resize", () => {
    if (window.innerWidth > 768) {
      ui.navMenu?.classList.remove("is-open");
      ui.navToggle?.setAttribute("aria-expanded", "false");
    }
  });

  safeBind(ui.googleLogin, "click", loginWithGoogle);
  safeBind(ui.logoutButton, "click", logout);
  safeBind(ui.search, "input", event => {
    HYDROZEN.query = event.target.value.trim();
    renderPrompts();
  });
  safeBind($("#heroSearchForm"), "submit", event => {
    event.preventDefault();
    $("#explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $$(".filter-pill").forEach(button => {
    safeBind(button, "click", () => {
      HYDROZEN.category = button.dataset.category;
      $$(".filter-pill").forEach(item => item.classList.toggle("active", item === button));
      renderPrompts();
    });
  });
  safeBind(ui.resetFilters, "click", () => {
    HYDROZEN.category = "All";
    HYDROZEN.query = "";
    if (ui.search) ui.search.value = "";
    $$(".filter-pill").forEach(button => button.classList.toggle("active", button.dataset.category === "All"));
    renderPrompts();
  });
  safeBind(ui.grid, "click", event => {
    const target = event.target;
    if (!target?.closest) return;
    const saveButton = target.closest("[data-save]");
    const likeButton = target.closest("[data-like]");
    const copyButton = target.closest("[data-copy]");
    const openButton = target.closest("[data-open]");
    const cardButton = target.closest("[data-card-open]");
    if (saveButton) toggleSave(saveButton.dataset.save);
    else if (likeButton) toggleLike(likeButton.dataset.like);
    else if (copyButton) copyPrompt(copyButton.dataset.copy, copyButton);
    else if (openButton) openModal(openButton.dataset.open);
    else if (cardButton) openModal(cardButton.dataset.cardOpen);
  });
  safeBind(ui.modal, "click", event => {
    if (event.target?.matches?.("[data-close-modal]")) closeModal();
  });
  safeBind(window, "keydown", event => {
    if (event.key === "Escape" && ui.modal && !ui.modal.hidden) closeModal();
  });
  safeBind($("#modalCopy"), "click", event => copyPrompt(HYDROZEN.activePrompt?.id, event.currentTarget));
  safeBind($("#modalShare"), "click", sharePrompt);
  safeBind($("#modalDownload"), "click", downloadPrompt);
  safeBind(ui.imageUpload, "change", event => handleImagePreview(event.target.files?.[0]));
  safeBind(ui.uploadDrop, "dragover", event => event.preventDefault());
  safeBind(ui.uploadDrop, "drop", event => {
    event.preventDefault();
    handleImagePreview(event.dataTransfer?.files?.[0]);
  });
  safeBind(ui.uploadForm, "submit", submitPrompt);
  safeBind(ui.mobileSearch, "click", () => {
    $("#home")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => ui.search?.focus(), 350);
  });
  safeBind(ui.mobileAccount, "click", () => {
    if (HYDROZEN.session?.user) {
      $("#upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      loginWithGoogle();
    }
  });
  if ($("#year")) $("#year").textContent = new Date().getFullYear();
}

async function boot() {
  safeRun("bind-events", bindEvents);
  safeRun("reveal", initReveal);
  await safeRunAsync("supabase", initSupabase);
  await safeRunAsync("auth", initAuth);
  safeRun("realtime", subscribeRealtime);
  await safeRunAsync("prompts", loadPrompts);
  ui.loader?.classList.add("is-hidden");
}

if (document.readyState === "loading") {
  safeBind(document, "DOMContentLoaded", boot);
} else {
  boot();
}
