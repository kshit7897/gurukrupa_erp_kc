export function formatNumber(n: number, decimals = 2) {
  try {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(n);
  } catch (e) {
    return n.toFixed(decimals);
  }
}

const ALT_MAP: Record<string, { target: string; factor: number }> = {
  KG: { target: 'TON', factor: 1000 },
  G: { target: 'KG', factor: 1000 },
  ML: { target: 'LTR', factor: 1000 },
  LTR: { target: 'KL', factor: 1000 },
  MTR: { target: 'KM', factor: 1000 },
};

export function formatStockWithAlternate(qty: number | string | undefined, unit?: string) {
  const q = Number(qty || 0);
  const u = (unit || '').toString().trim().toUpperCase();
  const base = `${formatNumber(q, q % 1 === 0 ? 0 : 2)} ${u || ''}`.trim();
  if (!u) return base;
  const alt = ALT_MAP[u];
  if (!alt) return base;
  const converted = q / alt.factor;
  const convertedStr = `${formatNumber(converted, converted % 1 === 0 ? 0 : 2)} ${alt.target}`;
  return `${base} (${convertedStr})`;
}

export function getAlternateUnit(q: number | string | undefined, unit?: string) {
  const u = (unit || '').toString().trim().toUpperCase();
  const alt = ALT_MAP[u];
  if (!alt) return null;
  const converted = Number(q || 0) / alt.factor;
  return { value: converted, unit: alt.target };
}
