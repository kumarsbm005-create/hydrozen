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

const HYDROZEN = {
  supabase: null,
  session: null,
  prompts: [],
  category: "All",
  query: "",
  realtimeChannel: null,
  localSaved: new Set(JSON.parse(localStorage.getItem("hydrozen:saved") || "[]")),
  localLiked: new Set(JSON.parse(localStorage.getItem("hydrozen:liked") || "[]"))
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const ui = {
  loader: $("#pageLoader"),
  navbar: $("#navbar"),
  navToggle: $("#navToggle"),
  navMenu: $(".nav-menu"),
  search: $("#searchInput"),
  grid: $("#promptGrid"),
  resultCount: $("#resultCount"),
  totalPrompts: $("#totalPrompts"),
  savedCount: $("#savedCount"),
  resetFilters: $("#resetFilters"),
  syncStatus: $("#syncStatus"),
  googleLogin: $("#googleLogin"),
  logoutButton: $("#logoutButton"),
  userPill: $("#userPill"),
  modal: $("#promptModal"),
  uploadForm: $("#uploadForm"),
  formStatus: $("#formStatus"),
  submitButton: $(".submit-button"),
  imageUpload: $("#imageUpload"),
  imagePreview: $("#imagePreview"),
  uploadDrop: $(".upload-drop"),
  uploadDropText: $("#uploadDropText")
};

function getSupabaseConfig() {
  const env = window.HYDROZEN_ENV || {};
  return {
    url: env.SUPABASE_URL || "",
    anonKey: env.SUPABASE_ANON_KEY || ""
  };
}

function initSupabase() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !window.supabase?.createClient) {
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
    loadPrompts();
  });
}

function renderAuth() {
  const user = HYDROZEN.session?.user;
  ui.googleLogin.hidden = Boolean(user);
  ui.logoutButton.hidden = !user;
  ui.userPill.hidden = !user;
  ui.userPill.textContent = user?.user_metadata?.full_name || user?.email || "";
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
  ui.grid.classList.add("skeleton-grid");
  ui.grid.innerHTML = '<article class="skeleton-card"></article><article class="skeleton-card"></article><article class="skeleton-card"></article>';
  ui.resultCount.textContent = "Loading prompts";
}

function filteredPrompts() {
  const query = HYDROZEN.query.toLowerCase();
  return HYDROZEN.prompts.filter(prompt => {
    const haystack = `${prompt.title} ${prompt.category} ${prompt.creator} ${prompt.prompt} ${prompt.tags.join(" ")}`.toLowerCase();
    return (!query || haystack.includes(query)) && (HYDROZEN.category === "All" || prompt.category === HYDROZEN.category);
  });
}

function renderPrompts() {
  const prompts = filteredPrompts();
  ui.grid.classList.remove("skeleton-grid");
  ui.grid.innerHTML = "";
  ui.totalPrompts.textContent = HYDROZEN.prompts.length;
  ui.savedCount.textContent = HYDROZEN.prompts.filter(prompt => prompt.saved).length + HYDROZEN.localSaved.size;
  ui.resultCount.textContent = prompts.length === 1 ? "1 prompt found" : `${prompts.length} prompts found`;

  if (!prompts.length) {
    ui.grid.innerHTML = '<div class="empty-state"><div><h3>No matching prompt found.</h3><p>Try another keyword or reset filters.</p></div></div>';
    return;
  }

  prompts.forEach(prompt => {
    const card = document.createElement("article");
    card.className = "prompt-card";
    card.tabIndex = 0;
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
        <div class="tag-list">${prompt.tags.slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions">
          <button class="card-action" type="button" data-open="${prompt.id}">View Prompt</button>
          <button class="card-action" type="button" data-copy="${prompt.id}">Copy</button>
        </div>
      </div>
    `;
    card.addEventListener("keydown", event => {
      if (event.key === "Enter") openModal(prompt.id);
    });
    ui.grid.append(card);
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
  setSubmitting(true);
  notify("Publishing prompt...");

  try {
    const form = new FormData(ui.uploadForm);
    const file = ui.imageUpload.files[0];
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

    ui.uploadForm.reset();
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
    localStorage.setItem("hydrozen:liked", JSON.stringify([...HYDROZEN.localLiked]));
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
    localStorage.setItem("hydrozen:saved", JSON.stringify([...HYDROZEN.localSaved]));
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
  HYDROZEN.activePrompt = prompt;
  $("#modalImage").src = prompt.image;
  $("#modalImage").alt = `${prompt.title} preview`;
  $("#modalCategory").textContent = prompt.category;
  $("#modalLikes").textContent = `${formatLikes(prompt.likes)} likes`;
  $("#modalTitle").textContent = prompt.title;
  $("#modalCreator").textContent = `Created by ${prompt.creator}`;
  $("#modalPrompt").textContent = prompt.prompt;
  $("#modalTags").innerHTML = prompt.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  ui.modal.hidden = false;
  document.body.classList.add("modal-open");
  $(".modal-close").focus();
}

function closeModal() {
  ui.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function copyPrompt(id, button) {
  const prompt = HYDROZEN.prompts.find(item => item.id === id) || HYDROZEN.activePrompt;
  if (!prompt) return;
  await navigator.clipboard.writeText(prompt.prompt);
  if (!button) return;
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = original), 1200);
}

async function sharePrompt() {
  if (!HYDROZEN.activePrompt) return;
  const data = { title: HYDROZEN.activePrompt.title, text: HYDROZEN.activePrompt.prompt, url: location.href };
  if (navigator.share) await navigator.share(data);
  else await navigator.clipboard.writeText(`${data.title}\n\n${data.text}`);
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
    ui.imagePreview.src = reader.result;
    ui.uploadDrop.classList.add("has-image");
    ui.uploadDropText.textContent = "Preview attached";
  };
  reader.readAsDataURL(file);
}

function resetImagePreview() {
  ui.imagePreview.removeAttribute("src");
  ui.uploadDrop.classList.remove("has-image");
  ui.uploadDropText.textContent = "Drop or select a cinematic preview image";
}

function setStatus(label, title = "") {
  ui.syncStatus.textContent = label;
  ui.syncStatus.title = title;
}

function notify(message, isError = false) {
  ui.formStatus.textContent = message;
  ui.formStatus.classList.toggle("is-error", isError);
}

function setSubmitting(isSubmitting) {
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
  window.addEventListener("load", () => setTimeout(() => ui.loader.classList.add("is-hidden"), 250));
  window.addEventListener("scroll", () => ui.navbar.classList.toggle("is-scrolled", window.scrollY > 14), { passive: true });

  ui.navToggle.addEventListener("click", () => {
    const isOpen = ui.navMenu.classList.toggle("is-open");
    ui.navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  ui.navMenu.addEventListener("click", event => {
    if (!event.target.closest("a")) return;
    ui.navMenu.classList.remove("is-open");
    ui.navToggle.setAttribute("aria-expanded", "false");
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      ui.navMenu.classList.remove("is-open");
      ui.navToggle.setAttribute("aria-expanded", "false");
    }
  });

  ui.googleLogin.addEventListener("click", loginWithGoogle);
  ui.logoutButton.addEventListener("click", logout);
  ui.search.addEventListener("input", event => {
    HYDROZEN.query = event.target.value.trim();
    renderPrompts();
  });
  $("#heroSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    $("#explore").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $$(".filter-pill").forEach(button => {
    button.addEventListener("click", () => {
      HYDROZEN.category = button.dataset.category;
      $$(".filter-pill").forEach(item => item.classList.toggle("active", item === button));
      renderPrompts();
    });
  });
  ui.resetFilters.addEventListener("click", () => {
    HYDROZEN.category = "All";
    HYDROZEN.query = "";
    ui.search.value = "";
    $$(".filter-pill").forEach(button => button.classList.toggle("active", button.dataset.category === "All"));
    renderPrompts();
  });
  ui.grid.addEventListener("click", event => {
    const saveButton = event.target.closest("[data-save]");
    const likeButton = event.target.closest("[data-like]");
    const copyButton = event.target.closest("[data-copy]");
    const openButton = event.target.closest("[data-open]");
    if (saveButton) toggleSave(saveButton.dataset.save);
    if (likeButton) toggleLike(likeButton.dataset.like);
    if (copyButton) copyPrompt(copyButton.dataset.copy, copyButton);
    if (openButton) openModal(openButton.dataset.open);
  });
  ui.modal.addEventListener("click", event => {
    if (event.target.matches("[data-close-modal]")) closeModal();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && !ui.modal.hidden) closeModal();
  });
  $("#modalCopy").addEventListener("click", event => copyPrompt(HYDROZEN.activePrompt?.id, event.currentTarget));
  $("#modalShare").addEventListener("click", sharePrompt);
  $("#modalDownload").addEventListener("click", downloadPrompt);
  ui.imageUpload.addEventListener("change", event => handleImagePreview(event.target.files[0]));
  ui.uploadDrop.addEventListener("dragover", event => event.preventDefault());
  ui.uploadDrop.addEventListener("drop", event => {
    event.preventDefault();
    handleImagePreview(event.dataTransfer.files[0]);
  });
  ui.uploadForm.addEventListener("submit", submitPrompt);
  $("#year").textContent = new Date().getFullYear();
}

async function boot() {
  bindEvents();
  initReveal();
  initSupabase();
  await initAuth();
  subscribeRealtime();
  await loadPrompts();
}

boot();
