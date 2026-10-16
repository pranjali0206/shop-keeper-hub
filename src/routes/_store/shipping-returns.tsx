import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { StaticPage } from "@/components/store/StaticPage";
import { settingsQuery } from "@/lib/data";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_store/shipping-returns")({
  head: () => ({
    meta: [
      { title: "Shipping and returns | SOL" },
      { name: "description", content: "Delivery times, shipping fees and easy returns at S.O.L." },
    ],
  }),
  component: ShippingReturns,
});

function ShippingReturns() {
  const { data: s } = useQuery(settingsQuery);
  const min = formatINR(s?.free_shipping_min ?? 999);
  const fee = formatINR(s?.shipping_fee ?? 79);
  const days = s?.return_days ?? 7;
  return (
    <StaticPage
      title="Shipping and returns"
      intro={`Free shipping above ${min}. Returns within ${days} days.`}
    >
      <h2>Shipping</h2>
      <ul>
        <li>
          Orders of {min} and above ship free. Below that, shipping is {fee}.
        </li>
        <li>
          Most orders arrive in 2 to 7 days depending on your pincode. Check yours on any product
          page.
        </li>
        <li>Cash on delivery is available on most pincodes when enabled at checkout.</li>
      </ul>
      <h2>Returns and exchanges</h2>
      <ul>
        <li>Return or exchange within {days} days of delivery.</li>
        <li>Items must be unworn, unwashed and have their tags on.</li>
        <li>Party Pack items can be exchanged for a different size.</li>
        <li>Start a return by messaging us on WhatsApp with your order number.</li>
      </ul>
    </StaticPage>
  );
}
