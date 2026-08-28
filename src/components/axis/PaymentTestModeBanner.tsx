import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-center text-xs text-warning">
      Payments are in test mode — no real money moves.
    </div>
  );
}
