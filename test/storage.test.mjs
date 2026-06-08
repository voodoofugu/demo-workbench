import assert from "node:assert/strict";
import test from "node:test";
import { parseStoredValue } from "../src/utils/storage.js";

test("parseStoredValue returns raw string values without JSON-parse exceptions", () => {
  assert.strictEqual(parseStoredValue(null), undefined);
  assert.strictEqual(parseStoredValue(undefined), undefined);
  assert.strictEqual(parseStoredValue("hello"), "hello");
  assert.strictEqual(parseStoredValue("42"), 42);
  assert.strictEqual(parseStoredValue("true"), true);
  assert.strictEqual(parseStoredValue("false"), false);
  assert.strictEqual(parseStoredValue("null"), null);
  assert.deepStrictEqual(parseStoredValue("[1,2,3]"), [1, 2, 3]);
  assert.deepStrictEqual(parseStoredValue('{"a":1}'), { a: 1 });
  assert.strictEqual(parseStoredValue("{invalid}"), "{invalid}");
});
