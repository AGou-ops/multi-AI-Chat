import { decidePermissionRequest } from "./permission-policy";

describe("平台权限策略", () => {
  it("常见敏感权限需要询问用户", () => {
    expect(decidePermissionRequest("media")).toEqual({
      action: "ask",
      reason: "sensitive-permission"
    });
    expect(decidePermissionRequest("notifications")).toEqual({
      action: "ask",
      reason: "sensitive-permission"
    });
    expect(decidePermissionRequest("clipboard-read")).toEqual({
      action: "ask",
      reason: "sensitive-permission"
    });
  });

  it("未知或高风险权限默认拒绝", () => {
    expect(decidePermissionRequest("unknown-permission")).toEqual({
      action: "deny",
      reason: "unsupported-permission"
    });
    expect(decidePermissionRequest("fullscreen")).toEqual({
      action: "deny",
      reason: "unsupported-permission"
    });
  });
});
