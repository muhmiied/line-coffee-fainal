import { CheckoutForm } from "@/features/website/checkout/CheckoutForm";

// Route entry only. All checkout state + logic lives in the CheckoutForm client
// component, split into AddressSection / PaymentSection / PromoSection /
// OrderSummary under src/features/website/checkout/.
export default function CheckoutPage() {
  return <CheckoutForm />;
}
