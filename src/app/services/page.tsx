'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { ServiceItem } from '@/lib/types';

type ServiceRow = {
  id: string;
  workspace_id: string;
  category_id: string | null;
  name: string;
  price: number;
  duration_min: number;
  description: string | null;
  enabled: boolean;
  is_add_on: boolean;
  created_at: string;
};

const suggestedServiceGroups = [
  '凝膠美甲 / 造型設計',
  '卸甲 / 修型 / 基礎保養',
  '手足護理 / SPA 保養',
  '加購項目 / 升級服務',
];

function mapService(row: ServiceRow): ServiceItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id || undefined,
    category: row.is_add_on ? '加購服務' : '一般服務',
    name: row.name,
    price: row.price,
    durationMin: row.duration_min,
    description: row.description || '',
    enabled: row.enabled,
    addOn: row.is_add_on,
  };
}

const ServicesPage = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('services')
          .select('id, workspace_id, category_id, name, price, duration_min, description, enabled, is_add_on, created_at')
          .order('created_at', { ascending: false });
        if (error) {
          setError(error.message);
        } else {
          setServices(((data || []) as ServiceRow[]).map(mapService));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load services right now.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const servicesWithDescription = services.filter((service) => service.description?.trim()).length;
  const servicesNeedingDescription = Math.max(services.length - servicesWithDescription, 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Beauty OS · Services · 服務管理中心</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                服務項目管理
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                將美甲、美睫、手足保養與加購服務整理成可預約、可報價、可追蹤營收的服務清單。
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
            >
              新增服務項目
            </button>
          </div>
        </div>

        {!loading && !error ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">已建立服務</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{services.length}</p>
              <p className="mt-1 text-xs text-slate-500">可作為預約與結帳項目</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">說明完整度</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{servicesWithDescription}/{services.length || 0}</p>
              <p className="mt-1 text-xs text-slate-500">補齊文案可提升前台成交率</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">待補說明</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{servicesNeedingDescription}</p>
              <p className="mt-1 text-xs text-slate-500">建議補上時間與適合族群</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
            <h2 className="text-base font-semibold">服務資料載入失敗</h2>
            <p className="mt-2 text-sm leading-6">
              目前無法讀取服務項目。請稍後重試，或確認 Supabase 連線、RLS 權限與 services 資料表狀態。
            </p>
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-red-700">{error}</p>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm sm:p-10">
            <p className="text-sm font-medium text-rose-600">尚未建立服務</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">先新增一個招牌服務</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              例如：凝膠美甲、手足保養、卸甲加購、睫毛管理。服務建立後，店家就能在預約與營收流程中更清楚追蹤項目。
            </p>
            <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
              {suggestedServiceGroups.map((group) => (
                <div key={group} className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {group}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              建立第一個服務
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-600">{service.category}</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">{service.name}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {service.enabled ? '已啟用' : '未啟用'}
                  </span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  {service.description || '尚未填寫服務說明。建議補上適合客人理解的療程內容、時間或加購資訊。'}
                </p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span>{service.durationMin} 分鐘</span>
                  <span className="font-semibold">NT$ {service.price.toLocaleString('zh-TW')}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default ServicesPage;
