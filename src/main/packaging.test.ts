import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("macOS 发布打包配置", () => {
  it("只收集编译输出，避免把 dist 下的历史制品再次打包", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      build: {
        files: string[];
      };
    };

    expect(packageJson.build.files).toEqual([
      "dist/main/**",
      "dist/preload/**",
      "dist/renderer/**"
    ]);
  });
});
