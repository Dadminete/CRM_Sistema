-- Quick fix: Grant superadmin permissions to current user

-- Create superadmin permission if it doesn't exist
INSERT INTO permisos (nombre_permiso, descripcion, categoria, activo, es_sistema)
VALUES ('superadmin', 'Acceso completo a todas las funcionalidades del sistema', 'system', true, true)
ON CONFLICT (nombre_permiso) DO NOTHING;

-- Assign superadmin permission to the user
INSERT INTO usuarios_permisos (usuario_id, permiso_id, activo)
SELECT 
  '14794b8f-cd71-4f2b-91c5-eafae9561994',
  p.id,
  true
FROM permisos p
WHERE p.nombre_permiso = 'superadmin'
ON CONFLICT DO NOTHING;

-- Alternatively, create and assign database permissions
INSERT INTO permisos (nombre_permiso, descripcion, categoria, activo)
VALUES 
  ('database:backup', 'Permite crear respaldos de la base de datos', 'database', true),
  ('database:restore', 'Permite restaurar respaldos de la base de datos', 'database', true),
  ('database:view', 'Permite ver la configuración de la base de datos', 'database', true),
  ('database:manage', 'Permite administrar la configuración de la base de datos', 'database', true)
ON CONFLICT (nombre_permiso) DO NOTHING;

-- Assign database permissions to the user
INSERT INTO usuarios_permisos (usuario_id, permiso_id, activo)
SELECT 
  '14794b8f-cd71-4f2b-91c5-eafae9561994',
  p.id,
  true
FROM permisos p
WHERE p.nombre_permiso IN ('database:backup', 'database:restore', 'database:view', 'database:manage')
ON CONFLICT DO NOTHING;

SELECT 'Permisos asignados exitosamente' as resultado;
