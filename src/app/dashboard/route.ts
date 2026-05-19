import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const htmlPath = join(process.cwd(), 'apps/status-dashboard/index.html');
  const html = readFileSync(htmlPath, 'utf-8');
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
