/**
 * Same-origin app paths only. Rejects protocol-relative URLs that browsers
 * treat as `//host` even when written as `/\\host`.
 */
export function getSafeInternalHref(href: string | null): string | null {
  if (!href || !href.startsWith('/')) {
    return null;
  }

  if (href.startsWith('//') || href.startsWith('/\\') || href.includes('\\')) {
    return null;
  }

  return href;
}
