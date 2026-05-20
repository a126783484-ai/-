'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { ServiceItem } from '@/lib/types';

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
          .from('service_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          setError(error.message);
        } else {
          setServices(data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load services right now.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Beauty OS · Services</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                服務項目管理
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                管理美甲、美睫、保養與加購服務，讓店家快速確認每個服務的名稱、說明與展示狀態。
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
              目前無法讀取服務項目。請稍後重試，或確認 Supabase 連線與資料表狀態。
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
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-600">Service</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">{service.name}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    已建立
                  </span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                  {service.description || '尚未填寫服務說明。建議補上適合客人理解的療程內容、時間或加購資訊。'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default ServicesPage;
