import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useProductWithListings, ExternalListing, EtsyRaw } from "../hooks/useProductWithListings";
import { getCookie } from "../services/api";
import "../styles/editProductListing.css";

type EtsyEditableFields = {
  title: string;
  description: string;
  tags: string[];
  materials: string[];
  who_made: string;
  when_made: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
  listing_type: string;
};

type InternalEditableFields = {
  title: string;
  description: string;
  internal_price: string;
  internal_quantity: number;
  sku: string;
};

export default function EditProductListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, externalListings, loading, error, refetch } = useProductWithListings(id);

  const etsyListing: ExternalListing | undefined = externalListings.find(
    (l) => l.platform === "Etsy"
  );
  const raw: EtsyRaw | undefined = etsyListing?.raw;

  const [internal, setInternal] = useState<InternalEditableFields | null>(null);
  const [etsy, setEtsy] = useState<EtsyEditableFields | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (product && !internal) {
    setInternal({
      title: product.title,
      description: product.description ?? "",
      internal_price: product.internal_price,
      internal_quantity: product.internal_quantity,
      sku: product.sku ?? "",
    });
  }

  if (raw && !etsy) {
    setEtsy({
      title: raw.title,
      description: raw.description,
      tags: raw.tags ?? [],
      materials: raw.materials ?? [],
      who_made: raw.who_made,
      when_made: raw.when_made,
      should_auto_renew: raw.should_auto_renew,
      is_taxable: raw.is_taxable,
      listing_type: raw.listing_type,
    });
  }

  const images = raw?.images?.sort((a, b) => a.rank - b.rank) ?? [];

  const handleSaveInternally = async () => {
    if (!internal || !id) return;
    await toast.promise(
      fetch(`/api/products/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({
          title: internal.title,
          description: internal.description,
          internal_price: internal.internal_price,
          internal_quantity: internal.internal_quantity,
          sku: internal.sku,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
      }),
      {
        loading: "Saving internally...",
        success: "Saved to database",
        error: "Failed to save internally",
      }
    );
  };

  const handleSaveToEtsy = async () => {
    if (!id) return;
    await toast.promise(
      fetch(`/api/products/${id}/push-to-etsy/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
      }),
      {
        loading: "Saving Changes to Etsy...",
        success: "Saved to Etsy",
        error: "Failed to save changes to Etsy",
      }
    );
    refetch();
  };

  const handleSaveToAll = async () => {
    await handleSaveInternally();
    await handleSaveToEtsy();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !etsyListing) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("rank", "1");

    setUploadingImage(true);
    await toast.promise(
      fetch(`/api/etsy/shops/${etsyListing.raw.shop_id}/listings/${etsyListing.platform_listing_id}/images/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded to Etsy",
        error: "Failed to upload image",
      }
    ).finally(() => setUploadingImage(false));
  };

  if (loading) return <div className="edit-product__loading">Loading...</div>;
  if (error || !product || !internal || !etsy) {
    return <div className="edit-product__error">{error ?? "Product not found"}</div>;
  }

  return (
    <div className="edit-product">
      <div className="edit-product__header">
        <button
          type="button"
          className="edit-product__back"
          onClick={() => previewOpen ? setPreviewOpen(false) : navigate("/crosslist")}
        >
          ← {previewOpen ? "Back to Editor" : "Back"}
        </button>
        <h1 className="edit-product__title">{product.title}</h1>
      </div>

      {!previewOpen && (
        <div className="edit-product__editor">
          <div className="edit-product__connections">
            <span className="edit-product__connections-label">Connections</span>
            <div className="edit-product__tabs">
              <button
                type="button"
                className="edit-product__tab edit-product__tab--active"
                onClick={() => setPreviewOpen(true)}
              >
                Etsy
              </button>
              <button type="button" className="edit-product__tab" disabled>
                Shopify (coming soon)
              </button>
            </div>
          </div>

          <section className="edit-product__section">
            <h2 className="edit-product__section-title">Product Photos</h2>
            {images.length > 0 ? (
              <div className="edit-product__gallery">
                <img
                  className="edit-product__gallery-main"
                  src={images[selectedImage]["url_570xN"]}
                  alt={images[selectedImage]?.alt_text ?? product.title}
                />
                <div className="edit-product__gallery-thumbs">
                  {images.map((img, i) => (
                    <img
                      key={img.listing_image_id}
                      src={img["url_570xN"]}
                      alt={img.alt_text ?? `Photo ${i + 1}`}
                      className={`edit-product__gallery-thumb ${
                        i === selectedImage ? "edit-product__gallery-thumb--active" : ""
                      }`}
                      onClick={() => setSelectedImage(i)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="edit-product__no-image">No photos available</div>
            )}

            {/* image upload */}
            <div className="edit-product__upload">
              <label className="edit-product__upload-label">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="edit-product__upload-input"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage ? "Uploading..." : "Upload New Photo"}
              </label>
            </div>
          </section>

          <section className="edit-product__section">
            <h2 className="edit-product__section-title">Product Details</h2>
            <div className="edit-product__form">
              <label className="edit-product__label">
                Title
                <input
                  className="edit-product__input"
                  value={etsy.title}
                  onChange={(e) => setEtsy({ ...etsy, title: e.target.value })}
                />
              </label>
              <label className="edit-product__label">
                Description
                <textarea
                  className="edit-product__textarea"
                  rows={8}
                  value={etsy.description}
                  onChange={(e) => setEtsy({ ...etsy, description: e.target.value })}
                />
              </label>
              <label className="edit-product__label">
                Tags (comma separated)
                <input
                  className="edit-product__input"
                  value={etsy.tags.join(", ")}
                  onChange={(e) =>
                    setEtsy({
                      ...etsy,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="edit-product__label">
                Materials (comma separated)
                <input
                  className="edit-product__input"
                  value={etsy.materials.join(", ")}
                  onChange={(e) =>
                    setEtsy({
                      ...etsy,
                      materials: e.target.value.split(",").map((m) => m.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <div className="edit-product__row">
                <label className="edit-product__label">
                  Who Made
                  <select
                    className="edit-product__select"
                    value={etsy.who_made}
                    onChange={(e) => setEtsy({ ...etsy, who_made: e.target.value })}
                  >
                    <option value="i_did">I did</option>
                    <option value="someone_else">Someone else</option>
                    <option value="collective">A collective</option>
                  </select>
                </label>
                <label className="edit-product__label">
                  When Made
                  <select
                    className="edit-product__select"
                    value={etsy.when_made}
                    onChange={(e) => setEtsy({ ...etsy, when_made: e.target.value })}
                  >
                    <option value="made_to_order">Made to order</option>
                    <option value="2020_2025">2020–2025</option>
                    <option value="2010_2019">2010–2019</option>
                    <option value="2000_2009">2000–2009</option>
                    <option value="before_2000">Before 2000</option>
                  </select>
                </label>
              </div>
              <div className="edit-product__row">
                <label className="edit-product__label">
                  Listing Type
                  <select
                    className="edit-product__select"
                    value={etsy.listing_type}
                    onChange={(e) => setEtsy({ ...etsy, listing_type: e.target.value })}
                  >
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                  </select>
                </label>
                <label className="edit-product__label edit-product__label--checkbox">
                  <input
                    type="checkbox"
                    checked={etsy.should_auto_renew}
                    onChange={(e) => setEtsy({ ...etsy, should_auto_renew: e.target.checked })}
                  />
                  Auto Renew
                </label>
                <label className="edit-product__label edit-product__label--checkbox">
                  <input
                    type="checkbox"
                    checked={etsy.is_taxable}
                    onChange={(e) => setEtsy({ ...etsy, is_taxable: e.target.checked })}
                  />
                  Taxable
                </label>
              </div>
              <div className="edit-product__divider">Internal Fields</div>
              <div className="edit-product__row">
                <label className="edit-product__label">
                  Internal Price (€)
                  <input
                    className="edit-product__input"
                    type="number"
                    step="0.01"
                    value={internal.internal_price}
                    onChange={(e) => setInternal({ ...internal, internal_price: e.target.value })}
                  />
                </label>
                <label className="edit-product__label">
                  Internal Quantity
                  <input
                    className="edit-product__input"
                    type="number"
                    value={internal.internal_quantity}
                    onChange={(e) =>
                      setInternal({ ...internal, internal_quantity: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="edit-product__label">
                  SKU
                  <input
                    className="edit-product__input"
                    value={internal.sku}
                    onChange={(e) => setInternal({ ...internal, sku: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </section>

          <div className="edit-product__actions">
            <button type="button" className="btn btn--secondary" onClick={handleSaveInternally}>
              Save Internally
            </button>
            <button type="button" className="btn btn--secondary" onClick={handleSaveToEtsy}>
              Save To Etsy
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSaveToAll}>
              Save To All
            </button>
            <button type="button" className="btn btn--secondary" disabled>
              Save To Shopify
            </button>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="edit-product__preview">
          <div className="edit-product__preview-header">
            <span className="edit-product__preview-label">Etsy Preview</span>
            {raw?.url && (
              <a
                href={raw.url}
                target="_blank"
                rel="noreferrer"
                className="edit-product__preview-link"
              >
                View on Etsy ↗
              </a>
            )}
          </div>
          {images.length > 0 && (
            <img
              className="edit-product__preview-image"
              src={images[0]["url_570xN"]}
              alt={product.title}
            />
          )}
          <div className="edit-product__preview-details">
            <h2 className="edit-product__preview-title">{raw?.title}</h2>
            <div className="edit-product__preview-price">
              {raw?.price
                ? `${(raw.price.amount / raw.price.divisor).toFixed(2)} ${raw.price.currency_code}`
                : "—"}
            </div>
            <div className="edit-product__preview-meta">
              <span>{raw?.views} views</span>
              <span>{raw?.num_favorers} favourites</span>
              <span>{raw?.quantity} in stock</span>
            </div>
            <div className="edit-product__preview-section-title">Tags</div>
            <div className="edit-product__preview-tags">
              {raw?.tags?.map((tag) => (
                <span key={tag} className="edit-product__preview-tag">{tag}</span>
              ))}
            </div>
            <div className="edit-product__preview-section-title">Materials</div>
            <div className="edit-product__preview-tags">
              {raw?.materials?.map((m) => (
                <span key={m} className="edit-product__preview-tag">{m}</span>
              ))}
            </div>
            <div className="edit-product__preview-section-title">Description</div>
            <p className="edit-product__preview-description">{raw?.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}