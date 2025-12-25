export const paginate = <T>(items: T[], page: number, perPage: number) => {
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.floor(perPage));
  const totalPages = Math.max(1, Math.ceil(items.length / safePerPage));
  const start = (safePage - 1) * safePerPage;
  const end = start + safePerPage;
  return {
    items: items.slice(start, end),
    totalPages,
    page: Math.min(safePage, totalPages),
  };
};
