import { createFileRoute } from "@tanstack/react-router";

import { StaticPage } from "@/components/store/StaticPage";

export const Route = createFileRoute("/_store/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy | SOL" },
      { name: "description", content: "How S.O.L handles your personal data." },
    ],
  }),
  component: () => (
    <StaticPage
      title="Privacy policy"
      intro="Short version: we only keep what we need to get your order to you."
    >
      <h2>What we collect</h2>
      <ul>
        <li>Your name, email, mobile number and delivery address when you order.</li>
        <li>Your order history, saved addresses, cart and wishlist when you sign in.</li>
        <li>Messages you send through the contact form.</li>
      </ul>
      <h2>What we never collect</h2>
      <ul>
        <li>We never store card numbers, CVVs or UPI PINs.</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To process and deliver orders, answer your questions and improve the store. We do not sell
        your data.
      </p>
      <h2>Your choices</h2>
      <p>Ask us to update or delete your account data any time through the contact page.</p>
      <p className="text-sm text-muted-foreground">
        This is a starter policy. Have it reviewed before launch.
      </p>
    </StaticPage>
  ),
});
