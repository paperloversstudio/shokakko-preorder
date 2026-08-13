import type { ComponentProps } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FilterGroups } from "./FilterGroups";

export function FilterDrawer({
  open,
  onClose,
  ...groupProps
}: { open: boolean; onClose: () => void } & ComponentProps<typeof FilterGroups>) {
  return (
    <Drawer open={open} onClose={onClose} title="Filters" widthClassName="w-full sm:w-[380px]">
      <FilterGroups {...groupProps} />
    </Drawer>
  );
}
