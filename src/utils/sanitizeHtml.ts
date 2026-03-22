import DOMPurify from 'dompurify';

/** Sanitize HTML from AI / CMS before rendering with dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
