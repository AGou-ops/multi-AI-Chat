import { decideNavigation } from "./navigation-policy";
import type { NavigablePlatform } from "./navigation-policy";

const platform: NavigablePlatform = {
  id: "gemini",
  url: "https://gemini.google.com/app",
  allowedAuthDomains: ["google.com"]
};

const chatgptPlatform: NavigablePlatform = {
  id: "chatgpt",
  url: "https://chatgpt.com",
  allowedAuthDomains: ["chatgpt.com", "auth.openai.com", "platform.openai.com"]
};

describe("平台导航策略", () => {
  it("同域导航留在应用内", () => {
    expect(decideNavigation(platform, "https://gemini.google.com/settings")).toEqual({
      action: "allow-in-app",
      reason: "same-domain"
    });
  });

  it("白名单登录域名留在应用内", () => {
    expect(decideNavigation(platform, "https://accounts.google.com/o/oauth2/v2/auth")).toEqual({
      action: "allow-in-app",
      reason: "allowed-auth-domain"
    });
  });

  it("任意 Google 子域都留在应用内", () => {
    expect(decideNavigation(platform, "https://mail.google.com")).toEqual({
      action: "allow-in-app",
      reason: "allowed-auth-domain"
    });
    expect(decideNavigation(platform, "https://google.com")).toEqual({
      action: "allow-in-app",
      reason: "allowed-auth-domain"
    });
  });

  it("ChatGPT 使用 Google 账号登录时留在应用内", () => {
    expect(decideNavigation(chatgptPlatform, "https://accounts.google.com/")).toEqual({
      action: "allow-in-app",
      reason: "allowed-auth-domain"
    });
  });

  it("ChatGPT 非登录 Google 子域仍用系统浏览器打开", () => {
    expect(decideNavigation(chatgptPlatform, "https://mail.google.com")).toEqual({
      action: "open-external",
      reason: "cross-domain"
    });
  });

  it("跨域非白名单链接用系统浏览器打开", () => {
    expect(decideNavigation(platform, "https://example.com/docs")).toEqual({
      action: "open-external",
      reason: "cross-domain"
    });
  });

  it("非法 URL 被拒绝", () => {
    expect(decideNavigation(platform, "not a url")).toEqual({
      action: "deny",
      reason: "invalid-url"
    });
  });

  it("非 http/https 协议被拒绝", () => {
    expect(decideNavigation(platform, "file:///Users/mingday/secret.txt")).toEqual({
      action: "deny",
      reason: "unsupported-protocol"
    });
  });
});
