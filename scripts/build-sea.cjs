const { spawnSync } = require("node:child_process");
const {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, renameSync, rmSync, rmdirSync, writeFileSync,
} = require("node:fs");
const { dirname, join, relative, resolve, sep } = require("node:path");
const { inject } = require("postject");

const root = resolve(__dirname, "..");
const exportDir = join(root, "apps/www/out");
const outputDir = join(root, "dist/sea");
const exeName = `AVEVA-JSON-Workbench-win-${process.arch}.exe`;

function findSignTool() {
  if (process.env.SIGNTOOL_PATH) return process.env.SIGNTOOL_PATH;
  const sdk = join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Windows Kits/10/bin");
  const versions = existsSync(sdk) ? readdirSync(sdk).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  ) : [];
  const installed = versions
    .map(version => join(sdk, version, process.arch === "ia32" ? "x86" : process.arch, "signtool.exe"))
    .find(existsSync);
  if (!installed) throw new Error("Install Windows SDK Signing Tools or set SIGNTOOL_PATH.");
  return installed;
}

async function nodeLicense() {
  const installedLicense = join(dirname(process.execPath), "LICENSE");
  if (process.env.NODE_SEA_LICENSE) return readFileSync(process.env.NODE_SEA_LICENSE);
  if (existsSync(installedLicense)) return readFileSync(installedLicense);

  const url = `https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`Could not download the Node.js license (${response.status}). Set NODE_SEA_LICENSE to the matching LICENSE file.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function build() {
  if (process.platform !== "win32") throw new Error("Build the Windows executable on Windows.");
  if (!existsSync(join(exportDir, "index.html")) || !existsSync(join(exportDir, "404.html"))) {
    throw new Error("Run pnpm build:www to generate the static site first.");
  }

  mkdirSync(outputDir, { recursive: true });
  const staging = mkdtempSync(join(outputDir, ".build-"));
  const blob = join(staging, "sea.blob");
  const config = join(staging, "sea.json");
  const executable = join(staging, exeName);
  const license = join(staging, "node-license.txt");
  const icon = join(staging, "workbench.ico");

  try {
    writeFileSync(license, await nodeLicense());
    const files = readdirSync(exportDir, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => join(entry.parentPath, entry.name));
    const assets = Object.fromEntries(
      files.map(file => [relative(exportDir, file).split(sep).join("/"), file])
    );
    assets["licenses/node.txt"] = license;
    assets["licenses/workbench.txt"] = join(root, "LICENSE");
    assets["licenses/web.txt"] = join(root, "apps/www/LICENSE.md");

    writeFileSync(config, JSON.stringify({
      main: join(__dirname, "sea-server.cjs"),
      output: blob,
      assets,
      disableExperimentalSEAWarning: true,
      execArgvExtension: "none",
    }));

    const prepare = spawnSync(process.execPath, ["--experimental-sea-config", config], { stdio: "inherit" });
    if (prepare.error) throw prepare.error;
    if (prepare.status !== 0) throw new Error("Node.js could not generate the SEA blob.");

    copyFileSync(process.execPath, executable);
    const removeSignature = spawnSync(findSignTool(), ["remove", "/s", executable], { stdio: "inherit" });
    if (removeSignature.error) throw removeSignature.error;
    if (removeSignature.status !== 0) throw new Error("SignTool could not remove the original Node.js signature.");

    const powershell = join(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32/WindowsPowerShell/v1.0/powershell.exe"
    );
    const decorate = spawnSync(powershell, [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", join(__dirname, "New-SecurityIcon.ps1"),
      "-IconPath", icon, "-Executable", executable,
    ], { stdio: "inherit" });
    if (decorate.error) throw decorate.error;
    if (decorate.status !== 0) throw new Error("Windows could not embed the application icon.");

    await inject(executable, "NODE_SEA_BLOB", readFileSync(blob), {
      sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
    });

    const destination = join(outputDir, exeName);
    renameSync(executable, destination);
    console.log(`Created ${destination}`);
  } finally {
    for (const file of [config, blob, executable, license, icon]) rmSync(file, { force: true });
    rmdirSync(staging);
  }
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
