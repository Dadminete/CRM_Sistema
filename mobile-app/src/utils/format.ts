/**
 * Formatea un número como moneda dominicana (RD$)
 * Formato: RD$1,500.50
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "RD$0.00";
  
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "RD$0.00";

  return "RD$" + numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un número con separadores de miles y decimales sin el prefijo RD$
 */
export function formatNumber(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "0.00";
  
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "0.00";

  return numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
