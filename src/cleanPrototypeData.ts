// Remove known prototype samples once; keep records created in the workspace.
export function removePrototypeSamples() {
  const marker = 'procurement-samples-removed-v1';
  if (window.localStorage.getItem(marker)) return;
  const read = (key: string): Array<Record<string, unknown>> => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid procurement storage');
    return parsed;
  };
  const sampleRequests: Record<string, string> = {
    'PR-2026-1001': 'Smart Classroom Equipment Renewal',
    'PR-2026-1002': 'Academic Office Furniture and Supplies',
  };
  const sampleVendors = new Set(['education@powermaccenter.com', 'sales@lemfajarda.example', 'bids@officewarehouse.example']);
  const sampleProducts = new Set(['Bond Paper A4', 'Desktop Computer', 'Laptop Computer', 'Office Chair', 'Printer Ink', 'Projector', 'Tissue']);
  const sampleUsers: Record<string, string> = { 'USR-001': 'lem.fajarda@life.edu.ph', 'USR-002': 'angela.mendoza@life.edu.ph', 'USR-003': 'lea.santos@life.edu.ph', 'USR-004': 'joel.tan@life.edu.ph' };
  try {
    const requests = read('procurement-requests').filter((record) => {
      const source = String(record.sourceRequestId ?? record.id);
      return !record.demoStagePreview && !record.demoPoStagePreview && sampleRequests[source] !== record.title;
    });
    const vendors = read('procurement-vendors').filter((record) => !sampleVendors.has(String(record.email)));
    const products = read('procurement-products').filter((record) => !sampleProducts.has(String(record.name)));
    const users = read('procurement-user-assignments').filter((record) => sampleUsers[String(record.id)] !== record.email);
    for (const [key, records] of Object.entries({
      'procurement-requests': requests, 'procurement-vendors': vendors,
      'procurement-products': products, 'procurement-user-assignments': users,
    })) window.localStorage.setItem(key, JSON.stringify(records));
    window.localStorage.removeItem('procurement-data-version');
    window.localStorage.removeItem('procurement-two-lot-sample-version');
    window.sessionStorage.removeItem('procurement-guided-open-request');
    window.sessionStorage.removeItem('procurement-selected-request');
    window.localStorage.setItem(marker, 'true');
  } catch {
    // Leave saved data intact if it cannot be read safely.
  }
}
