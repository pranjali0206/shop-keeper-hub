// Payment module. Checkout calls collectPayment() once, after the order has been
// saved, and knows nothing else about how payment works.
//
// THIS IS A DEMO: nothing is charged and no card numbers or UPI IDs are ever
// collected or stored. The order is already saved with payment_status "demo".
//
// To go live with Razorpay, replace the body of collectPayment():
//   1. call a server function that creates a Razorpay order for `amount`
//      (key secret stays on the server),
//   2. open Razorpay Checkout with that order id,
//   3. send the payment id + signature to a server function that verifies the
//      signature and sets orders.payment_status = 'paid'.
// Checkout does not need to change.

export type PaymentMethod = "upi" | "card" | "cod";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm or any UPI app" },
  { value: "card", label: "Card", hint: "Debit or credit card" },
  { value: "cod", label: "Cash on delivery", hint: "Pay when your order arrives" },
];

export type PaymentRequest = {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
};

export type PaymentResult = { status: "demo" | "paid" | "pending" | "failed"; message: string };

export const IS_DEMO_PAYMENTS = true;

export async function collectPayment(request: PaymentRequest): Promise<PaymentResult> {
  if (request.method === "cod") {
    return { status: "pending", message: "Pay in cash when your order arrives." };
  }
  return {
    status: "demo",
    message: "Demo mode: no money was charged and no payment details were collected.",
  };
}
