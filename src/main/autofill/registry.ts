import type { PlatformAutofillAdapter } from "./types";
import { builtInPlatforms } from "../../shared/platforms";
import { ChatGPTAdapter } from "./chatgpt-adapter";
import { ClaudeAdapter } from "./claude-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { DeepSeekAdapter } from "./deepseek-adapter";

export function createAutofillRegistry(): Map<string, PlatformAutofillAdapter> {
  const registry = new Map<string, PlatformAutofillAdapter>();

  const chatgpt = new ChatGPTAdapter();
  registry.set(chatgpt.platformId, chatgpt);

  const claude = new ClaudeAdapter();
  registry.set(claude.platformId, claude);

  const gemini = new GeminiAdapter();
  registry.set(gemini.platformId, gemini);

  const deepseek = new DeepSeekAdapter();
  registry.set(deepseek.platformId, deepseek);

  return registry;
}

export function getBuiltinAutoFillPlatformIds(): Set<string> {
  return new Set(builtInPlatforms.map((p) => p.id));
}
