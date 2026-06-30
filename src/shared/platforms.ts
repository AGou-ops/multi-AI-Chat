export interface BuiltInPlatform {
  id: string;
  name: string;
  url: string;
  partition: string;
  allowedAuthDomains: string[];
}

export const builtInPlatforms: BuiltInPlatform[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com",
    partition: "persist:provider-chatgpt",
    allowedAuthDomains: ["chatgpt.com", "auth.openai.com", "platform.openai.com"]
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai",
    partition: "persist:provider-claude",
    allowedAuthDomains: ["claude.ai", "console.anthropic.com"]
  },
  {
    id: "gemini",
    name: "Gemini",
    url: "https://gemini.google.com",
    partition: "persist:provider-gemini",
    allowedAuthDomains: ["gemini.google.com", "google.com"]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    partition: "persist:provider-deepseek",
    allowedAuthDomains: ["chat.deepseek.com", "deepseek.com"]
  }
];

export const initialPlatform = builtInPlatforms[0];
