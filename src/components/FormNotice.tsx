type FormNoticeProps = {
  kind: "error" | "success";
  children: string;
};

export function FormNotice({ kind, children }: FormNoticeProps) {
  const className =
    kind === "error"
      ? "mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
      : "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700";

  return <div className={className}>{children}</div>;
}
