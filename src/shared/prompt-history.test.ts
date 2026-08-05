import { describe, expect, it } from "vitest";
import { collapseConsecutivePrompts, formatPromptTimestamp, type PromptHistoryItem } from "./prompt-history";

describe("collapseConsecutivePrompts", () => {
  it("合并连续重复的 prompt 记录，保留最顶部（最新）的记录", () => {
    const items: PromptHistoryItem[] = [
      { id: "1", content: "iOS的隐根和无根越狱有什么区别？", createdAt: "2026-08-05T14:03:00.000Z", updatedAt: "2026-08-05T14:03:00.000Z" },
      { id: "2", content: "iOS的隐根和无根越狱有什么区别？", createdAt: "2026-08-05T14:02:00.000Z", updatedAt: "2026-08-05T14:02:00.000Z" },
      { id: "3", content: "iOS的隐根和无根越狱有什么区别？", createdAt: "2026-08-05T14:01:00.000Z", updatedAt: "2026-08-05T14:01:00.000Z" },
      { id: "4", content: "英文缩写 tho 什么意思", createdAt: "2026-08-05T13:59:00.000Z", updatedAt: "2026-08-05T13:59:00.000Z" },
      { id: "5", content: "英文缩写 tho 什么意思", createdAt: "2026-08-05T13:58:00.000Z", updatedAt: "2026-08-05T13:58:00.000Z" }
    ];

    const result = collapseConsecutivePrompts(items);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[0].content).toBe("iOS的隐根和无根越狱有什么区别？");
    expect(result[1].id).toBe("4");
    expect(result[1].content).toBe("英文缩写 tho 什么意思");
  });

  it("当相同 prompt 被隔开时，不判定为连续重复并予以保留", () => {
    const items: PromptHistoryItem[] = [
      { id: "1", content: "iOS的隐根和无根越狱有什么区别？", createdAt: "2026-08-05T14:03:00.000Z", updatedAt: "2026-08-05T14:03:00.000Z" },
      { id: "2", content: "英文缩写 tho 什么意思", createdAt: "2026-08-05T14:02:00.000Z", updatedAt: "2026-08-05T14:02:00.000Z" },
      { id: "3", content: "iOS的隐根和无根越狱有什么区别？", createdAt: "2026-08-05T14:01:00.000Z", updatedAt: "2026-08-05T14:01:00.000Z" }
    ];

    const result = collapseConsecutivePrompts(items);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });
});

describe("formatPromptTimestamp", () => {
  it("将 ISO 时间戳格式化为 '年月日时分秒' 格式", () => {
    const isoDate = "2026-08-05T14:30:15.000Z";
    const dateObj = new Date(isoDate);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");

    const expected = `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;

    expect(formatPromptTimestamp(isoDate)).toBe(expected);
  });

  it("当输入为空或无效日期时妥善处理", () => {
    expect(formatPromptTimestamp("")).toBe("");
    expect(formatPromptTimestamp("invalid-date")).toBe("invalid-date");
  });
});
