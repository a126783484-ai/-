import { readFileSync } from 'fs';
import { join } from 'path';

export default function DashboardPage() {
  const htmlPath = join(process.cwd(), 'apps/status-dashboard/index.html');
  const html = readFileSync(htmlPath, 'utf-8');
  
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
