type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  nextUrl?: string | null;
  prevUrl?: string | null;
};

export default function Pagination({
  page,
  pageSize,
  total,
  nextUrl = null,
  prevUrl = null,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={!prevUrl && page <= 1}>
        Previous
      </button>

      <span>
        Page {page} of {totalPages}
      </span>

      <button onClick={() => onPageChange(page + 1)} disabled={!nextUrl && page >= totalPages}>
        Next
      </button>
    </div>
  );
}