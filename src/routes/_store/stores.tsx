import { createFileRoute } from "@tanstack/react-router";

import { StoreLocator } from "@/components/store/home/Sections";

export const Route = createFileRoute("/_store/stores")({
  head: () => ({
    meta: [
      { title: "Find a store | SOL" },
      {
        name: "description",
        content: "Visit the S.O.L store. Address, phone, hours and directions.",
      },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  return (
    <div className="pt-8">
      <h1 className="px-4 text-4xl uppercase sm:px-12 sm:text-5xl">Find a store</h1>
      <StoreLocator />
    </div>
  );
}
