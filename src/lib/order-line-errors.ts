export function buildMissingOrderLineServiceMessage(missingServiceIds: string[]) {
  return `訂單明細中的服務不存在於目前工作區，請重新選擇：${missingServiceIds.join("、")}`;
}
