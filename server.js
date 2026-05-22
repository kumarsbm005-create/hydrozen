const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_FILE = path.join("/tmp", "prompts.json");

// Vercel is read-only except /tmp — use /tmp for data storage
function readPrompts() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writePrompts(prompts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(prompts, null, 2));
}

function publicEnvScript() {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
  };
  return `window.HYDROZEN_ENV = ${JSON.stringify(env)};`;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) { reject(new Error("Payload too large")); req.destroy(); }
    });
    req.on("end", () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function normalizePrompt(input) {
  const title = String(input.title || "").trim();
  const prompt = String(input.prompt || "").trim();
  const category = String(input.category || "Unsorted").trim();

  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  if (prompt.length < 20) return { error: "Prompt must be at least 20 characters." };

  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags || "").split(",").map(t => t.trim()).filter(Boolean);

  return {
    id: `ipx-${crypto.randomUUID()}`,
    title,
    category,
    image: String(input.image || "/assets/img/18.jpg").trim(),
    prompt,
    tags,
    rating: Math.max(0, Math.min(5, Number(input.rating || 4.5))),
    createdAt: new Date().toISOString()
  };
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function serveFile(res, filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(content);
  } catch {
    try {
      const index = fs.readFileSync(path.join(ROOT, "index.html"));
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(index);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  }
}

// ─── Main Vercel Handler ───────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

  // /env.js — inject Supabase env vars to frontend
  if (pathname === "/env.js") {
    const body = publicEnvScript();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
    return;
  }

  // API routes
  if (pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "hydrozen", time: new Date().toISOString() });
    return;
  }

  if (pathname === "/api/stats") {
    const prompts = readPrompts();
    const categories = [...new Set(prompts.map(p => p.category))];
    sendJson(res, 200, { total: prompts.length, categories });
    return;
  }

  if (pathname === "/api/prompts" && req.method === "GET") {
    const query = String(url.searchParams.get("q") || "").toLowerCase();
    const category = String(url.searchParams.get("category") || "all").toLowerCase();
    const prompts = readPrompts().filter(item => {
      const haystack = `${item.title} ${item.category} ${item.prompt} ${(item.tags || []).join(" ")}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesCategory = category === "all" || item.category.toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });
    sendJson(res, 200, { prompts });
    return;
  }

  if (pathname === "/api/prompts" && req.method === "POST") {
    try {
      const input = await parseBody(req);
      const next = normalizePrompt(input);
      if (next.error) { sendJson(res, 400, { error: next.error }); return; }
      const prompts = readPrompts();
      prompts.unshift(next);
      writePrompts(prompts);
      sendJson(res, 201, { prompt: next });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Static file serving
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  serveFile(res, filePath);
};
