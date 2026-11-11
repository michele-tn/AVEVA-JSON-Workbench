const { copyFileSync, cpSync, mkdirSync } = require("node:fs");
const { dirname, join } = require("node:path");

const source = dirname(require.resolve("monaco-editor/package.json"));
const destination = join(__dirname, "../public/vendor/monaco");

mkdirSync(destination, { recursive: true });
cpSync(join(source, "min/vs"), join(destination, "vs"), { recursive: true });
for (const notice of ["LICENSE", "ThirdPartyNotices.txt"]) {
  copyFileSync(join(source, notice), join(destination, notice));
}
