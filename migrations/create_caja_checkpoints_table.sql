-- Create audit checkpoints table
CREATE TABLE IF NOT EXISTS caja_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id),
  descripcion VARCHAR(255) NOT NULL,
  saldo_establecido NUMERIC(15, 2) NOT NULL,
  total_ingresos NUMERIC(15, 2) NOT NULL,
  total_gastos NUMERIC(15, 2) NOT NULL,
  cantidad_movimientos INTEGER NOT NULL,
  fecha_checkpoint TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  creado_por UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS caja_checkpoints_caja_id_idx ON caja_checkpoints(caja_id);
CREATE INDEX IF NOT EXISTS caja_checkpoints_fecha_checkpoint_idx ON caja_checkpoints(fecha_checkpoint);

-- Add comment to document the table
COMMENT ON TABLE caja_checkpoints IS 'Puntos de referencia de auditoría para balances de cajas. Sirve como baseline para detectar discrepancias.';
COMMENT ON COLUMN caja_checkpoints.saldo_establecido IS 'Balance oficial establecido en este checkpoint';
COMMENT ON COLUMN caja_checkpoints.total_ingresos IS 'Suma total de ingresos hasta este checkpoint';
COMMENT ON COLUMN caja_checkpoints.total_gastos IS 'Suma total de gastos hasta este checkpoint';
