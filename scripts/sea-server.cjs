const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
const { extname, join } = require("node:path");
const { getAssetKeys, getRawAsset } = require("node:sea");
const { parseArgs } = require("node:util");

const types = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function assetFor(url, assets) {
  const pathname = decodeURIComponent(url.split("?", 1)[0]);
  if (!pathname.startsWith("/") || pathname.includes("\\") || pathname.includes("\0")) {
    throw new URIError("Invalid path");
  }

  const path = pathname.slice(1).replace(/\/$/, "");
  if (path.split("/").some(segment => segment === "." || segment === "..")) {
    throw new URIError("Invalid path");
  }
  if (!path) return "index.html";
  return [path, `${path}.html`, `${path}/index.html`].find(asset => assets.has(asset));
}

function openBrowser(url) {
  const explorer = join(process.env.SystemRoot ?? "C:\\Windows", "explorer.exe");
  const child = spawn(explorer, [url], { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
  child.unref();
}

function main() {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      "no-open": { type: "boolean" },
      port: { type: "string", default: "8787" },
    },
  });

  if (values.help) {
    console.log("AVEVA JSON Workbench\nUsage: AVEVA-JSON-Workbench.exe [--port 8787] [--no-open]");
    return;
  }

  const port = Number(values.port);
  if (!/^\d+$/.test(values.port) || port < 1 || port > 65535) {
    throw new Error("--port must be an integer from 1 to 65535.");
  }

  const url = `http://127.0.0.1:${port}/`;
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const assets = new Set(getAssetKeys());
  const server = createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (!hosts.has(request.headers.host)) {
      response.writeHead(403).end();
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let asset;
    try {
      asset = assetFor(request.url, assets);
    } catch {
      response.writeHead(400).end();
      return;
    }

    const file = asset ?? "404.html";
    const data = Buffer.from(getRawAsset(file));
    response.writeHead(asset ? 200 : 404, {
      "Cache-Control": file.startsWith("_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
      "Content-Length": data.byteLength,
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : data);
  });

  server.on("error", error => {
    console.error(error.code === "EADDRINUSE" ? `Port ${port} is in use. Try --port 8788.` : error.message);
    process.exitCode = 1;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`AVEVA JSON Workbench is running at ${url}\nPress Ctrl+C to stop.`);
    if (!values["no-open"]) openBrowser(url);
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
