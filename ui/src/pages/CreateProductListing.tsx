import { useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import toast from "react-hot-toast";
import { getCookie } from "../services/api";
import "../styles/editProductListing.css";

type InternalFields = {
  title: string;
  description: string;
  internal_price: string;
  internal_quantity: number;
  sku: string;
};

type EtsyFields = {
  tags: string[];
  materials: string[];
  who_made: string;
  when_made: string;
  listing_type: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
};



export default function CreateProductListing() {
  const navigate = useNavigate();
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

    // inside the component, after useState declarations:
    const blocker = useBlocker(isDirty && !saving);

    // handle the blocked navigation
    if (blocker.state === "blocked") {
        const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
        if (confirmed) {
            blocker.proceed();
        } else {
            blocker.reset();
        }
    }

  const [internal, setInternal] = useState<InternalFields>({
    title: "",
    description: "",
    internal_price: "",
    internal_quantity: 0,
    sku: "",
  });

  const [etsy, setEtsy] = useState<EtsyFields>({
    tags: [],
    materials: [],
    who_made: "i_did",
    when_made: "made_to_order",
    listing_type: "physical",
    should_auto_renew: true,
    is_taxable: true,
  });

  // mark form as dirty on any change
  const updateInternal = (patch: Partial<InternalFields>) => {
    setInternal((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const updateEtsy = (patch: Partial<EtsyFields>) => {
    setEtsy((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  // warn before leaving with unsaved changes
  const handleBack = () => navigate("/crosslist");

  const handleSave = async () => {
    if (!internal.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/products/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({
          title: internal.title,
          description: internal.description,
          internal_price: internal.internal_price || null,
          internal_quantity: internal.internal_quantity,
          sku: internal.sku || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setIsDirty(false);
      toast.success("Product created");

      // redirect to edit page so user can push to Etsy
      navigate(`/products/${data.id}/edit`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-product">
      <div className="edit-product__header">
        <button type="button" className="edit-product__back" onClick={handleBack}>
          ← Back
        </button>
        <h1 className="edit-product__title">
          {internal.title.trim() || "New Product"}
        </h1>
      </div>

      <div className="edit-product__editor">

        {/* internal fields */}
        <section className="edit-product__section">
          <h2 className="edit-product__section-title">Internal Fields</h2>
          <div className="edit-product__form">
            <label className="edit-product__label">
              Title
              <input
                className="edit-product__input"
                value={internal.title}
                placeholder="Product title"
                onChange={(e) => updateInternal({ title: e.target.value })}
              />
            </label>

            <label className="edit-product__label">
              Description
              <textarea
                className="edit-product__textarea"
                rows={6}
                value={internal.description}
                placeholder="Product description"
                onChange={(e) => updateInternal({ description: e.target.value })}
              />
            </label>

            <div className="edit-product__row">
              <label className="edit-product__label">
                Price (€)
                <input
                  className="edit-product__input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={internal.internal_price}
                  placeholder="0.00"
                  onChange={(e) => updateInternal({ internal_price: e.target.value })}
                />
              </label>

              <label className="edit-product__label">
                Quantity
                <input
                  className="edit-product__input"
                  type="number"
                  min="0"
                  value={internal.internal_quantity}
                  onChange={(e) =>
                    updateInternal({ internal_quantity: Number(e.target.value) })
                  }
                />
              </label>

              <label className="edit-product__label">
                SKU
                <input
                  className="edit-product__input"
                  value={internal.sku}
                  placeholder="e.g. WHI"
                  onChange={(e) => updateInternal({ sku: e.target.value })}
                />
              </label>
            </div>
          </div>
        </section>

        {/* etsy fields — optional */}
        <section className="edit-product__section">
          <h2 className="edit-product__section-title">
            Etsy Fields
            <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: "0.5rem" }}>
              optional — fill in if publishing to Etsy
            </span>
          </h2>
          <div className="edit-product__form">
            <label className="edit-product__label">
              Tags (comma separated)
              <input
                className="edit-product__input"
                value={etsy.tags.join(", ")}
                placeholder="e.g. Handmade, Jewellery, Gift"
                onChange={(e) =>
                  updateEtsy({
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
                placeholder="e.g. Seed Beads, Glass"
                onChange={(e) =>
                  updateEtsy({
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
                  onChange={(e) => updateEtsy({ who_made: e.target.value })}
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
                  onChange={(e) => updateEtsy({ when_made: e.target.value })}
                >
                  <option value="made_to_order">Made to order</option>
                  <option value="2020_2025">2020–2025</option>
                  <option value="2010_2019">2010–2019</option>
                  <option value="2000_2009">2000–2009</option>
                  <option value="before_2000">Before 2000</option>
                </select>
              </label>

              <label className="edit-product__label">
                Listing Type
                <select
                  className="edit-product__select"
                  value={etsy.listing_type}
                  onChange={(e) => updateEtsy({ listing_type: e.target.value })}
                >
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
              </label>
            </div>

            <div className="edit-product__row">
              <label className="edit-product__label edit-product__label--checkbox">
                <input
                  type="checkbox"
                  checked={etsy.should_auto_renew}
                  onChange={(e) => updateEtsy({ should_auto_renew: e.target.checked })}
                />
                Auto Renew
              </label>

              <label className="edit-product__label edit-product__label--checkbox">
                <input
                  type="checkbox"
                  checked={etsy.is_taxable}
                  onChange={(e) => updateEtsy({ is_taxable: e.target.checked })}
                />
                Taxable
              </label>
            </div>
          </div>
        </section>

        {/* actions */}
        <div className="edit-product__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleBack}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}