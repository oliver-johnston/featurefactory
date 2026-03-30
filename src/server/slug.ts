const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'in', 'on', 'of', 'is', 'it',
  'and', 'or', 'but', 'with', 'at', 'by', 'from', 'as', 'be',
  'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'shall', 'can', 'this', 'that', 'these', 'those',
  'not', 'no', 'so', 'if', 'then', 'than', 'when', 'where',
  'which', 'who', 'whom', 'what', 'how', 'its', 'my', 'your',
  'our', 'their', 'we', 'they', 'he', 'she', 'i', 'me', 'us',
])

const MAX_WORDS = 5
const MAX_LENGTH = 40

export function generateSlug(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(w => w && !STOP_WORDS.has(w))
    .slice(0, MAX_WORDS)

  let slug = words.join('-')

  if (slug.length > MAX_LENGTH) {
    slug = slug.slice(0, MAX_LENGTH).replace(/-[^-]*$/, '')
  }

  if (!slug) {
    slug = 'task'
  }

  console.log(`[slug] "${description}" -> "${slug}"`)
  return slug
}
