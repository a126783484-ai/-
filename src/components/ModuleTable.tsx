"use client";

import { useMemo, useState } from "react";
import { EmptyState, ErrorBanner, LoadingState } from "./ui";

export interface Column<T> { key: string; label: string; render: (row: T) => React.ReactNode; sortValue?: (row: T) => string | number; }

export function ModuleTable<T>({ rows, columns, searchPlaceholder, filterOptions = [], emptyTitle }: { rows: T[]; columns: Column<T>[]; searchPlaceholder: string; filterOptions?: string[]; emptyTitle: string; }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows
      .filter((row) => JSON.stringify(row).toLowerCase().includes(normalized))
      .filter((row) => filter === "全部" || JSON.stringify(row).includes(filter))
      .sort((a, b) => {
        const column = columns.find((item) => item.key === sortKey);
        const left = column?.sortValue?.(a) ?? "";
        const right = column?.sortValue?.(b) ?? "";
        return String(left).localeCompare(String(right), "zh-Hant", { numeric: true });
      });
  }, [columns, filter, query, rows, sortKey]);

  function confirmExport() {
    if (confirm("確定要匯出目前篩選結果？")) {
      setLoading(true);
      window.setTimeout(() => { setLoading(false); setError("Demo 模式不會真的下載檔案；接上 API 後可匯出 CSV。 "); }, 350);
    }
  }

  return <div className="space-y-3">
    <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
      <input className="mobile-tap rounded-2xl border border-champagne bg-white text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      <div className="flex gap-2 overflow-x-auto">
        {["全部", ...filterOptions].map((option) => <button key={option} onClick={() => setFilter(option)} className="mobile-tap rounded-2xl bg-champagne/70 text-sm font-semibold text-plum">{option}</button>)}
        <button onClick={confirmExport} className="mobile-tap rounded-2xl bg-plum text-sm font-semibold text-white">匯出</button>
      </div>
    </div>
    {loading && <LoadingState />}{error && <ErrorBanner message={error} />}
    {visibleRows.length === 0 ? <EmptyState title={emptyTitle} action="請調整搜尋、篩選條件，或建立第一筆資料。" /> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-champagne/70 text-plum"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3"><button className="font-bold" onClick={() => setSortKey(column.key)}>{column.label}</button></th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={index} className="border-t border-champagne/60">{columns.map((column) => <td key={column.key} className="px-4 py-4 align-top">{column.render(row)}</td>)}</tr>)}</tbody></table></div></div>}
  </div>;
}
