"use client";

import { useMemo, useState } from "react";
import { EmptyState, LoadingState, NoticeBanner } from "./ui";

export interface Column<T> { key: string; label: string; render: (row: T) => React.ReactNode; sortValue?: (row: T) => string | number; }

export function ModuleTable<T>({ rows, columns, searchPlaceholder, filterOptions = [], emptyTitle }: { rows: T[]; columns: Column<T>[]; searchPlaceholder: string; filterOptions?: string[]; emptyTitle: string; }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
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

  function handleExport() {
    setLoading(true);
    setNotice("");
    window.setTimeout(() => {
      setLoading(false);
      setNotice(`目前已保留匯出入口，正式 CSV 匯出會接上後端 API。`);
    }, 350);
  }

  return <div className="space-y-3">
    <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
      <input className="mobile-tap rounded-2xl border border-champagne bg-white text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      <div className="flex gap-2 overflow-x-auto">
        {["全部", ...filterOptions].map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className="mobile-tap rounded-2xl bg-champagne/70 text-sm font-semibold text-plum">{option}</button>)}
        <button type="button" onClick={handleExport} className="mobile-tap rounded-2xl bg-plum text-sm font-semibold text-white">匯出 CSV</button>
      </div>
    </div>
    {loading && <LoadingState />}{notice ? <NoticeBanner message={notice} /> : null}
    {visibleRows.length === 0 ? <EmptyState title={emptyTitle} action="請調整搜尋、篩選條件，或建立第一筆資料。" /> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-champagne/70 text-plum"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3"><button className="font-bold" onClick={() => setSortKey(column.key)}>{column.label}</button></th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={index} className="border-t border-champagne/60">{columns.map((column) => <td key={column.key} className="px-4 py-4 align-top">{column.render(row)}</td>)}</tr>)}</tbody></table></div></div>}
  </div>;
}
