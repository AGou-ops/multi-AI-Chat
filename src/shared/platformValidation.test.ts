import { validateCustomPlatform } from "./platformValidation";

describe("自定义平台验证", () => {
  it("名称为空时返回错误", () => {
    const errors = validateCustomPlatform({ name: "", url: "https://example.com" }, []);
    expect(errors.name).toBeDefined();
  });

  it("名称仅空白时返回错误", () => {
    const errors = validateCustomPlatform({ name: "   ", url: "https://example.com" }, []);
    expect(errors.name).toBeDefined();
  });

  it("URL 为空时返回错误", () => {
    const errors = validateCustomPlatform({ name: "Test", url: "" }, []);
    expect(errors.url).toBeDefined();
  });

  it("URL 非法时返回错误", () => {
    const errors = validateCustomPlatform({ name: "Test", url: "not-a-url" }, []);
    expect(errors.url).toBeDefined();
  });

  it("URL 非 http/https 时返回错误", () => {
    const errors = validateCustomPlatform({ name: "Test", url: "ftp://example.com" }, []);
    expect(errors.url).toBeDefined();
  });

  it("合法输入无错误", () => {
    const errors = validateCustomPlatform({ name: "My AI", url: "https://my-ai.example.com" }, []);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("URL 与已有平台重复时返回错误", () => {
    const existingUrls = ["https://chatgpt.com", "https://claude.ai"];
    const errors = validateCustomPlatform({ name: "My ChatGPT", url: "https://chatgpt.com" }, [], existingUrls);
    expect(errors.url).toBeDefined();
  });

  it("URL 不冲突时通过", () => {
    const existingUrls = ["https://chatgpt.com", "https://claude.ai"];
    const errors = validateCustomPlatform({ name: "Perplexity", url: "https://perplexity.ai" }, [], existingUrls);
    expect(errors.url).toBeUndefined();
  });
});
