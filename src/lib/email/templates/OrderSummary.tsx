import { formatPrice } from "@/lib/validations/product";
import { getOrderItemOptions } from "@/lib/order-item-options";
import { emailBrand, emailFontFamily } from "../components/brand";

/**
 * The renderer for a `product_cards` section whose `data.source` is
 * `"order_items"` — the recipient's own order, not a marketing product
 * grid (see UpdateEmail.tsx's `ProductCard` grid for that). Shared by
 * Confirmation, Retrieve My Pre-order, and Reminder — any kind whose
 * template includes this section. Mirrors the order confirmation page's
 * own "Items" card (src/app/order/[orderNumber]/page.tsx).
 *
 * Each line shows the product name, then one line per
 * getOrderItemOptions() entry (e.g. "Design: Bear") — never a hardcoded
 * "Variant:" label, always driven by the snapshotted option data.
 */
export function OrderSummary({
  orderNumber,
  items,
  totalCents,
  hasUnknownPrice,
}: {
  orderNumber: string;
  items: {
    name: string;
    brand: string;
    quantity: number;
    unitPriceCents: number | null;
    variantName: string | null;
    variantGroupName: string | null;
  }[];
  totalCents: number;
  hasUnknownPrice: boolean;
}) {
  return (
    <tr>
      <td style={{ padding: "20px 32px 0" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: emailFontFamily,
            fontSize: 13,
            fontWeight: 700,
            color: emailBrand.ink,
            backgroundColor: emailBrand.mint,
            borderRadius: 999,
            padding: "6px 16px",
            marginBottom: 12,
          }}
        >
          Order {orderNumber}
        </div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {items.map((item, i) => {
              const options = getOrderItemOptions(item);
              return (
                <tr key={i}>
                  <td
                    style={{
                      padding: "10px 0",
                      borderTop: `1px solid ${emailBrand.line}`,
                      fontFamily: emailFontFamily,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: emailBrand.ink }}>
                      {item.name}
                    </div>
                    {options.map((option) => (
                      <div key={option.label} style={{ fontSize: 12, color: emailBrand.inkSoft }}>
                        {option.label}: {option.value}
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: emailBrand.inkSoft }}>{item.brand}</div>
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      borderTop: `1px solid ${emailBrand.line}`,
                      fontFamily: emailFontFamily,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: emailBrand.ink }}>
                      × {item.quantity}
                    </div>
                    <div style={{ fontSize: 12, color: emailBrand.inkSoft }}>
                      {formatPrice(item.unitPriceCents)}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td
                style={{
                  padding: "12px 0 4px",
                  borderTop: `2px solid ${emailBrand.ink}`,
                  fontFamily: emailFontFamily,
                  fontSize: 14,
                  fontWeight: 700,
                  color: emailBrand.ink,
                }}
              >
                Total
              </td>
              <td
                style={{
                  padding: "12px 0 4px",
                  borderTop: `2px solid ${emailBrand.ink}`,
                  fontFamily: emailFontFamily,
                  fontSize: 14,
                  fontWeight: 700,
                  color: emailBrand.ink,
                  textAlign: "right",
                }}
              >
                {formatPrice(totalCents)}
                {hasUnknownPrice && " + TBC"}
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
