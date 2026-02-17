-- Migration: Create notificaciones table
-- Description: Table for storing user notifications

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'FACTURA', 'APROBACION', 'STOCK')),
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  enlace VARCHAR(255),
  metadata JSONB,
  leida BOOLEAN DEFAULT FALSE NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  fecha_leida TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS notificaciones_usuario_id_idx ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS notificaciones_leida_idx ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS notificaciones_fecha_creacion_idx ON notificaciones(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS notificaciones_tipo_idx ON notificaciones(tipo);

-- Composite index for common query pattern (unread notifications for a user)
CREATE INDEX IF NOT EXISTS notificaciones_usuario_leida_fecha_idx 
  ON notificaciones(usuario_id, leida, fecha_creacion DESC);

COMMENT ON TABLE notificaciones IS 'Notificaciones del sistema para usuarios';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: INFO, SUCCESS, WARNING, ERROR, FACTURA, APROBACION, STOCK';
COMMENT ON COLUMN notificaciones.metadata IS 'Datos adicionales en formato JSON para contexto de la notificación';
