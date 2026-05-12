type ClassValue = string | boolean | number | undefined | null | bigint;

export function cn(...classes: ClassValue[]): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');
}
