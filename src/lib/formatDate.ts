export function formatDate(dateInput?: string | Date | null) {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
