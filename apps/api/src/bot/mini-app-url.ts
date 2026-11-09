/** Mini App bazaviy URL'iga yo'l qo'shadi. */
export function miniAppUrl(base: string, path = ''): string {
  const trimmed = base.replace(/\/+$/, '');
  if (!path) return trimmed;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${trimmed}${suffix}`;
}

export function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}
