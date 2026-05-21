const demoPrompts = [
  {
    id: "hz-midnight-product",
    title: "Midnight Monolith Product Campaign",
    category: "Midjourney",
    creator: "Aarav Syntax",
    image: "/assets/img/1.jpg",
    prompt: "A black titanium smart fragrance bottle standing on a wet obsidian plinth, thin cyan rim light, premium Apple-style product photography, volumetric mist, microscopic glass reflections, editorial cyberpunk luxury campaign, 85mm lens, ultra detailed, cinematic contrast, clean negative space",
    tags: ["product", "luxury", "cyan", "campaign"],
    likes: 1284,
    trending: true
  },
  {
    id: "hz-flux-oracle",
    title: "Glass Oracle Fashion Portrait",
    category: "Flux",
    creator: "Mira Voss",
    image: "/assets/img/2.jpg",
    prompt: "High fashion portrait of an androgynous oracle wearing translucent glass armor, soft white halo gradients, black studio void, subtle chrome particles, expensive editorial lighting, luminous eyes, shallow depth of field, tactile skin texture, futuristic couture, award-winning magazine cover",
    tags: ["portrait", "fashion", "glass", "editorial"],
    likes: 974,
    trending: true
  },
  {
    id: "hz-chatgpt-system",
    title: "Elite Brand Strategy System",
    category: "ChatGPT",
    creator: "Noor Atlas",
    image: "/assets/img/18.jpg",
    prompt: "Act as a senior brand strategist and conversion-focused creative director. Build a premium brand positioning system for a futuristic AI startup. Include audience psychology, market angle, visual language, content pillars, homepage messaging, offer ladder, and a launch checklist. Keep the tone sharp, luxurious, and commercially useful.",
    tags: ["strategy", "startup", "system", "brand"],
    likes: 846,
    trending: false
  },
  {
    id: "hz-stable-city",
    title: "Rainlit Vertical City",
    category: "Stable Diffusion",
    creator: "Kenji Frame",
    image: "/assets/img/38.jpg",
    prompt: "A massive vertical city at night after rain, reflective black streets, white holographic signage, flying transit lanes, cinematic fog layers, futuristic minimal architecture, cyberpunk but elegant, high dynamic range, realistic scale, crisp details, no text artifacts",
    tags: ["city", "cyberpunk", "rain", "architecture"],
    likes: 1532,
    trending: true
  },
  {
    id: "hz-grok-ideas",
    title: "Viral AI Tool Ideas",
    category: "Grok",
    creator: "Isha Vector",
    image: "/assets/img/39.jpg",
    prompt: "Generate 25 unconventional but commercially realistic AI micro-SaaS ideas for solo builders. Focus on creator workflows, local businesses, productivity, education, and social media automation. For each idea include target user, core pain, MVP feature set, pricing angle, and a viral demo hook.",
    tags: ["ideas", "saas", "viral", "builder"],
    likes: 621,
    trending: false
  },
  {
    id: "hz-flux-interior",
    title: "Silent Luxury Interior",
    category: "Flux",
    creator: "Elena Darkroom",
    image: "/assets/img/40.jpg",
    prompt: "A silent luxury penthouse interior at blue hour, black stone, warm indirect light, sculptural furniture, panoramic futuristic skyline, museum-grade minimalism, soft haze, expensive materials, architectural digest editorial, photorealistic, calm premium atmosphere",
    tags: ["interior", "luxury", "architecture", "calm"],
    likes: 1198,
    trending: true
  },
  {
    id: "hz-midjourney-mecha",
    title: "Ceremonial Mecha Guardian",
    category: "Midjourney",
    creator: "Dante Neon",
    image: "/assets/img/41.jpg",
    prompt: "A ceremonial mecha guardian kneeling inside a cathedral of black glass, white god rays, glowing cyan sigils, intricate carbon armor, sacred futuristic atmosphere, cinematic wide shot, epic scale, detailed hard surface design, premium concept art",
    tags: ["mecha", "cathedral", "concept", "cinematic"],
    likes: 1762,
    trending: true
  },
  {
    id: "hz-chatgpt-prompt",
    title: "Prompt Refinement Engine",
    category: "ChatGPT",
    creator: "Rhea Promptlab",
    image: "/assets/img/42.jpg",
    prompt: "You are my prompt refinement engine. Ask clarifying questions only when required, then rewrite any rough prompt into a precise production-ready prompt. Improve structure, constraints, examples, output format, success criteria, and edge cases. Return three versions: concise, balanced, and expert.",
    tags: ["prompting", "workflow", "chatgpt", "system"],
    likes: 904,
    trending: false
  },
  {
    id: "hz-stable-creature",
    title: "Bioluminescent Forest Spirit",
    category: "Stable Diffusion",
    creator: "Sana Myth",
    image: "/assets/img/43.jpg",
    prompt: "A bioluminescent forest spirit made of translucent petals and obsidian, standing in a moonlit alien forest, soft white gradients, glowing pollen, fantasy realism, macro environmental details, elegant creature design, cinematic depth, high detail, no extra limbs",
    tags: ["fantasy", "creature", "forest", "glow"],
    likes: 733,
    trending: false
  }
];

const state = {
  prompts: [],
  category: "All",
  query: "",
  activePrompt: null,
  saved: new Set(JSON.parse(localStorage.getItem("hydrozen:saved") || "[]"))
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const elements = {
  loader: $("#pageLoader"),
  cursor: $(".cursor-glow"),
  navbar: $("#navbar"),
  navToggle: $("#navToggle"),
  navMenu: $(".nav-menu"),
  search: $("#searchInput"),
  grid: $("#promptGrid"),
  resultCount: $("#resultCount"),
  totalPrompts: $("#totalPrompts"),
  savedCount: $("#savedCount"),
  resetFilters: $("#resetFilters"),
  modal: $("#promptModal"),
  uploadForm: $("#uploadForm"),
  formStatus: $("#formStatus"),
  submitButton: $(".submit-button"),
  imageUpload: $("#imageUpload"),
  imagePreview: $("#imagePreview"),
  uploadDrop: $(".upload-drop"),
  uploadDropText: $("#uploadDropText"),
};

function normalizeApiPrompt(item, index) {
  const engines = ["ChatGPT", "Midjourney", "Stable Diffusion", "Grok", "Flux"];
  return {
    id: item.id || `api-${index}`,
    title: item.title || "Untitled Prompt",
    category: engines.includes(item.category) ? item.category : item.model || engines[index % engines.length],
    creator: item.creator || ["Hydrozen Labs", "Nova Creator", "Prompt Atlas", "Studio Zero"][index % 4],
    image: item.image || `/assets/img/${index % 2 ? "2" : "18"}.jpg`,
    prompt: item.prompt || "",
    tags: item.tags || [],
    likes: item.likes || 420 + index * 137,
    trending: typeof item.trending === "boolean" ? item.trending : index % 3 === 0
  };
}

async function loadPrompts() {
  state.prompts = [...demoPrompts];
  renderPrompts();

  try {
    const response = await fetch("/api/prompts", { cache: "no-store" });
    if (!response.ok) throw new Error("API unavailable");
    const payload = await response.json();
    const apiPrompts = (payload.prompts || []).map(normalizeApiPrompt);
    state.prompts = [...demoPrompts, ...apiPrompts].filter((item, index, list) => {
      return list.findIndex(match => match.id === item.id) === index;
    });
    renderPrompts();
  } catch {
    state.prompts = [...demoPrompts];
    renderPrompts();
  }
}

function filteredPrompts() {
  const query = state.query.toLowerCase();
  return state.prompts.filter(prompt => {
    const text = `${prompt.title} ${prompt.category} ${prompt.creator} ${prompt.prompt} ${prompt.tags.join(" ")}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesCategory = state.category === "All" || prompt.category === state.category;
    return matchesQuery && matchesCategory;
  });
}

function renderPrompts() {
  const prompts = filteredPrompts();
  elements.grid.classList.remove("skeleton-grid");
  elements.grid.innerHTML = "";
  elements.totalPrompts.textContent = state.prompts.length;
  elements.savedCount.textContent = state.saved.size;
  elements.resultCount.textContent = prompts.length === 1 ? "1 prompt found" : `${prompts.length} prompts found`;

  if (!prompts.length) {
    elements.grid.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>No matching signal found.</h3>
          <p>Try a broader keyword or reset the engine filter.</p>
        </div>
      </div>
    `;
    return;
  }

  prompts.forEach(prompt => {
    const card = document.createElement("article");
    card.className = "prompt-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="card-media">
        <img src="${prompt.image}" alt="${escapeHtml(prompt.title)} preview" loading="lazy">
        ${prompt.trending ? '<span class="trending-badge">Trending</span>' : ""}
        <button class="save-button ${state.saved.has(prompt.id) ? "is-saved" : ""}" type="button" data-save="${prompt.id}">
          ${state.saved.has(prompt.id) ? "Saved" : "Save"}
        </button>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="engine-chip">${escapeHtml(prompt.category)}</span>
          <span class="likes">${formatLikes(prompt.likes)} likes</span>
        </div>
        <h3>${escapeHtml(prompt.title)}</h3>
        <p class="creator">by ${escapeHtml(prompt.creator)}</p>
        <p class="prompt-preview">${escapeHtml(prompt.prompt)}</p>
        <div class="tag-list">
          ${prompt.tags.slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <button class="card-action" type="button" data-open="${prompt.id}">View Prompt</button>
          <button class="card-action" type="button" data-copy="${prompt.id}">Copy</button>
        </div>
      </div>
    `;

    card.addEventListener("mousemove", event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter") openModal(prompt.id);
    });

    elements.grid.append(card);
  });
}

function savePrompt(id) {
  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
  }
  localStorage.setItem("hydrozen:saved", JSON.stringify([...state.saved]));
  renderPrompts();
}

async function copyPrompt(id, button) {
  const prompt = state.prompts.find(item => item.id === id);
  if (!prompt) return;
  await navigator.clipboard.writeText(prompt.prompt);
  if (button) {
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  }
}

function openModal(id) {
  const prompt = state.prompts.find(item => item.id === id);
  if (!prompt) return;

  state.activePrompt = prompt;
  $("#modalImage").src = prompt.image;
  $("#modalImage").alt = `${prompt.title} preview`;
  $("#modalCategory").textContent = prompt.category;
  $("#modalLikes").textContent = `${formatLikes(prompt.likes)} likes`;
  $("#modalTitle").textContent = prompt.title;
  $("#modalCreator").textContent = `Created by ${prompt.creator}`;
  $("#modalPrompt").textContent = prompt.prompt;
  $("#modalTags").innerHTML = prompt.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
  $(".modal-close").focus();
}

function closeModal() {
  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function downloadPrompt() {
  if (!state.activePrompt) return;
  const data = [
    `HYDROZEN Prompt: ${state.activePrompt.title}`,
    `Creator: ${state.activePrompt.creator}`,
    `Engine: ${state.activePrompt.category}`,
    "",
    state.activePrompt.prompt,
    "",
    `Tags: ${state.activePrompt.tags.join(", ")}`
  ].join("\n");

  const blob = new Blob([data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.activePrompt.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

async function sharePrompt() {
  if (!state.activePrompt) return;
  const shareData = {
    title: state.activePrompt.title,
    text: state.activePrompt.prompt,
    url: window.location.href
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
    $("#modalShare").textContent = "Copied Share";
    setTimeout(() => {
      $("#modalShare").textContent = "Share";
    }, 1300);
  }
}

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    elements.imagePreview.src = reader.result;
    elements.uploadDrop.classList.add("has-image");
    elements.uploadDropText.textContent = "Preview attached";
  };
  reader.readAsDataURL(file);
}

async function submitPrompt(event) {
  event.preventDefault();
  const form = new FormData(elements.uploadForm);
  const body = {
    title: form.get("title"),
    category: form.get("category"),
    model: form.get("category"),
    prompt: form.get("prompt"),
    tags: form.get("tags"),
    image: elements.imagePreview.src || "/assets/img/44.jpg"
  };

  elements.submitButton.classList.add("is-submitting");
  elements.formStatus.classList.remove("is-error");
  elements.formStatus.textContent = "Publishing prompt...";

  try {
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error("Backend rejected this prompt.");
    const payload = await response.json();
    state.prompts.unshift(normalizeApiPrompt(payload.prompt, state.prompts.length));
    elements.uploadForm.reset();
    elements.imagePreview.removeAttribute("src");
    elements.uploadDrop.classList.remove("has-image");
    elements.uploadDropText.textContent = "Drop or select a cinematic preview image";
    elements.formStatus.textContent = "Prompt published into HYDROZEN.";
    state.category = "All";
    state.query = "";
    elements.search.value = "";
    $$(".filter-pill").forEach(button => button.classList.toggle("active", button.dataset.category === "All"));
    renderPrompts();
    document.querySelector("#explore").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    const localPrompt = {
      id: `local-${Date.now()}`,
      title: body.title,
      category: body.category,
      creator: "Local Creator",
      image: body.image,
      prompt: body.prompt,
      tags: String(body.tags || "").split(",").map(tag => tag.trim()).filter(Boolean),
      likes: 1,
      trending: false
    };
    state.prompts.unshift(localPrompt);
    elements.formStatus.textContent = "Saved locally because backend was unavailable.";
    elements.formStatus.classList.add("is-error");
    renderPrompts();
  } finally {
    elements.submitButton.classList.remove("is-submitting");
  }
}

function initParticles() {
  const canvas = $("#particleCanvas");
  const context = canvas.getContext("2d");
  const particles = Array.from({ length: 74 }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 0.0006 + 0.00018,
    alpha: Math.random() * 0.55 + 0.12
  }));

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
      particle.y -= particle.speed;
      if (particle.y < -0.02) particle.y = 1.02;
      context.beginPath();
      context.arc(particle.x * canvas.width, particle.y * canvas.height, particle.radius * window.devicePixelRatio, 0, Math.PI * 2);
      context.fillStyle = `rgba(126, 252, 255, ${particle.alpha})`;
      context.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  $$(".reveal").forEach(element => observer.observe(element));
}

function formatLikes(value) {
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

window.addEventListener("load", () => {
  setTimeout(() => elements.loader.classList.add("is-hidden"), 500);
});

window.addEventListener("mousemove", event => {
  elements.cursor.style.opacity = "1";
  elements.cursor.style.transform = `translate3d(${event.clientX - 160}px, ${event.clientY - 160}px, 0)`;
});

window.addEventListener("scroll", () => {
  elements.navbar.classList.toggle("is-scrolled", window.scrollY > 14);
});

elements.navToggle.addEventListener("click", () => {
  const isOpen = elements.navMenu.classList.toggle("is-open");
  elements.navToggle.setAttribute("aria-expanded", String(isOpen));
});

elements.search.addEventListener("input", event => {
  state.query = event.target.value.trim();
  renderPrompts();
});

$("#heroSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  $("#explore").scrollIntoView({ behavior: "smooth", block: "start" });
});

$$(".filter-pill").forEach(button => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;
    $$(".filter-pill").forEach(item => item.classList.toggle("active", item === button));
    renderPrompts();
  });
});

elements.resetFilters.addEventListener("click", () => {
  state.category = "All";
  state.query = "";
  elements.search.value = "";
  $$(".filter-pill").forEach(button => button.classList.toggle("active", button.dataset.category === "All"));
  renderPrompts();
});

elements.grid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  const copyButton = event.target.closest("[data-copy]");
  const openButton = event.target.closest("[data-open]");

  if (saveButton) savePrompt(saveButton.dataset.save);
  if (copyButton) copyPrompt(copyButton.dataset.copy, copyButton);
  if (openButton) openModal(openButton.dataset.open);
});

elements.modal.addEventListener("click", event => {
  if (event.target.matches("[data-close-modal]")) closeModal();
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && !elements.modal.hidden) closeModal();
});

$("#modalCopy").addEventListener("click", event => copyPrompt(state.activePrompt?.id, event.currentTarget));
$("#modalShare").addEventListener("click", sharePrompt);
$("#modalDownload").addEventListener("click", downloadPrompt);

elements.imageUpload.addEventListener("change", event => handleImageUpload(event.target.files[0]));
elements.uploadDrop.addEventListener("dragover", event => {
  event.preventDefault();
  elements.uploadDrop.style.borderColor = "rgba(126, 252, 255, 0.75)";
});
elements.uploadDrop.addEventListener("dragleave", () => {
  elements.uploadDrop.style.borderColor = "";
});
elements.uploadDrop.addEventListener("drop", event => {
  event.preventDefault();
  elements.uploadDrop.style.borderColor = "";
  handleImageUpload(event.dataTransfer.files[0]);
});

elements.uploadForm.addEventListener("submit", submitPrompt);
$("#year").textContent = new Date().getFullYear();

initParticles();
initReveal();
loadPrompts();
