/**
 * Note for Product, to wire to ExternalProductListing later:
 * - imageUrl: from ExternalProductListing's image_url
 * - platform: from ExternalProductListing's platform
 * - link: from ExternalProductListing's listing_url
 * Currently these are not in the Product API, so we show placeholders in ProductRow and
 * will add them later when we have ExternalProductListing data available.
 */

export type Product = {
  id: number;
  owner: number;
  image_url?: string | null;
  title: string;
  description?: string | null;
  sku?: string | null;
  platform?: string | null;
  internal_price: string;
  internal_quantity: number;
  created_at: string;
  updated_at: string;
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
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="product-row__photo-image" />
          ) : (
            <div className="product-row__photo-empty">No image</div>
          )}
        </div>
      </td>
      <td className="product-row__name">{product.title}</td>
      <td className="product-row__price">€{product.internal_price}</td>
      <td className="product-row__qty">{product.internal_quantity}</td>
      <td className="product-row__platform">{product.platform ?? "MakerSuite Only"}</td>
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