SELECT v.id, v.numero_venta, v.total, v.caja_id, v.movimiento_contable_id
FROM ventas_papeleria v
WHERE v.estado = 'CANCELADA';
