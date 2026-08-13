import { Field, inputClass } from "@/components/ui/Field";

const DEFAULT_COUNTRY = "Australia";

/** One address block's six fields (Address 1/2, Suburb, State/Territory,
 * Postcode, Country) — shared between the shipping and billing sections so
 * the two stay in sync rather than duplicating the same six <Field>s twice.
 * `prefix` becomes each input's `name` (e.g. "shippingSuburb"), matching
 * what submitPreOrder reads off the FormData. */
function AddressFields({
  prefix,
  errors,
}: {
  prefix: "shipping" | "billing";
  errors: Record<string, string>;
}) {
  const name = (suffix: string) => `${prefix}${suffix}`;

  return (
    <>
      <Field label="Address 1" htmlFor={name("Address1")} error={errors[name("Address1")]}>
        <input
          id={name("Address1")}
          name={name("Address1")}
          autoComplete={`${prefix} address-line1`}
          required
          className={inputClass}
        />
      </Field>
      <Field
        label="Address 2 (optional)"
        htmlFor={name("Address2")}
        error={errors[name("Address2")]}
      >
        <input
          id={name("Address2")}
          name={name("Address2")}
          autoComplete={`${prefix} address-line2`}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Suburb" htmlFor={name("Suburb")} error={errors[name("Suburb")]}>
          <input
            id={name("Suburb")}
            name={name("Suburb")}
            autoComplete={`${prefix} address-level2`}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="State / Territory"
          htmlFor={name("State")}
          error={errors[name("State")]}
        >
          <input
            id={name("State")}
            name={name("State")}
            autoComplete={`${prefix} address-level1`}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Postcode" htmlFor={name("Postcode")} error={errors[name("Postcode")]}>
          <input
            id={name("Postcode")}
            name={name("Postcode")}
            autoComplete={`${prefix} postal-code`}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Country" htmlFor={name("Country")} error={errors[name("Country")]}>
          <input
            id={name("Country")}
            name={name("Country")}
            autoComplete={`${prefix} country-name`}
            defaultValue={DEFAULT_COUNTRY}
            required
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
}

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
        <Field label="First name" htmlFor="customerFirstName" error={errors.customerFirstName}>
          <input
            id="customerFirstName"
            name="customerFirstName"
            autoComplete="given-name"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Last name" htmlFor="customerLastName" error={errors.customerLastName}>
          <input
            id="customerLastName"
            name="customerLastName"
            autoComplete="family-name"
            required
            className={inputClass}
          />
        </Field>
      </div>

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

      <div className="flex flex-col gap-5">
        <h3 className="-mb-1 text-sm font-bold text-ink">Shipping address</h3>
        <AddressFields prefix="shipping" errors={errors} />
      </div>

      <Field label="Shipping method" htmlFor="shippingMethod" error={errors.shippingMethod}>
        <select
          id="shippingMethod"
          name="shippingMethod"
          defaultValue="standard"
          required
          className={inputClass}
        >
          <option value="standard">Standard Shipping</option>
          <option value="express">Express Shipping</option>
        </select>
      </Field>

      <p className="px-1 text-sm text-ink-soft">
        Shipping fees may apply. Free shipping within Australia is available
        for orders over AUD $100. For details and international shipping
        rates, please refer to our{" "}
        <a
          href="https://www.shokakko.com.au/pages/shipping-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue hover:underline"
        >
          Shipping Policy
        </a>
        .
      </p>

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
        <div className="flex flex-col gap-5">
          <h3 className="-mb-1 text-sm font-bold text-ink">Billing address</h3>
          <AddressFields prefix="billing" errors={errors} />
        </div>
      )}

      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </Field>
    </>
  );
}
