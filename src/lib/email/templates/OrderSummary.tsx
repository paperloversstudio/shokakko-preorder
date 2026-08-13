import { formatPrice } from "@/lib/validations/product";
import { emailBrand, emailFontFamily } from "../components/brand";

/**
 * Confirmation Email only — not part of the shared Design System (it's
 * not reused by Update or Reminder). Order number + itemized list + total,
 * mirroring the order confirmation page's own "Items" card
 * (src/app/order/[orderNumber]/page.tsx).
 */
export function OrderSummary({
  orderNumber,
  items,
  totalCents,
  hasUnknownPrice,
}: {
  orderNumber: string;
  items: { name: string; brand: string; quantity: number; unitPriceCents: number | null }[];
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
            {items.map((item, i) => (
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
            ))}
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
