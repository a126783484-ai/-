import { describe, expect, it } from "vitest";
import { getSettingsError, getSettingsMessage, readSettingsParam } from "./settings-feedback";

describe("settings feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getSettingsMessage("workspace_saved")).toContain("品牌色");
    expect(getSettingsMessage("settings_setup_hint")).toContain("營業規則");
    expect(getSettingsMessage("settings_setup_incomplete")).toContain("聯絡方式");
    expect(getSettingsError("settings_forbidden")).toContain("聯絡店主");
    expect(getSettingsError("settings_save_failed")).toContain("重新整理");
  });

  it("ignores array search params", () => {
    expect(readSettingsParam(["workspace_saved"])).toBeUndefined();
  });
});
