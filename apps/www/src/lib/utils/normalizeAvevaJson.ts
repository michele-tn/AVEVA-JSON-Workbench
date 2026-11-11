import { applyEdits, format } from "jsonc-parser";

function unwrapDoubledQuotes(input: string) {
  if (!input.startsWith('"') || !input.endsWith('"') || !input.includes('""')) return;

  let allQuotesPaired = true;
  const unwrapped = input.slice(1, -1).replace(/"{1,2}/g, quotes => {
    if (quotes.length === 1) allQuotesPaired = false;
    return '"';
  });

  if (allQuotesPaired) return unwrapped;
}

export function normalizeAvevaJson(input: string): string {
  let json = input.trim();
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value === "string" && /^[[{]/.test(value.trim())) {
      try {
        JSON.parse(value);
        json = value.trim();
      } catch {
        // A valid JSON string can contain text that only resembles an object or array.
      }
    }
  } catch (error) {
    const unwrapped = unwrapDoubledQuotes(json);
    if (unwrapped === undefined) throw error;
    json = unwrapped.trim();
    JSON.parse(json);
  }

  return applyEdits(json, format(json, undefined, { tabSize: 2, insertSpaces: true, eol: "\n" }));
}
