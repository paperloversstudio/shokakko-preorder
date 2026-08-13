import type { ComponentProps } from "react";
import { FilterGroups } from "./FilterGroups";

export function FilterSidebar(props: ComponentProps<typeof FilterGroups>) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-card bg-white p-5 shadow-sm shadow-ink/5">
        <h2 className="mb-4 font-display text-lg font-bold">Filters</h2>
        <FilterGroups {...props} />
      </div>
    </aside>
  );
}
