import { afterEach, expect, test, vi } from "vitest";

import {
  getStyleLoaderCssUrl,
  toStyleLoader,
} from "../src/utils/styleLoader";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("getStyleLoaderCssUrl joins prefix and name, appending .css once", () => {
  expect(getStyleLoaderCssUrl("/workbench-css/", "reset")).toBe(
    "/workbench-css/reset.css",
  );
  // Missing trailing slash on the prefix is handled.
  expect(getStyleLoaderCssUrl("/workbench-css", "reset")).toBe(
    "/workbench-css/reset.css",
  );
  // A name that already ends in .css isn't doubled; nested paths survive.
  expect(getStyleLoaderCssUrl("/workbench-css/", "examples/alpha.css")).toBe(
    "/workbench-css/examples/alpha.css",
  );
});

test("toStyleLoader: no loader resolves to a no-op", async () => {
  await expect(toStyleLoader()(("reset"))).resolves.toBeUndefined();
});

test("toStyleLoader: a string prefix fetches CSS text from the URL", async () => {
  const fetchMock = vi.fn(async () => new Response(".x{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const css = await toStyleLoader("/workbench-css/")("reset");

  expect(css).toBe(".x{}");
  expect(fetchMock).toHaveBeenCalledWith(
    "/workbench-css/reset.css",
    expect.objectContaining({ cache: "no-store" }),
  );
});

test("toStyleLoader: a string prefix rejects on a non-OK response", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));

  await expect(toStyleLoader("/workbench-css/")("missing")).rejects.toThrow(
    /missing/,
  );
});

test("toStyleLoader: a function loader is passed through untouched", async () => {
  const host = vi.fn(async (name: string) => `.host-${name}{}`);

  const css = await toStyleLoader(host)("reset");

  expect(host).toHaveBeenCalledWith("reset");
  expect(css).toBe(".host-reset{}");
});
