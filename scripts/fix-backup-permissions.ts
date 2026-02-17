/**
 * Script para asignar permisos de backup al usuario actual
 */

import { db } from "../src/lib/db/index";
import { permisos, usuariosPermisos } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

const USER_ID = "14794b8f-cd71-4f2b-91c5-eafae9561994";

async function fixBackupPermissions() {
  try {
    console.log("🔧 Verificando y asignando permisos de backup...");

    // 1. Verificar si existe el permiso database:backup
    const [existingPermission] = await db
      .select()
      .from(permisos)
      .where(eq(permisos.nombrePermiso, "database:backup"))
      .limit(1);

    let permissionId: string;

    if (!existingPermission) {
      console.log("📝 Creando permiso database:backup...");
      const [newPermission] = await db
        .insert(permisos)
        .values({
          nombrePermiso: "database:backup",
          descripcion: "Permite crear respaldos de la base de datos",
          categoria: "database",
          activo: true,
        })
        .returning();
      permissionId = newPermission.id;
      console.log("✅ Permiso creado con ID:", permissionId);
    } else {
      permissionId = existingPermission.id;
      console.log("✅ Permiso ya existe con ID:", permissionId);
    }

    // 2. Verificar si el usuario ya tiene el permiso
    const [existingUserPermission] = await db
      .select()
      .from(usuariosPermisos)
      .where(
        and(
          eq(usuariosPermisos.usuarioId, USER_ID),
          eq(usuariosPermisos.permisoId, permissionId)
        )
      )
      .limit(1);

    if (existingUserPermission) {
      // Asegurarse de que esté activo
      if (!existingUserPermission.activo) {
        await db
          .update(usuariosPermisos)
          .set({ activo: true })
          .where(eq(usuariosPermisos.id, existingUserPermission.id));
        console.log("✅ Permiso activado para el usuario");
      } else {
        console.log("✅ Usuario ya tiene el permiso activo");
      }
    } else {
      console.log("📝 Asignando permiso al usuario...");
      await db.insert(usuariosPermisos).values({
        usuarioId: USER_ID,
        permisoId: permissionId,
        activo: true,
      });
      console.log("✅ Permiso asignado exitosamente");
    }

    // 3. Verificar permisos adicionales de database
    const databasePermissions = [
      {
        nombre: "database:restore",
        descripcion: "Permite restaurar respaldos de la base de datos",
      },
      {
        nombre: "database:view",
        descripcion: "Permite ver la configuración de la base de datos",
      },
      {
        nombre: "database:manage",
        descripcion: "Permite administrar la configuración de la base de datos",
      },
    ];

    for (const perm of databasePermissions) {
      const [existing] = await db
        .select()
        .from(permisos)
        .where(eq(permisos.nombrePermiso, perm.nombre))
        .limit(1);

      let pid: string;
      if (!existing) {
        const [newPerm] = await db
          .insert(permisos)
          .values({
            nombrePermiso: perm.nombre,
            descripcion: perm.descripcion,
            categoria: "database",
            activo: true,
          })
          .returning();
        pid = newPerm.id;
        console.log(`✅ Permiso ${perm.nombre} creado`);
      } else {
        pid = existing.id;
      }

      // Asignar al usuario si no lo tiene
      const [userHasPerm] = await db
        .select()
        .from(usuariosPermisos)
        .where(
          and(
            eq(usuariosPermisos.usuarioId, USER_ID),
            eq(usuariosPermisos.permisoId, pid)
          )
        )
        .limit(1);

      if (!userHasPerm) {
        await db.insert(usuariosPermisos).values({
          usuarioId: USER_ID,
          permisoId: pid,
          activo: true,
        });
        console.log(`✅ Permiso ${perm.nombre} asignado al usuario`);
      }
    }

    console.log("\n🎉 Todos los permisos de base de datos configurados correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixBackupPermissions();
