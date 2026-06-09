import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "El archivo debe ser una imagen" }, { status: 400 });
    }

    // Validar tamaño (ejemplo: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "La imagen excede el límite de 5MB" }, { status: 400 });
    }

    // Generar nombre de archivo único
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filename = `${timestamp}_${cleanFileName}`;

    // En Vercel/producción no se debe usar disco local porque no es persistente.
    if (process.env.NODE_ENV === "production") {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          {
            success: false,
            error: "Storage no configurado en producción. Define BLOB_READ_WRITE_TOKEN.",
          },
          { status: 500 },
        );
      }

      const blob = await put(`clientes/${filename}`, file, {
        access: "public",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        message: "Archivo subido correctamente",
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads");

    // Asegurar que el directorio existe
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    const imageUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      message: "Archivo subido correctamente",
    });
  } catch (error: unknown) {
    console.error("Error en la carga de archivo:", error);
    return NextResponse.json({ success: false, error: "Error interno al procesar la carga" }, { status: 500 });
  }
}
