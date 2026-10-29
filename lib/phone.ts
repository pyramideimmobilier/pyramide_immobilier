export function normalizePhoneKey(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = `213${digits.slice(1)}`;
  return digits.length >= 8 ? digits : undefined;
}

export function buildPhoneKeys(...phones: Array<string | undefined | null>): string[] {
  return [...new Set(phones.map(normalizePhoneKey).filter((value): value is string => Boolean(value)))];
}

export function phoneSearchVariants(phone: string): string[] {
  const key = normalizePhoneKey(phone);
  if (!key) return [];
  const variants = [key, `+${key}`];
  if (key.startsWith("213")) variants.push(`0${key.slice(3)}`);
  return [...new Set(variants)];
}
