const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { readFile, writeFile } = require("node:fs/promises");
const { basename } = require("node:path");

async function writeChecksum(archive, guide) {
  if (!archive) throw new Error("Pass the path to the release archive.");
  const hash = createHash("sha3-256");
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  const digest = hash.digest("hex");
  await writeFile(`${archive}.sha3-256`, `${digest}  ${basename(archive)}\n`);
  if (guide) {
    const html = await readFile(guide, "utf8");
    const marker = /<meta name="release-checksum" content="(?:[a-f0-9]{64})?">/;
    if (!marker.test(html)) throw new Error("The guide is missing its release checksum metadata.");
    await writeFile(guide, html.replace(marker, `<meta name="release-checksum" content="${digest}">`));
  }
}

writeChecksum(process.argv[2], process.argv[3]).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
