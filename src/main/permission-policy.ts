export type PermissionDecisionAction = "ask" | "deny";

export interface PermissionDecision {
  action: PermissionDecisionAction;
  reason: "sensitive-permission" | "unsupported-permission";
}

const ASKABLE_PERMISSIONS = new Set(["media", "notifications", "clipboard-read", "display-capture"]);

export function decidePermissionRequest(permission: string): PermissionDecision {
  if (ASKABLE_PERMISSIONS.has(permission)) {
    return {
      action: "ask",
      reason: "sensitive-permission"
    };
  }

  return {
    action: "deny",
    reason: "unsupported-permission"
  };
}
