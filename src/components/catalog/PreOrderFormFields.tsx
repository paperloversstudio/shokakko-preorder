import { Field, inputClass } from "@/components/ui/Field";

/** The customer/shipping/billing/notes fields shared by the checkout form —
 * split out so the field markup + validation error wiring isn't duplicated
 * if another entry point needs the same form later. */
export function PreOrderFormFields({
  errors,
  billingSame,
  onBillingSameChange,
}: {
  errors: Record<string, string>;
  billingSame: boolean;
  onBillingSameChange: (same: boolean) => void;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="customerName" error={errors.customerName}>
          <input
            id="customerName"
            name="customerName"
            autoComplete="name"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Email" htmlFor="customerEmail" error={errors.customerEmail}>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Shipping address"
        htmlFor="shippingAddress"
        error={errors.shippingAddress}
      >
        <textarea
          id="shippingAddress"
          name="shippingAddress"
          autoComplete="shipping street-address"
          required
          rows={3}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          name="billingSameAsShipping"
          checked={billingSame}
          onChange={(e) => onBillingSameChange(e.target.checked)}
          className="h-4 w-4"
        />
        Billing address is the same as shipping
      </label>

      {!billingSame && (
        <Field
          label="Billing address"
          htmlFor="billingAddress"
          error={errors.billingAddress}
        >
          <textarea
            id="billingAddress"
            name="billingAddress"
            autoComplete="billing street-address"
            rows={3}
            className={inputClass}
          />
        </Field>
      )}

      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </Field>
    </>
  );
}
