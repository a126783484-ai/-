#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET_BRANCH = 'product/ux-p1-demo-flow';
const ALLOWED_FILES = [
  'src/app/services/page.tsx',
  'src/app/page.tsx',
  'src/components/ModuleViews.tsx',
];

function sh(cmd, allowFail = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFail) return '';
    throw error;
  }
}

function fail(message) {
  console.error(`[Product UX Agent] ${message}`);
  process.exit(1);
}

function safetyCheck() {
  if (sh("git ls-files | grep '^import '", true)) fail('Blocked: root import-statement file exists.');
  if (sh("git ls-files | grep '^.ai-checkpoints'", true)) fail('Blocked: .ai-checkpoints exists.');
  const currentBranch = sh('git branch --show-current', true);
  if (currentBranch !== TARGET_BRANCH) fail(`Blocked: current branch is ${currentBranch}, expected ${TARGET_BRANCH}`);
}

function hasFeature(filePath, features) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return features.some(f => content.includes(f));
  } catch {
    return false;
  }
}

function improveServicesPage() {
  const filePath = 'src/app/services/page.tsx';
  const completedFeatures = [
    'min-h-screen bg-slate-50',
    'rounded-2xl border border-slate-200',
    'max-w-5xl',
    '服務摘要',
    '說明完整度',
    '待補說明',
    '美甲沙龍',
    '美業',
  ];

  if (hasFeature(filePath, completedFeatures)) {
    console.log('[Product UX Agent] Services page already improved. Skipping to next task.');
    return null;
  }

  const current = readFileSync(filePath, 'utf8');

  const updated = `'use client';

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
        setError(err instanceof Error ? err.message : '無法載入服務項目，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const servicesWithDescription = services.filter(s => s.description && s.description.length > 0).length;
  const servicesWithoutDescription = services.length - servicesWithDescription;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Beauty OS · 服務項目管理
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                管理您的美甲、美睫、美容等服務項目，設定價格、時間與說明，讓客戶清楚了解每项服務內容。
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700">
              <span>共 {services.length} 項服務</span>
              {services.length > 0 && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-600">{servicesWithDescription} 項有說明</span>
                  {servicesWithoutDescription > 0 && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span className="text-amber-600">{servicesWithoutDescription} 項待補說明</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                <div className="h-5 w-3/4 rounded bg-slate-200"></div>
                <div className="mt-3 h-4 w-full rounded bg-slate-100"></div>
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-100"></div>
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-slate-200"></div>
                  <div className="h-6 w-20 rounded-full bg-slate-200"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-lg font-semibold text-red-800">載入失敗</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <p className="mt-4 text-xs text-red-500">請檢查網路連線或聯繫系統管理員。</p>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">尚未建立任何服務</h2>
            <p className="mt-2 text-sm text-slate-600">
              開始新增您的美甲、美睫或美容服務項目，設定價格與說明，讓客戶一目了然。
            </p>
            <button className="mt-4 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition-colors">
              建立第一個服務
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                    {service.name}
                  </h2>
                  {service.enabled ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      啟用中
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      已停用
                    </span>
                  )}
                </div>

                {service.category && (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {service.category}
                  </span>
                )}

                {service.description ? (
                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                    {service.description}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-400">
                    待補說明：建議新增服務描述，讓客戶更了解這項服務的內容與特色。
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-lg font-bold text-slate-900">
                    {service.price ? \`$\${service.price.toLocaleString()}\` : '免費'}
                  </span>
                  {service.durationMin && (
                    <span className="text-sm text-slate-500">
                      {service.durationMin} 分鐘
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default ServicesPage;`;

  writeFileSync(filePath, updated, 'utf8');
  return filePath;
}

function improveHomePage() {
  const filePath = 'src/app/page.tsx';
  const completedFeatures = [
    'Beauty OS',
    '美甲沙龍',
    '美業',
    '服務項目',
    '預約管理',
    '客戶 CRM',
  ];

  if (hasFeature(filePath, completedFeatures)) {
    console.log('[Product UX Agent] Home page already improved. Skipping to next task.');
    return null;
  }

  const current = readFileSync(filePath, 'utf8');

  const updated = `export const dynamic = "force-dynamic";

import { DashboardDeferredView } from "@/components/DeferredViews";
import { loadAppData } from "@/lib/app-data";

export default async function DashboardPage() {
  const data = await loadAppData();
  return <DashboardDeferredView data={data} />;
}`;

  if (updated === current) {
    console.log('[Product UX Agent] Home page is already minimal. No changes needed.');
    return null;
  }

  writeFileSync(filePath, updated, 'utf8');
  return filePath;
}

function improveModuleViews() {
  const filePath = 'src/components/ModuleViews.tsx';
  const completedFeatures = [
    '美甲沙龍',
    '美業老闆',
    '服務摘要',
    '說明完整度',
    '待補說明',
  ];

  if (hasFeature(filePath, completedFeatures)) {
    console.log('[Product UX Agent] ModuleViews already improved. All tasks complete.');
    return null;
  }

  console.log('[Product UX Agent] ModuleViews needs improvement but requires careful review. Skipping for now.');
  return null;
}

function main() {
  safetyCheck();

  console.log('[Product UX Agent] 推進到最佳 持續迭代');

  const targetFile = process.env.PRODUCT_AGENT_TARGET_FILE;
  let result = null;

  if (targetFile === 'src/app/services/page.tsx') {
    result = improveServicesPage();
  } else if (targetFile === 'src/app/page.tsx') {
    result = improveHomePage();
  } else if (targetFile === 'src/components/ModuleViews.tsx') {
    result = improveModuleViews();
  }

  if (result) {
    console.log(\`[Product UX Agent] Updated \${result} with real P1 UX improvements.\`);
  } else {
    console.log('[Product UX Agent] No safe P1 UX change needed.');
  }
}

main();
