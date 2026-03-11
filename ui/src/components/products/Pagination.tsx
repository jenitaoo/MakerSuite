type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5);

  return (
    <div className="pagination">
      <div className="pagination__info">
        {total > 0
          ? `Showing ${start}-${end} of ${total} products`
          : "No products"}
      </div>

      <div className="pagination__controls">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          &lt; Prev
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? "pagination__page--active" : ""}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
}
