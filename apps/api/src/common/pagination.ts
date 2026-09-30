/** Coerce HTTP query pagination to safe integers for Prisma skip/take. */
export function parsePagination(query?: { page?: unknown; pageSize?: unknown }, defaults?: { page?: number; pageSize?: number; maxPageSize?: number }) {
  const maxPageSize = defaults?.maxPageSize ?? 100;
  const page = Math.max(1, parseInt(String(query?.page ?? defaults?.page ?? 1), 10) || 1);
  const rawSize = parseInt(String(query?.pageSize ?? defaults?.pageSize ?? 25), 10) || defaults?.pageSize || 25;
  const pageSize = Math.min(maxPageSize, Math.max(1, rawSize));
  return { page, pageSize };
}
