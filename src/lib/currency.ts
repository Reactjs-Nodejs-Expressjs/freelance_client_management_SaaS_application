export type Currency = "INR" | "USD";

export function formatCurrency(amount: number, currency: Currency = "INR"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function currencySymbol(currency: Currency = "INR"): string {
  return currency === "USD" ? "$" : "₹";
}