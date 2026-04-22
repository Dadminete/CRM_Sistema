/**
 * Script para crear permisos necesarios para el módulo de Planes
 */

import { db } from "../src/lib/db";
import { permisos, modulosPermisos } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function createPlanesPermissions() {
  console.log("🚀 Creando permisos para módulo de Planes...\n");

  try {
    // Lista de permisos necesarios
    const permissionsToCreate = [
      {
        nombrePermiso: "planes:leer",
        descripcion: "Ver y listar planes de internet",
        modulo: "Planes",
      },
      {
        nombrePermiso: "planes:crear",
        descripcion: "Crear nuevos planes de internet",
        modulo: "Planes",
      },
      {
        nombrePermiso: "planes:editar",
        descripcion: "Editar planes de internet existentes",
        modulo: "Planes",
      },
      {
        nombrePermiso: "planes:eliminar",
        descripcion: "Eliminar planes de internet",
        modulo: "Planes",
      },
    ];

    for (const permiso of permissionsToCreate) {
      // Verificar si ya existe
      const existing = await db
        .select()
        .from(permisos)
        .where(eq(permisos.nombrePermiso, permiso.nombrePermiso))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  ${permiso.nombrePermiso} ya existe`);
        continue;
      }

      // Crear el permiso
      const [created] = await db
        .insert(permisos)
        .values({
          nombrePermiso: permiso.nombrePermiso,
          descripcion: permiso.descripcion,
          activo: true,
        })
        .returning();

      console.log(`✅ Creado: ${permiso.nombrePermiso} (ID: ${created.id})`);

      // Asociar con el módulo si existe
      const modulos = await db
        .select()
        .from(modulosPermisos)
        .where(eq(modulosPermisos.nombre, permiso.modulo))
        .limit(1);

      if (modulos.length > 0) {
        console.log(`   📦 Asociado al módulo: ${permiso.modulo}`);
      } else {
        console.log(`   ⚠️  Módulo '${permiso.modulo}' no encontrado`);
      }
    }

    console.log("\n✨ Permisos creados exitosamente");
    console.log("\n⚠️  IMPORTANTE: Debes asignar estos permisos a los roles correspondientes");
    console.log("   Puedes hacerlo desde: /dashboard/roles");
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Ejecutar
createPlanesPermissions()
  .then(() => {
    console.log("\n🎉 Script completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Error fatal:", error);
    process.exit(1);
  });
