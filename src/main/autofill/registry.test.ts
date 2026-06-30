import { describe, expect, it } from "vitest";
import { createAutofillRegistry } from "./registry";

describe("createAutofillRegistry", () => {
  it("注册了 ChatGPT 适配器", () => {
    const registry = createAutofillRegistry();

    expect(registry.has("chatgpt")).toBe(true);
    expect(registry.get("chatgpt")?.platformId).toBe("chatgpt");
  });
});
