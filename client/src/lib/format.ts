export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function formatWeight(value: number) {
  return `${Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 }).format(value)} kg`;
}

export function formatVolume(value: number) {
  return `${Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value)} kg`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Intl.NumberFormat('sv-SE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}`;
}
