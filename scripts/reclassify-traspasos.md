# Plan de reclasificación de traspasos

Objetivo: mover movimientos que fueron registrados como `tipo = 'gasto'` (o `ingreso`) pero en realidad son traspasos, para que queden neutros y/o se inserten en la tabla `traspasos`.

## Pasos seguros
1. **Respaldo**: toma un snapshot/PITR antes de tocar datos.
2. **Identificar candidatos**: arma una lista de `movimientos_contables.id` que son traspasos. Ejemplos de criterios:
   - `descripcion ILIKE '%traspas%'` o referencias internas.
   - Categoría/código específica (ej. `categorias_cuentas.codigo IN ('TRASP', 'TRASPASO')` si existe).
   - Método de pago que siempre uses para traspasos (opcional).

   Ejemplo de consulta de apoyo:
   ```sql
   SELECT id, fecha, monto, descripcion, categoria_id, metodo, caja_id, bank_id
   FROM movimientos_contables
   WHERE tipo = 'gasto'
     AND (lower(descripcion) LIKE '%traspas%');
   ```

3. **Crear registros en `traspasos`** (si quieres trazabilidad completa). Adapta origen/destino según columnas disponibles en el movimiento. Ejemplo:
   ```sql
   INSERT INTO traspasos (
     numero_traspaso, fecha_traspaso, monto, concepto_traspaso,
     banco_origen_id, banco_destino_id, caja_origen_id, caja_destino_id,
     estado, observaciones, autorizado_por
   )
   SELECT
     concat('TR-', to_char(now(), 'YYYYMMDDHH24MISS'), '-', row_number() over()),
     fecha,
     monto,
     coalesce(descripcion, 'Traspaso migrado'),
     bank_id,
     NULL,            -- ajusta si conoces destino
     caja_id,
     NULL,            -- ajusta si conoces destino
     'completado',
     'Migrado desde movimientos_contables',
     usuario_id
   FROM movimientos_contables
   WHERE id IN (<IDS_A_RECLASIFICAR>);
   ```

4. **Neutralizar en movimientos**: marca como traspaso o elimínalos de gastos.
   ```sql
   UPDATE movimientos_contables
   SET tipo = 'traspaso', updated_at = now()
   WHERE id IN (<IDS_A_RECLASIFICAR>);
   ```

5. **Validar**:
   - Recalcular sumas de gastos/ingresos para confirmar que bajaron como se esperaba.
   - Verificar que los nuevos traspasos aparecen en los listados y no alteran totales.

6. **Registro**: guarda la lista de IDs migrados y los números de traspaso generados para auditoría.

## Notas
- Ajusta las columnas de destino (banco/caja) según tu caso. Si no conoces el destino, deja `NULL` y completa manualmente luego.
- Si prefieres no insertar en `traspasos`, basta con actualizar `tipo = 'traspaso'` en `movimientos_contables`; los endpoints ya los excluyen de gastos/ingresos.
- Ejecuta en una transacción si el motor/driver lo permite, para revertir rápido en caso de error.
