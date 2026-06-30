import type { CustomPlatformInput, PlatformValidationErrors } from "./types";

export function generatePlatformId(name: string): string {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Date.now().toString(36);
  return `custom-${sanitized || "platform"}-${suffix}`;
}

export function validateCustomPlatform(
  input: CustomPlatformInput,
  existingIds: string[],
  existingUrls: string[] = []
): PlatformValidationErrors {
  const errors: PlatformValidationErrors = {};

  if (!input.name || !input.name.trim()) {
    errors.name = "平台名称不能为空";
  }

  if (!input.url || !input.url.trim()) {
    errors.url = "URL 不能为空";
  } else {
    try {
      const parsed = new URL(input.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.url = "URL 必须使用 http 或 https 协议";
      } else if (existingUrls.some((u) => u === input.url.trim())) {
        errors.url = "该平台 URL 已被其他平台使用";
      }
    } catch {
      errors.url = "URL 格式无效";
    }
  }

  return errors;
}
