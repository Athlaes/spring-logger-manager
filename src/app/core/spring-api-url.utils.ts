export function buildSpringUrl(baseUrl: string, ...segments: string[]): string {
  const normalizedBaseUrl = baseUrl.trim().endsWith('/') ? baseUrl.trim() : `${baseUrl.trim()}/`;
  const url = new URL(normalizedBaseUrl);
  const baseSegments = url.pathname.split('/').filter(Boolean);
  const nextSegments = segments.flatMap((segment) => segment.split('/')).filter(Boolean);

  url.pathname = `/${[...baseSegments, ...nextSegments].join('/')}`;
  url.search = '';
  url.hash = '';

  return url.toString();
}
