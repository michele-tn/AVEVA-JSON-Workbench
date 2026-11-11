import { createScanner } from "jsonc-parser";

export function encodeAvevaJson(input: string): string {
  const json = input.trim();
  JSON.parse(json);

  if (!json.startsWith("{") && !json.startsWith("[")) {
    throw new TypeError("AVEVA output expects a JSON object or array.");
  }

  const scanner = createScanner(json, true);
  const tokens: string[] = [];

  for (scanner.scan(); scanner.getTokenLength() > 0; scanner.scan()) {
    const start = scanner.getTokenOffset();
    tokens.push(json.slice(start, start + scanner.getTokenLength()));
  }

  return `"${tokens.join("").replaceAll('"', '""')}"`;
}
