import { describe, expect, it } from "vitest";
import { getSettingsError, getSettingsMessage, readSettingsParam } from "./settings-feedback";

describe("settings feedback helpers", () => {
  it("maps success and error codes", () => {
    expect(getSettingsMessage("workspace_saved")).toContain("已儲存");
    expect(getSettingsMessage("settings_setup_hint")).toContain("服務");
    expect(getSettingsError("settings_forbidden")).toContain("沒有權限");
  });

  it("ignores array search params", () => {
    expect(readSettingsParam(["workspace_saved"])).toBeUndefined();
  });
});
