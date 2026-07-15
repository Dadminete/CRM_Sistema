export type TransferMovementLike = {
  tipo?: string | null;
  categoriaId?: string | null;
  descripcion?: string | null;
  transferCategoryId?: string | null;
};

export function isTransferMovementRecord(input: TransferMovementLike) {
  const normalizedDescription = (input.descripcion ?? "").toLowerCase();
  const isTransferDescription =
    normalizedDescription.includes("traspaso") || normalizedDescription.includes("transferencia");

  if (isTransferDescription) {
    return true;
  }

  if (!input.transferCategoryId || !input.categoriaId) {
    return false;
  }

  return input.categoriaId === input.transferCategoryId;
}
