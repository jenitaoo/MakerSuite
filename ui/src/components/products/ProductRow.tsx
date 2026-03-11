export type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  channel: string; // e.g. "Etsy"
  link: string;
  imageUrl: string;
};

type ProductRowProps = {
  product: Product;
  onEdit: (product: Product) => void;
};

export default function ProductRow({ product, onEdit }: ProductRowProps) {
  return (
    <tr className="product-row">
      <td className="product-row__photo">
        <div className="product-row__photo-placeholder">
          <img src={product.imageUrl} alt={product.name} />
        </div>
      </td>
      <td className="product-row__name">{product.name}</td>
      <td className="product-row__price">€{product.price}</td>
      <td className="product-row__qty">{product.quantity}</td>
      <td className="product-row__channel">{product.channel}</td>
      <td className="product-row__link">
        <a href={product.link} target="_blank" rel="noreferrer">
          View
        </a>
      </td>
      <td className="product-row__edit">
        <button
          type="button"
          className="product-row__edit-button"
          onClick={() => onEdit(product)}
        >
          ✏️
        </button>
      </td>
    </tr>
  );
}
