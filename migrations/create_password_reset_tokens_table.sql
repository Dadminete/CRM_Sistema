-- Migration: Create password_reset_tokens table
-- Description: Table for storing password reset tokens

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
  usado BOOLEAN DEFAULT FALSE NOT NULL,
  usado_en TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS password_reset_tokens_usuario_id_idx ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expira_en_idx ON password_reset_tokens(expira_en);
CREATE INDEX IF NOT EXISTS password_reset_tokens_usado_idx ON password_reset_tokens(usado);

COMMENT ON TABLE password_reset_tokens IS 'Tokens para recuperación de contraseña';
COMMENT ON COLUMN password_reset_tokens.expira_en IS 'Fecha y hora de expiración del token (típicamente 1 hora después de creación)';
COMMENT ON COLUMN password_reset_tokens.usado IS 'Indica si el token ya fue utilizado';
