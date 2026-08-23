export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function normalizePhone(value?: string | null): string | null {
  if (!value?.trim()) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits || null;
}
