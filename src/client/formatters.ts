export function formatBaht(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'ยังไม่มีราคา';
  }
  return Math.round(value).toLocaleString('en-US');
}

export function formatArea(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(2);
}

export function formatPct(value: number | undefined, decimals = 2): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  return Number(value.toFixed(decimals)).toString();
}

export function formatTimeHHmm(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function parseNumericInput(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
