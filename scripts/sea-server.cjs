const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:http");
const { BlockList, isIPv4 } = require("node:net");
const { networkInterfaces } = require("node:os");
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

function selectLanInterface(address) {
  const candidates = Object.values(networkInterfaces())
    .flat()
    .filter(entry =>
      !entry.internal &&
      entry.family === "IPv4" &&
      entry.cidr &&
      !entry.address.startsWith("169.254.") &&
      Number(entry.cidr.split("/")[1]) > 0 &&
      Number(entry.cidr.split("/")[1]) < 32
    );
  const selected = address
    ? candidates.find(entry => entry.address === address)
    : candidates.length === 1 ? candidates[0] : undefined;
  if (!selected) {
    const addresses = candidates.map(entry => entry.address).join(", ") || "none";
    throw new Error(`Choose a local IPv4 interface with --lan-address. Available: ${addresses}.`);
  }
  return selected;
}

async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      "no-open": { type: "boolean" },
      lan: { type: "boolean" },
      "lan-address": { type: "string" },
      port: { type: "string", default: "8787" },
    },
  });

  if (values.help) {
    console.log("AVEVA JSON Workbench\nUsage: AVEVA-JSON-Workbench.exe [--port 8787] [--no-open] [--lan] [--lan-address IPv4]");
    return;
  }

  const port = Number(values.port);
  if (!/^\d+$/.test(values.port) || port < 1 || port > 65535) {
    throw new Error("--port must be an integer from 1 to 65535.");
  }

  const lan = values.lan || values["lan-address"]
    ? selectLanInterface(values["lan-address"])
    : undefined;
  const subnet = new BlockList();
  if (lan) subnet.addSubnet(lan.address, Number(lan.cidr.split("/")[1]), "ipv4");
  const assets = new Set(getAssetKeys());
  const serve = (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    const local = request.socket.localAddress;
    const host = request.headers.host?.toLowerCase();
    const allowedHosts = local === "127.0.0.1" ? [local, "localhost"] : [lan?.address];
    const validHost = allowedHosts.some(name => name && (host === `${name}:${port}` || (port === 80 && host === name)));
    const remote = request.socket.remoteAddress;
    if (!validHost || (local !== "127.0.0.1" && (!remote || !isIPv4(remote) || !subnet.check(remote)))) {
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
  };

  const addresses = lan ? ["127.0.0.1", lan.address] : ["127.0.0.1"];
  const servers = addresses.map(() => createServer(serve));
  try {
    for (const [index, server] of servers.entries()) {
      const listening = once(server, "listening");
      server.listen(port, addresses[index]);
      await listening;
    }
  } catch (error) {
    for (const server of servers) if (server.listening) server.close();
    if (error.code === "EADDRINUSE") throw new Error(`Port ${port} is in use. Choose another with --port.`);
    throw error;
  }

  const url = `http://127.0.0.1:${port}/`;
  console.log(`AVEVA JSON Workbench is running at ${url}`);
  if (lan) console.log(`LAN: http://${lan.address}:${port}/ (HTTP, local subnet only)`);
  console.log("Press Ctrl+C to stop.");
  if (!values["no-open"]) openBrowser(url);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
