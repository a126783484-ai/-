export function buildMissingOrderLineServiceMessage(missingServiceIds: string[]) {
  const uniqueMissingServiceIds = Array.from(new Set(missingServiceIds)).filter(Boolean);
  return uniqueMissingServiceIds.length
    ? `訂單明細中的服務不存在於目前工作區，請重新選擇：${uniqueMissingServiceIds.join("、")}`
    : "訂單明細中的服務不存在於目前工作區，請重新選擇。";
}
