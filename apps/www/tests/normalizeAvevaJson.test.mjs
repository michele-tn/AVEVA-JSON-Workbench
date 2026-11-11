import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAvevaJson } from "../src/lib/utils/encodeAvevaJson.ts";
import { normalizeAvevaJson } from "../src/lib/utils/normalizeAvevaJson.ts";

test("decodes the Wonderware sample and formats the five rows", () => {
  const input =
    '"[{""filter"":true,""editable"":false,""readOnly"":true},{""filter"":true,""editable"":false,""readOnly"":true},{""filter"":true,""editable"":false,""readOnly"":true},{""filter"":true,""editable"":false,""readOnly"":true},{""filter"":true,""editable"":true,""readOnly"":false,""wrapText"":true,""autoHeight"":true,""cellStyle"":{""whiteSpace"":""normal"",""lineHeight"":""16px""}}]"';
  const readOnly = { filter: true, editable: false, readOnly: true };
  const expected = [
    readOnly,
    readOnly,
    readOnly,
    readOnly,
    {
      filter: true,
      editable: true,
      readOnly: false,
      wrapText: true,
      autoHeight: true,
      cellStyle: { whiteSpace: "normal", lineHeight: "16px" },
    },
  ];

  assert.equal(normalizeAvevaJson(input), JSON.stringify(expected, null, 2));
  assert.equal(encodeAvevaJson(JSON.stringify(expected, null, 2)), input);
});

test("preserves escaped quotes, backslashes, empty strings and Unicode", () => {
  const value = { label: 'Valvola "A"\n°C', path: "C:\\temp\\dati", empty: "" };
  const rawJson = JSON.stringify(value);
  const wrapped = `"${rawJson.replaceAll('"', '""')}"`;

  assert.deepEqual(JSON.parse(normalizeAvevaJson(`\uFEFF ${wrapped}\r\n`)), value);
  assert.deepEqual(JSON.parse(normalizeAvevaJson(JSON.stringify(rawJson))), value);
});

test("accepts plain JSON and preserves numeric tokens in the normalized text", () => {
  assert.equal(
    normalizeAvevaJson('{"sequence":9007199254740993,"temperature":1e-3}'),
    '{\n  "sequence": 9007199254740993,\n  "temperature": 1e-3\n}'
  );
  assert.equal(normalizeAvevaJson('"[a label]"'), '"[a label]"');
  assert.equal(normalizeAvevaJson('{"empty":""}'), '{\n  "empty": ""\n}');
  assert.equal(normalizeAvevaJson("null"), "null");
});

test("rejects malformed data, including broken quote pairs", () => {
  for (const input of ["", '{"x":}', '"[{""x"":}]"', '"[{""x":1}]"', '{"x":1,}']) {
    assert.throws(() => normalizeAvevaJson(input), SyntaxError);
  }
});

test("encodes edited JSON without changing numeric tokens or string escapes", () => {
  const input = '{\n  "label": "Valvola \\"A\\" °C",\n  "sequence": 9007199254740993\n}';
  const encoded = encodeAvevaJson(input);
  assert.equal(normalizeAvevaJson(encoded), input);
  assert.equal(encodeAvevaJson("[ ]"), '"[]"');
});

test("rejects incomplete JSON and top-level primitives when encoding", () => {
  assert.throws(() => encodeAvevaJson('{"x":}'), SyntaxError);
  assert.throws(() => encodeAvevaJson(""), SyntaxError);
  assert.throws(() => encodeAvevaJson("true"), TypeError);
});
