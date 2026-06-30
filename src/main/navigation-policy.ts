export type NavigationAction = "allow-in-app" | "open-external" | "deny";

export interface NavigationDecision {
  action: NavigationAction;
  reason: "same-domain" | "allowed-auth-domain" | "cross-domain" | "invalid-url" | "unsupported-protocol";
}

export interface NavigablePlatform {
  id: string;
  url: string;
  allowedAuthDomains: string[];
}

const globalAllowedAuthDomains = ["accounts.google.com"];

export function decideNavigation(platform: NavigablePlatform, targetUrl: string): NavigationDecision {
  const platformUrl = parseHttpUrl(platform.url);
  const parsedTarget = parseUrl(targetUrl);

  if (!parsedTarget) {
    return { action: "deny", reason: "invalid-url" };
  }

  if (!isHttpProtocol(parsedTarget)) {
    return { action: "deny", reason: "unsupported-protocol" };
  }

  if (!platformUrl) {
    return { action: "deny", reason: "invalid-url" };
  }

  if (isHostOrSubdomain(parsedTarget.hostname, platformUrl.hostname)) {
    return { action: "allow-in-app", reason: "same-domain" };
  }

  if (isAllowedAuthDomain(parsedTarget.hostname, platform.allowedAuthDomains)) {
    return { action: "allow-in-app", reason: "allowed-auth-domain" };
  }

  return { action: "open-external", reason: "cross-domain" };
}

function isAllowedAuthDomain(hostname: string, allowedAuthDomains: string[]): boolean {
  return [...allowedAuthDomains, ...globalAllowedAuthDomains].some((domain) => isHostOrSubdomain(hostname, domain));
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function parseHttpUrl(value: string): URL | null {
  const parsed = parseUrl(value);

  if (!parsed || !isHttpProtocol(parsed)) {
    return null;
  }

  return parsed;
}

function isHttpProtocol(url: URL): boolean {
  return url.protocol === "https:" || url.protocol === "http:";
}

function isHostOrSubdomain(hostname: string, domain: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  const normalizedDomain = domain.toLowerCase();

  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}
