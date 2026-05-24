import type { ShiftLeaveType } from "./types";

export const shiftLeaveTypes = [
  "work",
  "rest",
  "personal",
  "sick",
  "comp_time",
  "national_holiday",
  "annual",
] as const satisfies readonly ShiftLeaveType[];

export const shiftLeaveTypeLabels: Record<ShiftLeaveType, string> = {
  work: "工作",
  rest: "休息",
  personal: "事假",
  sick: "病假",
  comp_time: "補休",
  national_holiday: "國定假日",
  annual: "特休",
};

export const shiftLeaveTypeStyles: Record<
  ShiftLeaveType,
  {
    block: string;
    badge: string;
  }
> = {
  work: {
    block: "bg-plum text-white ring-plum/20",
    badge: "bg-plum/10 text-plum ring-plum/10",
  },
  rest: {
    block: "bg-amber text-plum ring-amber/30",
    badge: "bg-amber/25 text-plum ring-amber/20",
  },
  personal: {
    block: "bg-rose text-white ring-rose/20",
    badge: "bg-rose/15 text-rose ring-rose/20",
  },
  sick: {
    block: "bg-sage text-plum ring-sage/30",
    badge: "bg-sage/20 text-plum ring-sage/20",
  },
  comp_time: {
    block: "bg-sky-500 text-white ring-sky-300/40",
    badge: "bg-sky-500/10 text-sky-700 ring-sky-300/30",
  },
  national_holiday: {
    block: "bg-indigo-500 text-white ring-indigo-300/40",
    badge: "bg-indigo-500/10 text-indigo-700 ring-indigo-300/30",
  },
  annual: {
    block: "bg-emerald-500 text-white ring-emerald-300/40",
    badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-300/30",
  },
};

export function normalizeShiftLeaveType(value: string | null | undefined): ShiftLeaveType {
  return (shiftLeaveTypes as readonly string[]).includes(value ?? "") ? (value as ShiftLeaveType) : "work";
}

const legacyLeaveStartTimeMap: Record<Exclude<ShiftLeaveType, "work">, string> = {
  rest: "00:00",
  personal: "00:15",
  sick: "00:30",
  comp_time: "00:45",
  national_holiday: "01:00",
  annual: "01:15",
};

const legacyLeaveTypeByStartTime = Object.fromEntries(
  Object.entries(legacyLeaveStartTimeMap).map(([leaveType, startTime]) => [startTime, leaveType]),
) as Record<string, Exclude<ShiftLeaveType, "work">>;

export function encodeLegacyLeaveShiftTimes(leaveType: Exclude<ShiftLeaveType, "work">) {
  const startTime = legacyLeaveStartTimeMap[leaveType];
  return {
    startTime,
    endTime: "23:59",
  };
}

export function decodeLegacyLeaveShiftType(leave: boolean, startTime: string, leaveType?: string | null) {
  if (!leave) return "work" as ShiftLeaveType;
  if (leaveType) return normalizeShiftLeaveType(leaveType);
  return (legacyLeaveTypeByStartTime[startTime] ?? "rest") as ShiftLeaveType;
}

export function shiftSummary(leaveType: ShiftLeaveType, startTime: string, endTime: string) {
  if (leaveType === "work") {
    return `${startTime}–${endTime}`;
  }

  return `${shiftLeaveTypeLabels[leaveType]} ${startTime}–${endTime}`;
}
