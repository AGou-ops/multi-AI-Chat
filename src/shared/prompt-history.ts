export type PromptRetentionPolicy =
  | { type: "forever" }
  | { type: "latest-count"; count: 50 | 200 }
  | { type: "latest-days"; days: 30 }
  | { type: "disabled" };

export interface PromptHistoryItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultPromptRetentionPolicy: PromptRetentionPolicy = { type: "forever" };

/**
 * 合并连续重复的 prompt 记录。
 * 假设 history 数组按从新到旧排序（index 0 为最新的记录），
 * 当相邻元素的 content 相同且连续时合并，仅保留最前面的那一条（即最新的那一条）。
 * 如果中间隔了其他的 prompt，则不算连续重复并予以保留。
 */
export function collapseConsecutivePrompts(history: PromptHistoryItem[]): PromptHistoryItem[] {
  const result: PromptHistoryItem[] = [];

  for (const item of history) {
    if (result.length === 0 || result[result.length - 1].content !== item.content) {
      result.push(item);
    }
  }

  return result;
}

/**
 * 将 ISO 时间戳或日期字符串格式化为 "年月日时分秒" 格式，例如 "2026年08月05日 14:30:15"。
 */
export function formatPromptTimestamp(dateString: string): string {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}
