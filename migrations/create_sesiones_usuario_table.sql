-- Create sesiones_usuario table for user authentication sessions
CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  fecha_inicio TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_ultimo_uso TIMESTAMPTZ(6) NOT NULL,
  fecha_expiracion TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT sesiones_usuario_usuario_id_fkey 
    FOREIGN KEY (usuario_id) 
    REFERENCES usuarios(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS sesiones_usuario_usuario_id_idx ON sesiones_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS sesiones_usuario_activa_idx ON sesiones_usuario(activa);
CREATE INDEX IF NOT EXISTS sesiones_usuario_fecha_expiracion_idx ON sesiones_usuario(fecha_expiracion);
CREATE INDEX IF NOT EXISTS sesiones_usuario_fecha_inicio_idx ON sesiones_usuario(fecha_inicio);

-- Add comment to table
COMMENT ON TABLE sesiones_usuario IS 'Almacena las sesiones activas de usuarios para autenticación';
