-- Script para crear permisos del módulo de Planes
-- Ejecutar en PostgreSQL

-- Insertar permisos básicos de planes
INSERT INTO permisos (nombre_permiso, descripcion, activo, es_sistema)
VALUES 
  ('planes:leer', 'Ver y listar planes de internet', true, false),
  ('planes:crear', 'Crear nuevos planes de internet', true, false),
  ('planes:editar', 'Editar planes de internet existentes', true, false),
  ('planes:eliminar', 'Eliminar planes de internet', true, false)
ON CONFLICT (nombre_permiso) DO NOTHING;

-- Verificar que se crearon
SELECT id, nombre_permiso, descripcion, activo 
FROM permisos 
WHERE nombre_permiso LIKE 'planes:%'
ORDER BY nombre_permiso;

-- OPCIONAL: Asignar todos los permisos de planes al rol de administrador
-- (Reemplaza 'ID_DEL_ROL_ADMIN' con el ID real del rol administrador)
-- Primero obtén el ID del rol Admin:
-- SELECT id, nombre_rol FROM roles WHERE nombre_rol LIKE '%Admin%';

-- Luego ejecuta esto (reemplaza el UUID):
-- INSERT INTO roles_permisos (rol_id, permiso_id, activo)
-- SELECT 
--   'ID_DEL_ROL_ADMIN'::uuid,
--   p.id,
--   true
-- FROM permisos p
-- WHERE p.nombre_permiso LIKE 'planes:%'
-- ON CONFLICT (rol_id, permiso_id) DO UPDATE SET activo = true;
