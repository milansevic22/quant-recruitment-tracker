const SLUG_MAX_LENGTH = 72;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

export function stableHash(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function createJobId(companyId: string, title: string, url: string): string {
  const base = slugify(`${companyId}-${title}`) || companyId;
  return `${base}-${stableHash(`${companyId}|${title}|${url}`)}`;
}
