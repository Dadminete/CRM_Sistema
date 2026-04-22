import { NextResponse } from "next/server";

/**
 * Convierte recursivamente valores BigInt a strings
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInt(item));
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

/**
 * Wrapper para NextResponse.json que automáticamente serializa BigInt
 */
export function jsonResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(serializeBigInt(data), init);
}
