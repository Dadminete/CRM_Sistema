export function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function calculatePendingBalanceFromPayments({
  montoOriginal,
  montoPendiente,
  payments,
}: {
  montoOriginal: unknown;
  montoPendiente?: unknown;
  payments?: Array<{ monto?: unknown }>;
}) {
  const original = toNumber(montoOriginal);
  const paymentTotal = (payments ?? []).reduce((sum, payment) => sum + toNumber(payment.monto), 0);

  if (paymentTotal > 0) {
    return Math.max(0, original - paymentTotal);
  }

  return Math.max(0, toNumber(montoPendiente));
}

export function calculateEstadoFromPending({
  montoOriginal,
  montoPendiente,
  payments,
}: {
  montoOriginal: unknown;
  montoPendiente?: unknown;
  payments?: Array<{ monto?: unknown }>;
}) {
  const pending = calculatePendingBalanceFromPayments({ montoOriginal, montoPendiente, payments });

  if (pending <= 0) return "pagada";
  if (pending < toNumber(montoOriginal)) return "parcial";
  return "pendiente";
}
