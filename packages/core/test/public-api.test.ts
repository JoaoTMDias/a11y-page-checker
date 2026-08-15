import { describe, expect, it } from "vitest";

import { PageScanner, UrlSource } from "../src/index.ts";

describe("core public API", () => {
  it("exports the supported library classes", () => {
    expect(PageScanner).toBeTypeOf("function");
    expect(UrlSource).toBeTypeOf("function");
  });
});
