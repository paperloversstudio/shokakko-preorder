"use client";

import { useActionState, useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { updateCustomerInfo, type PortalActionState } from "./actions";

const initialState: PortalActionState = {};

type AddressDefaults = {
  address1: string;
  address2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
};

/** One address block's six fields — deliberately a portal-local copy of
 * ../../../components/catalog/PreOrderFormFields.tsx's AddressFields,
 * not a reuse of it: that component has no defaultValue props (built
 * only for checkout's always-starts-empty flow) and always renders
 * Shipping Method, which this form intentionally omits (see the Sprint 5
 * plan's "Decisions"). Editing it to add defaults would touch checkout's
 * shared component for a need only this page has. */
function AddressFields({
  prefix,
  defaults,
  errors,
}: {
  prefix: "shipping" | "billing";
  defaults: AddressDefaults;
  errors: Record<string, string>;
}) {
  const name = (suffix: string) => `${prefix}${suffix}`;

  return (
    <>
      <Field label="Address 1" htmlFor={name("Address1")} error={errors[name("Address1")]}>
        <input id={name("Address1")} name={name("Address1")} defaultValue={defaults.address1} required className={inputClass} />
      </Field>
      <Field label="Address 2 (optional)" htmlFor={name("Address2")} error={errors[name("Address2")]}>
        <input id={name("Address2")} name={name("Address2")} defaultValue={defaults.address2} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Suburb" htmlFor={name("Suburb")} error={errors[name("Suburb")]}>
          <input id={name("Suburb")} name={name("Suburb")} defaultValue={defaults.suburb} required className={inputClass} />
        </Field>
        <Field label="State / Territory" htmlFor={name("State")} error={errors[name("State")]}>
          <input id={name("State")} name={name("State")} defaultValue={defaults.state} required className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Postcode" htmlFor={name("Postcode")} error={errors[name("Postcode")]}>
          <input id={name("Postcode")} name={name("Postcode")} defaultValue={defaults.postcode} required className={inputClass} />
        </Field>
        <Field label="Country" htmlFor={name("Country")} error={errors[name("Country")]}>
          <input id={name("Country")} name={name("Country")} defaultValue={defaults.country} required className={inputClass} />
        </Field>
      </div>
    </>
  );
}

export function CustomerInfoForm({
  token,
  defaults,
}: {
  token: string;
  defaults: {
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    shipping: AddressDefaults;
    billing: AddressDefaults | null; // null = was "same as shipping"
    notes: string;
  };
}) {
  const action = updateCustomerInfo.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [billingSame, setBillingSame] = useState(defaults.billing === null);
  const errors = state.fieldErrors ?? {};
  const billingDefaults = defaults.billing ?? {
    address1: "",
    address2: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "Australia",
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <h2 className="font-display font-bold">Customer Information</h2>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="customerFirstName" error={errors.customerFirstName}>
          <input
            id="customerFirstName"
            name="customerFirstName"
            defaultValue={defaults.customerFirstName}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Last name" htmlFor="customerLastName" error={errors.customerLastName}>
          <input
            id="customerLastName"
            name="customerLastName"
            defaultValue={defaults.customerLastName}
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
          defaultValue={defaults.customerEmail}
          required
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-5">
        <h3 className="-mb-1 text-sm font-bold text-ink">Shipping address</h3>
        <AddressFields prefix="shipping" defaults={defaults.shipping} errors={errors} />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          name="billingSameAsShipping"
          checked={billingSame}
          onChange={(e) => setBillingSame(e.target.checked)}
          className="h-4 w-4"
        />
        Billing address is the same as shipping
      </label>

      {!billingSame && (
        <div className="flex flex-col gap-5">
          <h3 className="-mb-1 text-sm font-bold text-ink">Billing address</h3>
          <AddressFields prefix="billing" defaults={billingDefaults} errors={errors} />
        </div>
      )}

      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes} className={inputClass} />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Changes"}
      </Button>
      {state.message && (
        <p role="status" className="rounded-2xl bg-mint/40 px-4 py-3 text-sm font-medium text-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
