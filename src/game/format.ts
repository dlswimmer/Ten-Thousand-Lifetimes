const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 10) return n.toFixed(n < 1 && n > 0 ? 2 : 1).replace(/\.0$/, '');
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const v = n / Math.pow(1000, tier);
    return (v < 100 ? v.toFixed(2) : v.toFixed(1)) + SUFFIXES[tier];
  }
  return n.toExponential(2).replace('+', '');
}

export function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
