/** First word of a full name, trimmed for greeting copy. */
export function firstNameFromFullName(full: string): string {
  const t = full.trim().split(/\s+/).filter(Boolean)[0] ?? ''
  if (!t) return ''
  const stripped = t.replace(/^[^A-Za-z]+/, '')
  return stripped || t
}
