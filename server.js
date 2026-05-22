const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "prompts.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function publicEnvScript() {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
  };
  return `window.HYDROZEN_ENV = ${JSON.stringify(env)};`;
}

function readPrompts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Failed to read prompts:", error);
    return [];
  }
}

function writePrompts(prompts) {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(prompts, null, 2)}\n`);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function normalizePrompt(input) {
  const title = String(input.title || "").trim();
  const prompt = String(input.prompt || "").trim();
  const category = String(input.category || "Unsorted").trim();
  const model = String(input.model || "Custom").trim();

  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  if (prompt.length < 20) return { error: "Prompt must be at least 20 characters." };

  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags || "")
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

  return {
    id: `ipx-${crypto.randomUUID()}`,
    title,
    category,
    model,
    image: String(input.image || "/assets/img/18.jpg").trim(),
    prompt,
    negative: String(input.negative || "").trim(),
    tags,
    rating: Math.max(0, Math.min(5, Number(input.rating || 4.5))),
    createdAt: new Date().toISOString()
  };
}

function handleApi(req, res, url) {
  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "image-prompt-universe", time: new Date().toISOString() });
    return true;
  }

  if (url.pathname === "/api/stats") {
    const prompts = readPrompts();
    const categories = [...new Set(prompts.map(item => item.category))];
    const models = [...new Set(prompts.map(item => item.model))];
    sendJson(res, 200, { total: prompts.length, categories, models });
    return true;
  }

  if (url.pathname === "/api/prompts" && req.method === "GET") {
    const query = String(url.searchParams.get("q") || "").toLowerCase();
    const category = String(url.searchParams.get("category") || "all").toLowerCase();
    const model = String(url.searchParams.get("model") || "all").toLowerCase();

    const prompts = readPrompts().filter(item => {
      const haystack = `${item.title} ${item.category} ${item.model} ${item.prompt} ${(item.tags || []).join(" ")}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesCategory = category === "all" || item.category.toLowerCase() === category;
      const matchesModel = model === "all" || item.model.toLowerCase() === model;
      return matchesQuery && matchesCategory && matchesModel;
    });

    sendJson(res, 200, { prompts });
    return true;
  }

  if (url.pathname === "/api/prompts" && req.method === "POST") {
    parseBody(req)
      .then(input => {
        const nextPrompt = normalizePrompt(input);
        if (nextPrompt.error) {
          sendJson(res, 400, { error: nextPrompt.error });
          return;
        }
        const prompts = readPrompts();
        prompts.unshift(nextPrompt);
        writePrompts(prompts);
        sendJson(res, 201, { prompt: nextPrompt });
      })
      .catch(error => sendJson(res, 400, { error: error.message }));
    return true;
  }

  return false;
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(fallback);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/env.js") {
    const body = publicEnvScript();
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Length": Buffer.byteLength(body)
    });
    res.end(body);
    return;
  }
  if (url.pathname.startsWith("/api/") && handleApi(req, res, url)) return;
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Image Prompt Universe running at http://localhost:${PORT}`);
});
