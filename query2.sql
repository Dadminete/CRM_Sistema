SELECT id, caja_id, estado, fecha_apertura, usuario_id
FROM sesiones_caja
WHERE estado = 'abierta';
