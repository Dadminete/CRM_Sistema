const fs = require('fs');
let code = fs.readFileSync('c:/Back Sistema/Sistema_de_Gestion_v3.0/src/server/schema.prisma', 'utf8');

const enumsToAdd = `
enum EstadoVentaPapeleria {
  PENDIENTE
  COMPLETADA
  CANCELADA
  DEVUELTA
}

enum MetodoPagoPapeleria {
  EFECTIVO
  TARJETA
  TRANSFERENCIA
  CREDITO
  OTRO
}

enum TipoMovimientoInventario {
  ENTRADA_COMPRA
  SALIDA_VENTA
  AJUSTE_POSITIVO
  AJUSTE_NEGATIVO
  MERMA
  DEVOLUCION
}

enum EstadoCompraPapeleria {
  BORRADOR
  PENDIENTE
  PROCESADA
  CANCELADA
}
`;

if (!code.includes('enum EstadoVentaPapeleria')) {
  code += "\n" + enumsToAdd;
}

const productoPapeleriaMatch = /model ProductoPapeleria \{[\s\S]*?\n\s+@@map\("productos_papeleria"\)\n\}/;
if (productoPapeleriaMatch.test(code)) {
  let modelStr = code.match(productoPapeleriaMatch)[0];
  
  if (!modelStr.includes('aplicaImpuesto')) {
    const fieldsToAdd = `
  aplicaImpuesto         Boolean                  @default(false) @map("aplica_impuesto")
  tasaImpuesto           Decimal                  @default(0) @map("tasa_impuesto") @db.Decimal(5, 2)
  costoPromedio          Decimal                  @default(0) @map("costo_promedio") @db.Decimal(10, 2)
`;
    // Find what comes before the foreign keys or mapping. Usually category or similar fields. I'll add them at the bottom before @@map and relations
    modelStr = modelStr.replace(
      /(\s+@@map\("productos_papeleria"\))/,
      fieldsToAdd + '$1'
    );
  }
  
  if (!modelStr.includes('historialCostos HistorialCostoPapeleria[]')) {
    modelStr = modelStr.replace(
      /(\n\s+@@map\("productos_papeleria"\))/,
      `\n  historialCostos HistorialCostoPapeleria[]$1`
    );
  }
  
  code = code.replace(productoPapeleriaMatch, modelStr);
}

const historialModel = `
model HistorialCostoPapeleria {
  id               String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productoId       BigInt            @map("producto_id")
  costoAnterior    Decimal           @map("costo_anterior") @db.Decimal(10, 2)
  costoNuevo       Decimal           @map("costo_nuevo") @db.Decimal(10, 2)
  fechaCambio      DateTime          @default(now()) @map("fecha_cambio") @db.Timestamptz(6)
  usuarioId        String?           @map("usuario_id") @db.Uuid
  motivo           String?           @db.VarChar(100)
  
  producto         ProductoPapeleria @relation(fields: [productoId], references: [id])
  usuario          Usuario?          @relation(fields: [usuarioId], references: [id])

  @@index([productoId])
  @@index([fechaCambio])
  @@map("historial_costos_papeleria")
}
`;

if (!code.includes('model HistorialCostoPapeleria')) {
  code = code.replace(
    /(model ProductoPapeleria \{[\s\S]*?\n\s+@@map\("productos_papeleria"\)\n\})/,
    (match) => match + '\n' + historialModel
  );
}

code = code.replace(
  /tipoMovimiento\s+String\s+@map\("tipo_movimiento"\)\s+@db\.VarChar\(20\)/g,
  'tipoMovimiento TipoMovimientoInventario @map("tipo_movimiento")'
);

code = code.replace(
  /metodoPago\s+String\s+@map\("metodo_pago"\)\s+@db\.VarChar\(50\)/g,
  'metodoPago MetodoPagoPapeleria @default(EFECTIVO) @map("metodo_pago")'
);

code = code.replace(
  /estado\s+String\s+@default\("completada"\)\s+@db\.VarChar\(20\)/g,
  'estado EstadoVentaPapeleria @default(COMPLETADA)'
);

const detalleVentaMatch = /model DetalleVentaPapeleria \{[\s\S]*?\n\s+@@map\("detalles_venta_papeleria"\)\n\}/;
if (detalleVentaMatch.test(code)) {
  let detalleVentaStr = code.match(detalleVentaMatch)[0];
  if (!detalleVentaStr.includes('cantidadDevuelta')) {
    detalleVentaStr = detalleVentaStr.replace(
      /(\n\s+@@map\("detalles_venta_papeleria"\))/,
      `\n  lote             String?           @db.VarChar(50)\n  cantidadDevuelta Int               @default(0) @map("cantidad_devuelta")$1`
    );
    code = code.replace(detalleVentaMatch, detalleVentaStr);
  }
}

const compraPapeleriaMatch = /model CompraPapeleria \{[\s\S]*?\n\s+@@map\("compras_papeleria"\)\n\}/;
if (compraPapeleriaMatch.test(code)) {
    let compraPapeleriaStr = code.match(compraPapeleriaMatch)[0];
    compraPapeleriaStr = compraPapeleriaStr.replace(
      /estado\s+String\s+@default\("pendiente"\)\s+@db\.VarChar\(20\)/,
      'estado EstadoCompraPapeleria @default(PENDIENTE)'
    );
    code = code.replace(compraPapeleriaMatch, compraPapeleriaStr);
}

fs.writeFileSync('c:/Back Sistema/Sistema_de_Gestion_v3.0/src/server/schema.prisma', code);
console.log('Update successful');
