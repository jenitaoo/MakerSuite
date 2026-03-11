import ProductListingsPage from "../components/products/ProductListingsPage";
import "../styles/productListings.css";

export default function CrossListPage() {
  return (
    <div className="app-shell">
      <main className="app-shell__main">
        <ProductListingsPage />
      </main>
    </div>
  );
}
