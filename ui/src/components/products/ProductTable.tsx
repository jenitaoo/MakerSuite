import ProductRow, { Product } from "./ProductRow";
import "../../index.css"

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
};

export default function ProductTable({ products, onEdit }: ProductTableProps) {
  return (
    <div className="product-table__wrapper">
      <table className="product-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Platforms</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="product-table__empty">
                No products found.
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <ProductRow key={p.id} product={p} onEdit={onEdit} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
