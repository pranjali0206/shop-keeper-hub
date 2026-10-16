import { createFileRoute } from "@tanstack/react-router";

import { StaticPage } from "@/components/store/StaticPage";

export const Route = createFileRoute("/_store/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use | SOL" },
      { name: "description", content: "Terms for shopping at S.O.L." },
    ],
  }),
  component: () => (
    <StaticPage title="Terms of use" intro="The rules for shopping with S.O.L.">
      <h2>Orders</h2>
      <p>
        An order is confirmed once we accept it. We may cancel orders if an item is out of stock or
        a price was listed incorrectly, and will refund any amount paid.
      </p>
      <h2>Prices</h2>
      <p>Prices are in Indian Rupees and include taxes. Shipping is shown at checkout.</p>
      <h2>Returns</h2>
      <p>See our shipping and returns policy for return windows and conditions.</p>
      <h2>Accounts</h2>
      <p>Keep your password safe. You are responsible for orders placed from your account.</p>
      <p className="text-sm text-muted-foreground">
        This is a starter version. Have it reviewed before launch.
      </p>
    </StaticPage>
  ),
});
