import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const currency = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0
});

const taipeiTimeZone = "Asia/Taipei";

export function formatTime(date: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: taipeiTimeZone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: taipeiTimeZone,
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(new Date(date));
}

export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: taipeiTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}
