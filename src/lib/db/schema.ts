import {
  pgTable,
  index,
  foreignKey,
  bigserial,
  uuid,
  varchar,
  text,
  jsonb,
  inet,
  integer,
  timestamp,
  numeric,
  boolean,
  bigint,
  date,
  uniqueIndex,
  char,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categoriaCliente = pgEnum("CategoriaCliente", ["NUEVO", "VIEJO", "VIP", "INACTIVO"]);
export const sexo = pgEnum("Sexo", ["MASCULINO", "FEMENINO", "OTRO"]);

export const bitacora = pgTable(
  "bitacora",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    usuarioId: uuid("usuario_id"),
    sesionId: uuid("sesion_id"),
    accion: varchar({ length: 100 }).notNull(),
    tablaAfectada: varchar("tabla_afectada", { length: 100 }),
    registroAfectadoId: text("registro_afectado_id"),
    detallesAnteriores: jsonb("detalles_anteriores"),
    detallesNuevos: jsonb("detalles_nuevos"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    metodo: varchar({ length: 10 }),
    ruta: varchar({ length: 255 }),
    resultado: varchar({ length: 20 }).default("exitoso").notNull(),
    mensajeError: text("mensaje_error"),
    duracionMs: integer("duracion_ms"),
    fechaHora: timestamp("fecha_hora", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("bitacora_accion_idx").using("btree", table.accion.asc().nullsLast().op("text_ops")),
    index("bitacora_fecha_hora_idx").using("btree", table.fechaHora.asc().nullsLast().op("timestamptz_ops")),
    index("bitacora_metodo_idx").using("btree", table.metodo.asc().nullsLast().op("text_ops")),
    index("bitacora_sesion_id_idx").using("btree", table.sesionId.asc().nullsLast().op("uuid_ops")),
    index("bitacora_tabla_afectada_idx").using("btree", table.tablaAfectada.asc().nullsLast().op("text_ops")),
    index("bitacora_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "bitacora_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const cargos = pgTable("cargos", {
  idCargo: bigserial("id_cargo", { mode: "bigint" }).primaryKey().notNull(),
  nombreCargo: varchar("nombre_cargo", { length: 100 }).notNull(),
  descripcion: text(),
  salarioMinimo: numeric("salario_minimo", { precision: 10, scale: 2 }),
  salarioMaximo: numeric("salario_maximo", { precision: 10, scale: 2 }),
  nivelCargo: integer("nivel_cargo"),
  activo: boolean().default(true).notNull(),
  fechaCreacion: timestamp("fecha_creacion", { precision: 6, withTimezone: true, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const comisiones = pgTable(
  "comisiones",
  {
    idComision: bigserial("id_comision", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idTipoComision: bigint("id_tipo_comision", { mode: "number" }).notNull(),
    periodoAño: integer("periodo_año").notNull(),
    periodoMes: integer("periodo_mes").notNull(),
    montoBase: numeric("monto_base", { precision: 12, scale: 2 }).notNull(),
    porcentajeAplicado: numeric("porcentaje_aplicado", { precision: 5, scale: 2 }).notNull(),
    montoComision: numeric("monto_comision", { precision: 10, scale: 2 }).notNull(),
    descripcion: text(),
    fechaGeneracion: date("fecha_generacion")
      .default(sql`CURRENT_DATE`)
      .notNull(),
    estado: varchar({ length: 20 }).default("PENDIENTE").notNull(),
    fechaPago: date("fecha_pago"),
    observaciones: text(),
  },
  (table) => [
    index("comisiones_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    index("comisiones_id_tipo_comision_idx").using("btree", table.idTipoComision.asc().nullsLast().op("int8_ops")),
    index("comisiones_periodo_año_periodo_mes_idx").using(
      "btree",
      table.periodoAño.asc().nullsLast().op("int4_ops"),
      table.periodoMes.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "comisiones_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.idTipoComision],
      foreignColumns: [tiposComision.idTipoComision],
      name: "comisiones_id_tipo_comision_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const detallesVentaPapeleria = pgTable(
  "detalles_venta_papeleria",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ventaId: uuid("venta_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    productoId: bigint("producto_id", { mode: "number" }).notNull(),
    nombreProducto: varchar("nombre_producto", { length: 200 }),
    cantidad: integer().notNull(),
    precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
    impuesto: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    descuento: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("detalles_venta_papeleria_producto_id_idx").using("btree", table.productoId.asc().nullsLast().op("int8_ops")),
    index("detalles_venta_papeleria_venta_id_idx").using("btree", table.ventaId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.productoId],
      foreignColumns: [productosPapeleria.id],
      name: "detalles_venta_papeleria_producto_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.ventaId],
      foreignColumns: [ventasPapeleria.id],
      name: "detalles_venta_papeleria_venta_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const departamentos = pgTable("departamentos", {
  idDepartamento: bigserial("id_departamento", { mode: "bigint" }).primaryKey().notNull(),
  nombreDepartamento: varchar("nombre_departamento", { length: 100 }).notNull(),
  descripcion: text(),
  activo: boolean().default(true).notNull(),
  fechaCreacion: timestamp("fecha_creacion", { precision: 6, withTimezone: true, mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  fechaModificacion: timestamp("fecha_modificacion", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
});

export const historialSalarios = pgTable(
  "historial_salarios",
  {
    idHistorial: bigserial("id_historial", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    salarioAnterior: numeric("salario_anterior", { precision: 10, scale: 2 }),
    salarioNuevo: numeric("salario_nuevo", { precision: 10, scale: 2 }).notNull(),
    motivo: varchar({ length: 200 }),
    fechaEfectiva: date("fecha_efectiva").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aprobadoPor: bigint("aprobado_por", { mode: "number" }),
    fechaRegistro: timestamp("fecha_registro", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("historial_salarios_aprobado_por_idx").using("btree", table.aprobadoPor.asc().nullsLast().op("int8_ops")),
    index("historial_salarios_fecha_efectiva_idx").using("btree", table.fechaEfectiva.asc().nullsLast().op("date_ops")),
    index("historial_salarios_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.aprobadoPor],
      foreignColumns: [empleados.idEmpleado],
      name: "historial_salarios_aprobado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "historial_salarios_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const detalleComprasPapeleria = pgTable(
  "detalle_compras_papeleria",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    compraId: uuid("compra_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    productoId: bigint("producto_id", { mode: "number" }).notNull(),
    cantidad: numeric({ precision: 10, scale: 3 }).notNull(),
    costoUnitario: numeric("costo_unitario", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric({ precision: 12, scale: 2 }).notNull(),
    descuento: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    impuesto: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 12, scale: 2 }).notNull(),
    fechaVencimiento: date("fecha_vencimiento"),
    lote: varchar({ length: 50 }),
    orden: integer().default(1).notNull(),
  },
  (table) => [
    index("detalle_compras_papeleria_compra_id_idx").using("btree", table.compraId.asc().nullsLast().op("uuid_ops")),
    index("detalle_compras_papeleria_producto_id_idx").using(
      "btree",
      table.productoId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.compraId],
      foreignColumns: [comprasPapeleria.id],
      name: "detalle_compras_papeleria_compra_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productoId],
      foreignColumns: [productosPapeleria.id],
      name: "detalle_compras_papeleria_producto_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const detalleFacturas = pgTable(
  "detalle_facturas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    facturaId: uuid("factura_id").notNull(),
    concepto: varchar({ length: 200 }).notNull(),
    cantidad: numeric({ precision: 10, scale: 3 }).default("1").notNull(),
    precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric({ precision: 12, scale: 2 }).notNull(),
    descuento: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    impuesto: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 12, scale: 2 }).notNull(),
    servicioId: uuid("servicio_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    productoId: bigint("producto_id", { mode: "number" }),
    orden: integer().default(1).notNull(),
  },
  (table) => [
    index("detalle_facturas_factura_id_idx").using("btree", table.facturaId.asc().nullsLast().op("uuid_ops")),
    index("detalle_facturas_producto_id_idx").using("btree", table.productoId.asc().nullsLast().op("int8_ops")),
    index("detalle_facturas_servicio_id_idx").using("btree", table.servicioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.facturaId],
      foreignColumns: [facturasClientes.id],
      name: "detalle_facturas_factura_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productoId],
      foreignColumns: [productosPapeleria.id],
      name: "detalle_facturas_producto_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.servicioId],
      foreignColumns: [servicios.id],
      name: "detalle_facturas_servicio_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const detalleAsientos = pgTable(
  "detalle_asientos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    asientoId: uuid("asiento_id").notNull(),
    cuentaId: uuid("cuenta_id"),
    cajaId: uuid("caja_id"),
    descripcion: text(),
    debe: numeric({ precision: 15, scale: 2 }).default("0").notNull(),
    haber: numeric({ precision: 15, scale: 2 }).default("0").notNull(),
    orden: integer().default(1).notNull(),
  },
  (table) => [
    index("detalle_asientos_asiento_id_idx").using("btree", table.asientoId.asc().nullsLast().op("uuid_ops")),
    index("detalle_asientos_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("detalle_asientos_cuenta_id_idx").using("btree", table.cuentaId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.asientoId],
      foreignColumns: [asientosContables.id],
      name: "detalle_asientos_asiento_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "detalle_asientos_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cuentaId],
      foreignColumns: [cuentasContables.id],
      name: "detalle_asientos_cuenta_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const nominaPrestamos = pgTable(
  "nomina_prestamos",
  {
    idNominaPrestamo: bigserial("id_nomina_prestamo", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idNomina: bigint("id_nomina", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idPrestamo: bigint("id_prestamo", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idPagoPrestamo: bigint("id_pago_prestamo", { mode: "number" }).notNull(),
    montoDeducido: numeric("monto_deducido", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("nomina_prestamos_id_nomina_idx").using("btree", table.idNomina.asc().nullsLast().op("int8_ops")),
    index("nomina_prestamos_id_pago_prestamo_idx").using(
      "btree",
      table.idPagoPrestamo.asc().nullsLast().op("int8_ops"),
    ),
    index("nomina_prestamos_id_prestamo_idx").using("btree", table.idPrestamo.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.idNomina],
      foreignColumns: [nomina.idNomina],
      name: "nomina_prestamos_id_nomina_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idPagoPrestamo],
      foreignColumns: [pagosPrestamos.idPagoPrestamo],
      name: "nomina_prestamos_id_pago_prestamo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.idPrestamo],
      foreignColumns: [prestamos.idPrestamo],
      name: "nomina_prestamos_id_prestamo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const nominaComisiones = pgTable(
  "nomina_comisiones",
  {
    idNominaComision: bigserial("id_nomina_comision", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idNomina: bigint("id_nomina", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idComision: bigint("id_comision", { mode: "number" }).notNull(),
    montoPagado: numeric("monto_pagado", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("nomina_comisiones_id_comision_idx").using("btree", table.idComision.asc().nullsLast().op("int8_ops")),
    index("nomina_comisiones_id_nomina_idx").using("btree", table.idNomina.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.idComision],
      foreignColumns: [comisiones.idComision],
      name: "nomina_comisiones_id_comision_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.idNomina],
      foreignColumns: [nomina.idNomina],
      name: "nomina_comisiones_id_nomina_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const periodosVacaciones = pgTable(
  "periodos_vacaciones",
  {
    idPeriodoVacacion: bigserial("id_periodo_vacacion", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idTipoVacacion: bigint("id_tipo_vacacion", { mode: "number" }).notNull(),
    ano: integer().notNull(),
    diasGanados: numeric("dias_ganados", { precision: 4, scale: 2 }).notNull(),
    diasTomados: numeric("dias_tomados", { precision: 4, scale: 2 }).default("0").notNull(),
    diasPagados: numeric("dias_pagados", { precision: 4, scale: 2 }).default("0").notNull(),
    diasDisponibles: numeric("dias_disponibles", { precision: 4, scale: 2 }).notNull(),
    fechaCorte: date("fecha_corte"),
    observaciones: text(),
  },
  (table) => [
    index("periodos_vacaciones_ano_idx").using("btree", table.ano.asc().nullsLast().op("int4_ops")),
    uniqueIndex("periodos_vacaciones_id_empleado_ano_id_tipo_vacacion_key").using(
      "btree",
      table.idEmpleado.asc().nullsLast().op("int4_ops"),
      table.ano.asc().nullsLast().op("int8_ops"),
      table.idTipoVacacion.asc().nullsLast().op("int4_ops"),
    ),
    index("periodos_vacaciones_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    index("periodos_vacaciones_id_tipo_vacacion_idx").using(
      "btree",
      table.idTipoVacacion.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "periodos_vacaciones_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idTipoVacacion],
      foreignColumns: [tiposVacacion.idTipoVacacion],
      name: "periodos_vacaciones_id_tipo_vacacion_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const solicitudesVacaciones = pgTable(
  "solicitudes_vacaciones",
  {
    idSolicitudVacacion: bigserial("id_solicitud_vacacion", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idTipoVacacion: bigint("id_tipo_vacacion", { mode: "number" }).notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    diasSolicitados: integer("dias_solicitados").notNull(),
    motivo: text(),
    fechaSolicitud: date("fecha_solicitud")
      .default(sql`CURRENT_DATE`)
      .notNull(),
    estado: varchar({ length: 20 }).default("PENDIENTE").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aprobadoPor: bigint("aprobado_por", { mode: "number" }),
    fechaAprobacion: date("fecha_aprobacion"),
    observacionesAprobacion: text("observaciones_aprobacion"),
    pagoAdelantado: boolean("pago_adelantado").default(false).notNull(),
    montoPago: numeric("monto_pago", { precision: 10, scale: 2 }),
  },
  (table) => [
    index("solicitudes_vacaciones_aprobado_por_idx").using("btree", table.aprobadoPor.asc().nullsLast().op("int8_ops")),
    index("solicitudes_vacaciones_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("solicitudes_vacaciones_fecha_inicio_idx").using("btree", table.fechaInicio.asc().nullsLast().op("date_ops")),
    index("solicitudes_vacaciones_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    index("solicitudes_vacaciones_id_tipo_vacacion_idx").using(
      "btree",
      table.idTipoVacacion.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.aprobadoPor],
      foreignColumns: [empleados.idEmpleado],
      name: "solicitudes_vacaciones_aprobado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "solicitudes_vacaciones_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.idTipoVacacion],
      foreignColumns: [tiposVacacion.idTipoVacacion],
      name: "solicitudes_vacaciones_id_tipo_vacacion_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const pagosPrestamos = pgTable(
  "pagos_prestamos",
  {
    idPagoPrestamo: bigserial("id_pago_prestamo", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idPrestamo: bigint("id_prestamo", { mode: "number" }).notNull(),
    numeroCuota: integer("numero_cuota").notNull(),
    fechaProgramada: date("fecha_programada").notNull(),
    fechaPago: date("fecha_pago"),
    montoCota: numeric("monto_cota", { precision: 10, scale: 2 }).notNull(),
    montoCapital: numeric("monto_capital", { precision: 10, scale: 2 }).notNull(),
    montoInteres: numeric("monto_interes", { precision: 10, scale: 2 }).notNull(),
    montoPagado: numeric("monto_pagado", { precision: 10, scale: 2 }),
    saldoRestante: numeric("saldo_restante", { precision: 12, scale: 2 }),
    estado: varchar({ length: 20 }).default("PENDIENTE").notNull(),
    observaciones: text(),
  },
  (table) => [
    index("pagos_prestamos_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
    index("pagos_prestamos_fecha_programada_idx").using(
      "btree",
      table.fechaProgramada.asc().nullsLast().op("date_ops"),
    ),
    index("pagos_prestamos_id_prestamo_idx").using("btree", table.idPrestamo.asc().nullsLast().op("int8_ops")),
    index("pagos_prestamos_numero_cuota_idx").using("btree", table.numeroCuota.asc().nullsLast().op("int4_ops")),
    foreignKey({
      columns: [table.idPrestamo],
      foreignColumns: [prestamos.idPrestamo],
      name: "pagos_prestamos_id_prestamo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const periodosNomina = pgTable(
  "periodos_nomina",
  {
    idPeriodo: bigserial("id_periodo", { mode: "bigint" }).primaryKey().notNull(),
    codigoPeriodo: varchar("codigo_periodo", { length: 20 }).notNull(),
    ano: integer().notNull(),
    mes: integer(),
    quincena: integer(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    fechaPago: date("fecha_pago").notNull(),
    estado: varchar({ length: 20 }).default("ABIERTO").notNull(),
    tipoPeriodo: varchar("tipo_periodo", { length: 20 }).notNull(),
    observaciones: text(),
  },
  (table) => [
    index("periodos_nomina_ano_mes_idx").using(
      "btree",
      table.ano.asc().nullsLast().op("int4_ops"),
      table.mes.asc().nullsLast().op("int4_ops"),
    ),
    uniqueIndex("periodos_nomina_codigo_periodo_key").using(
      "btree",
      table.codigoPeriodo.asc().nullsLast().op("text_ops"),
    ),
    index("periodos_nomina_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
  ],
);

export const prestamos = pgTable(
  "prestamos",
  {
    idPrestamo: bigserial("id_prestamo", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idTipoPrestamo: bigint("id_tipo_prestamo", { mode: "number" }).notNull(),
    codigoPrestamo: varchar("codigo_prestamo", { length: 20 }).notNull(),
    montoSolicitado: numeric("monto_solicitado", { precision: 12, scale: 2 }).notNull(),
    montoAprobado: numeric("monto_aprobado", { precision: 12, scale: 2 }).notNull(),
    tasaInteres: numeric("tasa_interes", { precision: 5, scale: 2 }),
    plazoMeses: integer("plazo_meses").notNull(),
    cuotaMensual: numeric("cuota_mensual", { precision: 10, scale: 2 }).notNull(),
    fechaSolicitud: date("fecha_solicitud")
      .default(sql`CURRENT_DATE`)
      .notNull(),
    fechaAprobacion: date("fecha_aprobacion"),
    fechaDesembolso: date("fecha_desembolso"),
    fechaPrimerPago: date("fecha_primer_pago"),
    estado: varchar({ length: 20 }).default("SOLICITADO").notNull(),
    saldoPendiente: numeric("saldo_pendiente", { precision: 12, scale: 2 }),
    cuotasPagadas: integer("cuotas_pagadas").default(0).notNull(),
    motivo: text(),
    garantia: text(),
    observaciones: text(),
    metodoPago: varchar("metodo_pago", { length: 50 }),
    cajaId: uuid("caja_id"),
    cuentaBancariaId: uuid("cuenta_bancaria_id"),
    observacionesAprobacion: text("observaciones_aprobacion"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    aprobadoPor: bigint("aprobado_por", { mode: "number" }),
    fechaCreacion: timestamp("fecha_creacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("prestamos_aprobado_por_idx").using("btree", table.aprobadoPor.asc().nullsLast().op("int8_ops")),
    index("prestamos_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("prestamos_codigo_prestamo_key").using("btree", table.codigoPrestamo.asc().nullsLast().op("text_ops")),
    index("prestamos_cuenta_bancaria_id_idx").using("btree", table.cuentaBancariaId.asc().nullsLast().op("uuid_ops")),
    index("prestamos_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("prestamos_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    index("prestamos_id_tipo_prestamo_idx").using("btree", table.idTipoPrestamo.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.aprobadoPor],
      foreignColumns: [empleados.idEmpleado],
      name: "prestamos_aprobado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "prestamos_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.idTipoPrestamo],
      foreignColumns: [tiposPrestamo.idTipoPrestamo],
      name: "prestamos_id_tipo_prestamo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "prestamos_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
      name: "prestamos_cuenta_bancaria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const tiposComision = pgTable("tipos_comision", {
  idTipoComision: bigserial("id_tipo_comision", { mode: "bigint" }).primaryKey().notNull(),
  nombreTipo: varchar("nombre_tipo", { length: 100 }).notNull(),
  descripcion: text(),
  porcentajeBase: numeric("porcentaje_base", { precision: 5, scale: 2 }),
  montoFijo: numeric("monto_fijo", { precision: 10, scale: 2 }),
  activo: boolean().default(true).notNull(),
});

export const categoriasCuentas = pgTable(
  "categorias_cuentas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codigo: varchar({ length: 10 }).notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    subtipo: varchar({ length: 50 }),
    padreId: uuid("padre_id"),
    nivel: integer().default(1).notNull(),
    esDetalle: boolean("es_detalle").default(true).notNull(),
    activa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("categorias_cuentas_codigo_key").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
    index("categorias_cuentas_padre_id_idx").using("btree", table.padreId.asc().nullsLast().op("uuid_ops")),
    index("categorias_cuentas_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.padreId],
      foreignColumns: [table.id],
      name: "categorias_cuentas_padre_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const clientes = pgTable(
  "clientes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    usuarioId: uuid("usuario_id"),
    codigoCliente: varchar("codigo_cliente", { length: 20 }).notNull(),
    cedula: varchar({ length: 20 }),
    nombre: varchar({ length: 100 }).notNull(),
    apellidos: varchar({ length: 100 }).notNull(),
    telefono: varchar({ length: 20 }),
    telefonoSecundario: varchar("telefono_secundario", { length: 20 }),
    email: varchar({ length: 100 }),
    direccion: text(),
    sectorBarrio: varchar("sector_barrio", { length: 100 }),
    ciudad: varchar({ length: 50 }),
    provincia: varchar({ length: 50 }),
    codigoPostal: varchar("codigo_postal", { length: 10 }),
    coordenadasLat: numeric("coordenadas_lat", { precision: 10, scale: 8 }),
    coordenadasLng: numeric("coordenadas_lng", { precision: 11, scale: 8 }),
    fechaSuscripcion: date("fecha_suscripcion"),
    sexo: sexo(),
    fotoUrl: text("foto_url"),
    contacto: varchar({ length: 100 }),
    contactoEmergencia: varchar("contacto_emergencia", { length: 100 }),
    telefonoEmergencia: varchar("telefono_emergencia", { length: 20 }),
    referenciaDireccion: text("referencia_direccion"),
    tipoCliente: varchar("tipo_cliente", { length: 20 }).default("residencial").notNull(),
    categoriaCliente: categoriaCliente("categoria_cliente").default("NUEVO").notNull(),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    limiteCrediticio: numeric("limite_crediticio", { precision: 10, scale: 2 }).default("0").notNull(),
    creditoDisponible: numeric("credito_disponible", { precision: 10, scale: 2 }).default("0").notNull(),
    diasCredito: integer("dias_credito").default(0).notNull(),
    descuentoPorcentaje: numeric("descuento_porcentaje", { precision: 5, scale: 2 }).default("0").notNull(),
    notas: text(),
    referidoPor: uuid("referido_por"),
    fechaIngreso: timestamp("fecha_ingreso", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("clientes_cedula_key").using("btree", table.cedula.asc().nullsLast().op("text_ops")),
    uniqueIndex("clientes_codigo_cliente_key").using("btree", table.codigoCliente.asc().nullsLast().op("text_ops")),
    index("clientes_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("clientes_fecha_ingreso_idx").using("btree", table.fechaIngreso.asc().nullsLast().op("timestamptz_ops")),
    index("clientes_referido_por_idx").using("btree", table.referidoPor.asc().nullsLast().op("uuid_ops")),
    index("clientes_tipo_cliente_idx").using("btree", table.tipoCliente.asc().nullsLast().op("text_ops")),
    index("clientes_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("clientes_usuario_id_key").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    index("idx_clientes_apellidos").using("btree", table.apellidos.asc().nullsLast().op("text_ops")),
    index("idx_clientes_categoria").using("btree", table.categoriaCliente.asc().nullsLast().op("enum_ops")),
    index("idx_clientes_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("idx_clientes_estado").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("idx_clientes_estado_fecha").using(
      "btree",
      table.estado.asc().nullsLast().op("text_ops"),
      table.fechaIngreso.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_clientes_fecha_ingreso").using("btree", table.fechaIngreso.asc().nullsLast().op("timestamptz_ops")),
    index("idx_clientes_nombre").using("btree", table.nombre.asc().nullsLast().op("text_ops")),
    index("idx_clientes_nombre_apellidos").using(
      "btree",
      table.nombre.asc().nullsLast().op("text_ops"),
      table.apellidos.asc().nullsLast().op("text_ops"),
    ),
    index("idx_clientes_telefono").using("btree", table.telefono.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.referidoPor],
      foreignColumns: [table.id],
      name: "clientes_referido_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "clientes_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const tiposPrestamo = pgTable("tipos_prestamo", {
  idTipoPrestamo: bigserial("id_tipo_prestamo", { mode: "bigint" }).primaryKey().notNull(),
  nombreTipo: varchar("nombre_tipo", { length: 100 }).notNull(),
  descripcion: text(),
  montoMaximo: numeric("monto_maximo", { precision: 12, scale: 2 }),
  plazoMaximoMeses: integer("plazo_maximo_meses"),
  tasaInteres: numeric("tasa_interes", { precision: 5, scale: 2 }),
  activo: boolean().default(true).notNull(),
});

export const categorias = pgTable(
  "categorias",
  {
    id: uuid().primaryKey().notNull(),
    nombre: varchar({ length: 255 }).notNull(),
    descripcion: text(),
    icono: varchar({ length: 100 }),
    color: varchar({ length: 50 }),
    activo: boolean().default(true).notNull(),
    orden: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("categorias_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    uniqueIndex("categorias_nombre_key").using("btree", table.nombre.asc().nullsLast().op("text_ops")),
  ],
);

export const clientesPapeleria = pgTable(
  "clientes_papeleria",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    apellido: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 100 }),
    telefono: varchar({ length: 20 }),
    cedula: varchar({ length: 20 }),
    activo: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("clientes_papeleria_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops"))],
);

export const cierresCaja = pgTable(
  "cierres_caja",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cajaId: uuid("caja_id").notNull(),
    montoFinal: numeric("monto_final", { precision: 12, scale: 2 }).notNull(),
    ingresosDelDia: numeric("ingresos_del_dia", { precision: 12, scale: 2 }).notNull(),
    gastosDelDia: numeric("gastos_del_dia", { precision: 12, scale: 2 }).notNull(),
    fechaCierre: timestamp("fecha_cierre", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("cierres_caja_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("cierres_caja_fecha_cierre_idx").using("btree", table.fechaCierre.asc().nullsLast().op("timestamptz_ops")),
    index("cierres_caja_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "cierres_caja_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "cierres_caja_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const configuraciones = pgTable(
  "configuraciones",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    clave: varchar({ length: 100 }).notNull(),
    valor: text().notNull(),
    descripcion: text(),
    tipo: varchar({ length: 20 }).default("string").notNull(),
    esPublica: boolean("es_publica").default(false).notNull(),
    categoria: varchar({ length: 50 }).default("general").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("configuraciones_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("text_ops")),
    uniqueIndex("configuraciones_clave_key").using("btree", table.clave.asc().nullsLast().op("text_ops")),
    index("configuraciones_es_publica_idx").using("btree", table.esPublica.asc().nullsLast().op("bool_ops")),
  ],
);

export const categoriasPapeleria = pgTable(
  "categorias_papeleria",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    descripcion: text(),
    icono: varchar({ length: 50 }),
    color: varchar({ length: 7 }),
    activo: boolean().default(true).notNull(),
    orden: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("categorias_papeleria_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    uniqueIndex("categorias_papeleria_nombre_key").using("btree", table.nombre.asc().nullsLast().op("text_ops")),
  ],
);

export const tiposVacacion = pgTable("tipos_vacacion", {
  idTipoVacacion: bigserial("id_tipo_vacacion", { mode: "bigint" }).primaryKey().notNull(),
  nombreTipo: varchar("nombre_tipo", { length: 100 }).notNull(),
  descripcion: text(),
  diasPorAño: numeric("dias_por_año", { precision: 4, scale: 2 }),
  acumulable: boolean().default(true).notNull(),
  maximoAcumulable: integer("maximo_acumulable"),
  activo: boolean().default(true).notNull(),
});

export const chats = pgTable(
  "chats",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    titulo: varchar({ length: 100 }),
    tipo: varchar({ length: 20 }).notNull(),
    clienteId: uuid("cliente_id"),
    ticketId: uuid("ticket_id"),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    creadoPor: uuid("creado_por").notNull(),
    ultimoMensaje: timestamp("ultimo_mensaje", { precision: 6, withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("chats_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("chats_creado_por_idx").using("btree", table.creadoPor.asc().nullsLast().op("uuid_ops")),
    index("chats_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("chats_ticket_id_idx").using("btree", table.ticketId.asc().nullsLast().op("uuid_ops")),
    index("chats_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "chats_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.creadoPor],
      foreignColumns: [usuarios.id],
      name: "chats_creado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: "chats_ticket_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const chatParticipantes = pgTable(
  "chat_participantes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatId: uuid("chat_id").notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    rol: varchar({ length: 20 }).default("participante").notNull(),
    activo: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("chat_participantes_chat_id_idx").using("btree", table.chatId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("chat_participantes_chat_id_usuario_id_key").using(
      "btree",
      table.chatId.asc().nullsLast().op("uuid_ops"),
      table.usuarioId.asc().nullsLast().op("uuid_ops"),
    ),
    index("chat_participantes_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: "chat_participantes_chat_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "chat_participantes_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const comprasPapeleria = pgTable(
  "compras_papeleria",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroCompra: varchar("numero_compra", { length: 30 }).notNull(),
    proveedorId: uuid("proveedor_id").notNull(),
    fechaCompra: date("fecha_compra").notNull(),
    numeroFactura: varchar("numero_factura", { length: 50 }),
    subtotal: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    descuento: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    itbis: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 12, scale: 2 }).notNull(),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    formaPago: varchar("forma_pago", { length: 20 }),
    observaciones: text(),
    recibidaPor: uuid("recibida_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("compras_papeleria_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("compras_papeleria_fecha_compra_idx").using("btree", table.fechaCompra.asc().nullsLast().op("date_ops")),
    uniqueIndex("compras_papeleria_numero_compra_key").using(
      "btree",
      table.numeroCompra.asc().nullsLast().op("text_ops"),
    ),
    index("compras_papeleria_proveedor_id_idx").using("btree", table.proveedorId.asc().nullsLast().op("uuid_ops")),
    index("compras_papeleria_recibida_por_idx").using("btree", table.recibidaPor.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.proveedorId],
      foreignColumns: [proveedores.id],
      name: "compras_papeleria_proveedor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.recibidaPor],
      foreignColumns: [usuarios.id],
      name: "compras_papeleria_recibida_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const banks = pgTable(
  "banks",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    codigo: varchar({ length: 10 }),
    activo: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("banks_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    uniqueIndex("banks_codigo_key").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
  ],
);

export const asientosContables = pgTable(
  "asientos_contables",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroAsiento: varchar("numero_asiento", { length: 20 }).notNull(),
    fechaAsiento: date("fecha_asiento").notNull(),
    descripcion: text().notNull(),
    tipo: varchar({ length: 20 }),
    referencia: varchar({ length: 50 }),
    totalDebe: numeric("total_debe", { precision: 15, scale: 2 }).default("0").notNull(),
    totalHaber: numeric("total_haber", { precision: 15, scale: 2 }).default("0").notNull(),
    estado: varchar({ length: 20 }).default("borrador").notNull(),
    creadoPor: uuid("creado_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("asientos_contables_creado_por_idx").using("btree", table.creadoPor.asc().nullsLast().op("uuid_ops")),
    index("asientos_contables_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("asientos_contables_fecha_asiento_idx").using("btree", table.fechaAsiento.asc().nullsLast().op("date_ops")),
    uniqueIndex("asientos_contables_numero_asiento_key").using(
      "btree",
      table.numeroAsiento.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.creadoPor],
      foreignColumns: [usuarios.id],
      name: "asientos_contables_creado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const cajas = pgTable(
  "cajas",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    descripcion: text(),
    tipo: varchar({ length: 20 }).notNull(),
    cuentaContableId: uuid("cuenta_contable_id"),
    responsableId: uuid("responsable_id"),
    saldoInicial: numeric("saldo_inicial", { precision: 12, scale: 2 }).default("0").notNull(),
    saldoActual: numeric("saldo_actual", { precision: 12, scale: 2 }).default("0").notNull(),
    limiteMaximo: numeric("limite_maximo", { precision: 12, scale: 2 }),
    activa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("cajas_activa_idx").using("btree", table.activa.asc().nullsLast().op("bool_ops")),
    index("cajas_cuenta_contable_id_idx").using("btree", table.cuentaContableId.asc().nullsLast().op("uuid_ops")),
    index("cajas_responsable_id_idx").using("btree", table.responsableId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cuentaContableId],
      foreignColumns: [cuentasContables.id],
      name: "cajas_cuenta_contable_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.responsableId],
      foreignColumns: [usuarios.id],
      name: "cajas_responsable_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const archivos = pgTable(
  "archivos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombreOriginal: varchar("nombre_original", { length: 255 }).notNull(),
    nombreArchivo: varchar("nombre_archivo", { length: 255 }).notNull(),
    rutaArchivo: varchar("ruta_archivo", { length: 500 }).notNull(),
    tipoMime: varchar("tipo_mime", { length: 100 }).notNull(),
    categoria: varchar({ length: 50 }),
    descripcion: text(),
    esPublico: boolean("es_publico").default(false).notNull(),
    subidoPor: uuid("subido_por").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    clienteId: uuid("cliente_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    tamaño: bigint("tamaño", { mode: "number" }).notNull(),
  },
  (table) => [
    index("archivos_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("text_ops")),
    index("archivos_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("archivos_subido_por_idx").using("btree", table.subidoPor.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "archivos_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.subidoPor],
      foreignColumns: [usuarios.id],
      name: "archivos_subido_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const cuentasContables = pgTable(
  "cuentas_contables",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    nombre: varchar({ length: 150 }).notNull(),
    categoriaId: uuid("categoria_id"),
    tipoCuenta: varchar("tipo_cuenta", { length: 30 }).notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    saldoInicial: numeric("saldo_inicial", { precision: 15, scale: 2 }).default("0").notNull(),
    saldoActual: numeric("saldo_actual", { precision: 15, scale: 2 }).default("0").notNull(),
    activa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("cuentas_contables_activa_idx").using("btree", table.activa.asc().nullsLast().op("bool_ops")),
    index("cuentas_contables_categoria_id_idx").using("btree", table.categoriaId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("cuentas_contables_codigo_key").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.categoriaId],
      foreignColumns: [categoriasCuentas.id],
      name: "cuentas_contables_categoria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const pagosCuentasPorPagar = pgTable(
  "pagos_cuentas_por_pagar",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cuentaPorPagarId: uuid("cuenta_por_pagar_id").notNull(),
    monto: numeric({ precision: 12, scale: 2 }).notNull(),
    fechaPago: date("fecha_pago").notNull(),
    metodoPago: varchar("metodo_pago", { length: 50 }).notNull(),
    numeroReferencia: varchar("numero_referencia", { length: 100 }),
    observaciones: text(),
    creadoPor: uuid("creado_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("pagos_cuentas_por_pagar_creado_por_idx").using("btree", table.creadoPor.asc().nullsLast().op("uuid_ops")),
    index("pagos_cuentas_por_pagar_cuenta_por_pagar_id_idx").using(
      "btree",
      table.cuentaPorPagarId.asc().nullsLast().op("uuid_ops"),
    ),
    index("pagos_cuentas_por_pagar_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
    index("pagos_cuentas_por_pagar_metodo_pago_idx").using("btree", table.metodoPago.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.cuentaPorPagarId],
      foreignColumns: [cuentasPorPagar.id],
      name: "pagos_cuentas_por_pagar_cuenta_por_pagar_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.creadoPor],
      foreignColumns: [usuarios.id],
      name: "pagos_cuentas_por_pagar_creado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const mensajesChat = pgTable(
  "mensajes_chat",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatId: uuid("chat_id").notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    mensaje: text().notNull(),
    tipo: varchar({ length: 20 }).default("texto").notNull(),
    archivoId: uuid("archivo_id"),
    leido: boolean().default(false).notNull(),
    editado: boolean().default(false).notNull(),
    fechaEdicion: timestamp("fecha_edicion", { precision: 6, withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("mensajes_chat_archivo_id_idx").using("btree", table.archivoId.asc().nullsLast().op("uuid_ops")),
    index("mensajes_chat_chat_id_idx").using("btree", table.chatId.asc().nullsLast().op("uuid_ops")),
    index("mensajes_chat_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.archivoId],
      foreignColumns: [archivos.id],
      name: "mensajes_chat_archivo_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: "mensajes_chat_chat_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "mensajes_chat_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const empresa = pgTable(
  "empresa",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 150 }).notNull(),
    razonSocial: varchar("razon_social", { length: 200 }),
    rnc: varchar({ length: 50 }),
    telefono: varchar({ length: 50 }),
    email: varchar({ length: 100 }),
    direccion: text(),
    ciudad: varchar({ length: 50 }),
    provincia: varchar({ length: 50 }),
    codigoPostal: varchar("codigo_postal", { length: 20 }),
    logoUrl: text("logo_url"),
    sitioWeb: varchar("sitio_web", { length: 100 }),
    monedaPrincipal: varchar("moneda_principal", { length: 3 }).default("DOP").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("empresa_ciudad_idx").using("btree", table.ciudad.asc().nullsLast().op("text_ops")),
    index("empresa_provincia_idx").using("btree", table.provincia.asc().nullsLast().op("text_ops")),
    uniqueIndex("empresa_rnc_key").using("btree", table.rnc.asc().nullsLast().op("text_ops")),
  ],
);

export const contratos = pgTable(
  "contratos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroContrato: varchar("numero_contrato", { length: 30 }).notNull(),
    clienteId: uuid("cliente_id").notNull(),
    servicioId: uuid("servicio_id").notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin"),
    estado: varchar({ length: 20 }).default("activo").notNull(),
    precioMensual: numeric("precio_mensual", { precision: 10, scale: 2 }).notNull(),
    direccionInstalacion: text("direccion_instalacion"),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("contratos_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("contratos_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("contratos_fecha_inicio_idx").using("btree", table.fechaInicio.asc().nullsLast().op("date_ops")),
    uniqueIndex("contratos_numero_contrato_key").using("btree", table.numeroContrato.asc().nullsLast().op("text_ops")),
    index("contratos_servicio_id_idx").using("btree", table.servicioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "contratos_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.servicioId],
      foreignColumns: [servicios.id],
      name: "contratos_servicio_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const movimientosContables = pgTable(
  "movimientos_contables",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tipo: varchar({ length: 20 }).notNull(),
    monto: numeric({ precision: 12, scale: 2 }).notNull(),
    categoriaId: uuid("categoria_id").notNull(),
    metodo: varchar({ length: 20 }).notNull(),
    cajaId: uuid("caja_id"),
    bankId: uuid("bank_id"),
    cuentaBancariaId: uuid("cuenta_bancaria_id"),
    descripcion: text(),
    fecha: timestamp({ precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    cuentaPorPagarId: uuid("cuenta_por_pagar_id"),
  },
  (table) => [
    index("movimientos_contables_bank_id_idx").using("btree", table.bankId.asc().nullsLast().op("uuid_ops")),
    index("movimientos_contables_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("movimientos_contables_categoria_id_idx").using("btree", table.categoriaId.asc().nullsLast().op("uuid_ops")),
    index("movimientos_contables_cuenta_bancaria_id_idx").using(
      "btree",
      table.cuentaBancariaId.asc().nullsLast().op("uuid_ops"),
    ),
    index("movimientos_contables_fecha_idx").using("btree", table.fecha.asc().nullsLast().op("timestamptz_ops")),
    index("movimientos_contables_metodo_idx").using("btree", table.metodo.asc().nullsLast().op("text_ops")),
    index("movimientos_contables_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
    index("movimientos_contables_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.bankId],
      foreignColumns: [banks.id],
      name: "movimientos_contables_bank_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "movimientos_contables_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.categoriaId],
      foreignColumns: [categoriasCuentas.id],
      name: "movimientos_contables_categoria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
      name: "movimientos_contables_cuenta_bancaria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "movimientos_contables_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cuentaPorPagarId],
      foreignColumns: [cuentasPorPagar.id],
      name: "movimientos_contables_cuenta_por_pagar_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const pagosClientes = pgTable(
  "pagos_clientes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    facturaId: uuid("factura_id"),
    clienteId: uuid("cliente_id").notNull(),
    numeroPago: varchar("numero_pago", { length: 30 }).notNull(),
    fechaPago: date("fecha_pago").notNull(),
    monto: numeric({ precision: 12, scale: 2 }).notNull(),
    descuento: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    metodoPago: varchar("metodo_pago", { length: 30 }).notNull(),
    numeroReferencia: varchar("numero_referencia", { length: 50 }),
    cuentaBancariaId: uuid("cuenta_bancaria_id"),
    cajaId: uuid("caja_id"),
    estado: varchar({ length: 20 }).default("confirmado").notNull(),
    observaciones: text(),
    recibidoPor: uuid("recibido_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("pagos_clientes_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("pagos_clientes_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("pagos_clientes_cuenta_bancaria_id_idx").using(
      "btree",
      table.cuentaBancariaId.asc().nullsLast().op("uuid_ops"),
    ),
    index("pagos_clientes_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("pagos_clientes_factura_id_idx").using("btree", table.facturaId.asc().nullsLast().op("uuid_ops")),
    index("pagos_clientes_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
    uniqueIndex("pagos_clientes_numero_pago_key").using("btree", table.numeroPago.asc().nullsLast().op("text_ops")),
    index("pagos_clientes_recibido_por_idx").using("btree", table.recibidoPor.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "pagos_clientes_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "pagos_clientes_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
      name: "pagos_clientes_cuenta_bancaria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.facturaId],
      foreignColumns: [facturasClientes.id],
      name: "pagos_clientes_factura_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.recibidoPor],
      foreignColumns: [usuarios.id],
      name: "pagos_clientes_recibido_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const eventos = pgTable(
  "eventos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    titulo: varchar({ length: 255 }).notNull(),
    descripcion: text(),
    fechaInicio: timestamp("fecha_inicio", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    fechaFin: timestamp("fecha_fin", { precision: 6, withTimezone: true, mode: "string" }),
    todoElDia: boolean("todo_el_dia").default(false).notNull(),
    color: varchar({ length: 7 }),
    ubicacion: text(),
    creadoPorId: uuid("creado_por_id").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("eventos_creado_por_id_idx").using("btree", table.creadoPorId.asc().nullsLast().op("uuid_ops")),
    index("eventos_fecha_inicio_idx").using("btree", table.fechaInicio.asc().nullsLast().op("timestamptz_ops")),
    index("eventos_todo_el_dia_idx").using("btree", table.todoElDia.asc().nullsLast().op("bool_ops")),
    foreignKey({
      columns: [table.creadoPorId],
      foreignColumns: [usuarios.id],
      name: "eventos_creado_por_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const facturasClientes = pgTable(
  "facturas_clientes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroFactura: varchar("numero_factura", { length: 30 }).notNull(),
    clienteId: uuid("cliente_id").notNull(),
    contratoId: uuid("contrato_id"),
    tipoFactura: varchar("tipo_factura", { length: 20 }).default("servicio").notNull(),
    fechaFactura: date("fecha_factura").notNull(),
    fechaVencimiento: date("fecha_vencimiento"),
    periodoFacturadoInicio: date("periodo_facturado_inicio"),
    periodoFacturadoFin: date("periodo_facturado_fin"),
    subtotal: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    descuento: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    itbis: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 12, scale: 2 }).notNull(),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    formaPago: varchar("forma_pago", { length: 20 }),
    observaciones: text(),
    facturadaPor: uuid("facturada_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("facturas_clientes_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("facturas_clientes_contrato_id_idx").using("btree", table.contratoId.asc().nullsLast().op("uuid_ops")),
    index("facturas_clientes_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("facturas_clientes_facturada_por_idx").using("btree", table.facturadaPor.asc().nullsLast().op("uuid_ops")),
    index("facturas_clientes_fecha_factura_idx").using("btree", table.fechaFactura.asc().nullsLast().op("date_ops")),
    uniqueIndex("facturas_clientes_numero_factura_key").using(
      "btree",
      table.numeroFactura.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "facturas_clientes_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.contratoId],
      foreignColumns: [contratos.id],
      name: "facturas_clientes_contrato_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.facturadaPor],
      foreignColumns: [usuarios.id],
      name: "facturas_clientes_facturada_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const cuentasBancarias = pgTable(
  "cuentas_bancarias",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bankId: uuid("bank_id").notNull(),
    numeroCuenta: varchar("numero_cuenta", { length: 50 }).notNull(),
    tipoCuenta: varchar("tipo_cuenta", { length: 50 }),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    nombreOficialCuenta: varchar("nombre_oficial_cuenta", { length: 150 }),
    cuentaContableId: uuid("cuenta_contable_id").notNull(),
    activo: boolean().default(true).notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("cuentas_bancarias_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("cuentas_bancarias_bank_id_idx").using("btree", table.bankId.asc().nullsLast().op("uuid_ops")),
    index("cuentas_bancarias_cuenta_contable_id_idx").using(
      "btree",
      table.cuentaContableId.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("cuentas_bancarias_numero_cuenta_key").using(
      "btree",
      table.numeroCuenta.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.bankId],
      foreignColumns: [banks.id],
      name: "cuentas_bancarias_bank_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cuentaContableId],
      foreignColumns: [cuentasContables.id],
      name: "cuentas_bancarias_cuenta_contable_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const cuentasPorCobrar = pgTable(
  "cuentas_por_cobrar",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    facturaId: uuid("factura_id"),
    clienteId: uuid("cliente_id").notNull(),
    numeroDocumento: varchar("numero_documento", { length: 30 }).notNull(),
    fechaEmision: date("fecha_emision").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    montoOriginal: numeric("monto_original", { precision: 12, scale: 2 }).notNull(),
    montoPendiente: numeric("monto_pendiente", { precision: 12, scale: 2 }).notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    diasVencido: integer("dias_vencido").default(0).notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("cuentas_por_cobrar_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("cuentas_por_cobrar_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("cuentas_por_cobrar_factura_id_idx").using("btree", table.facturaId.asc().nullsLast().op("uuid_ops")),
    index("cuentas_por_cobrar_fecha_vencimiento_idx").using(
      "btree",
      table.fechaVencimiento.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("cuentas_por_cobrar_numero_documento_key").using(
      "btree",
      table.numeroDocumento.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "cuentas_por_cobrar_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.facturaId],
      foreignColumns: [facturasClientes.id],
      name: "cuentas_por_cobrar_factura_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const pagosFijos = pgTable(
  "pagos_fijos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    descripcion: text(),
    monto: numeric({ precision: 12, scale: 2 }).notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    diaVencimiento: integer("dia_vencimiento").notNull(),
    cuentaContableId: uuid("cuenta_contable_id"),
    proveedorId: uuid("proveedor_id"),
    activo: boolean().default(true).notNull(),
    proximoVencimiento: date("proximo_vencimiento"),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("pagos_fijos_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("pagos_fijos_cuenta_contable_id_idx").using("btree", table.cuentaContableId.asc().nullsLast().op("uuid_ops")),
    index("pagos_fijos_proveedor_id_idx").using("btree", table.proveedorId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cuentaContableId],
      foreignColumns: [cuentasContables.id],
      name: "pagos_fijos_cuenta_contable_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.proveedorId],
      foreignColumns: [proveedores.id],
      name: "pagos_fijos_proveedor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const equiposCliente = pgTable(
  "equipos_cliente",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clienteId: uuid("cliente_id").notNull(),
    suscripcionId: uuid("suscripcion_id"),
    tipoEquipo: varchar("tipo_equipo", { length: 50 }).notNull(),
    marca: varchar({ length: 100 }).notNull(),
    modelo: varchar({ length: 100 }).notNull(),
    numeroSerie: varchar("numero_serie", { length: 100 }).notNull(),
    macAddress: varchar("mac_address", { length: 17 }),
    ipAsignada: inet("ip_asignada"),
    estado: varchar({ length: 20 }).default("instalado").notNull(),
    fechaInstalacion: date("fecha_instalacion"),
    fechaRetiro: date("fecha_retiro"),
    ubicacion: text(),
    notas: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    contratoId: uuid("contrato_id"),
  },
  (table) => [
    index("equipos_cliente_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("equipos_cliente_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    uniqueIndex("equipos_cliente_mac_address_key").using("btree", table.macAddress.asc().nullsLast().op("text_ops")),
    uniqueIndex("equipos_cliente_numero_serie_key").using("btree", table.numeroSerie.asc().nullsLast().op("text_ops")),
    index("equipos_cliente_suscripcion_id_idx").using("btree", table.suscripcionId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "equipos_cliente_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.contratoId],
      foreignColumns: [contratos.id],
      name: "equipos_cliente_contrato_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.suscripcionId],
      foreignColumns: [suscripciones.id],
      name: "equipos_cliente_suscripcion_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const movimientosInventario = pgTable(
  "movimientos_inventario",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    productoId: bigint("producto_id", { mode: "number" }).notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    tipoMovimiento: varchar("tipo_movimiento", { length: 20 }).notNull(),
    cantidad: integer().notNull(),
    cantidadAnterior: integer("cantidad_anterior").notNull(),
    cantidadNueva: integer("cantidad_nueva").notNull(),
    motivo: varchar({ length: 100 }).notNull(),
    referencia: varchar({ length: 100 }),
    notas: text(),
    fechaMovimiento: timestamp("fecha_movimiento", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("movimientos_inventario_fecha_movimiento_idx").using(
      "btree",
      table.fechaMovimiento.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("movimientos_inventario_producto_id_idx").using("btree", table.productoId.asc().nullsLast().op("int8_ops")),
    index("movimientos_inventario_tipo_movimiento_idx").using(
      "btree",
      table.tipoMovimiento.asc().nullsLast().op("text_ops"),
    ),
    index("movimientos_inventario_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.productoId],
      foreignColumns: [productosPapeleria.id],
      name: "movimientos_inventario_producto_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "movimientos_inventario_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const servicios = pgTable(
  "servicios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    nombre: varchar({ length: 200 }).notNull(),
    descripcion: text(),
    descripcionCorta: text("descripcion_corta"),
    categoriaId: uuid("categoria_id").notNull(),
    tipo: varchar({ length: 50 }).notNull(),
    esRecurrente: boolean("es_recurrente").default(false).notNull(),
    requierePlan: boolean("requiere_plan").default(false).notNull(),
    precioBase: numeric("precio_base", { precision: 10, scale: 2 }),
    moneda: varchar({ length: 3 }).default("USD").notNull(),
    unidadTiempo: varchar("unidad_tiempo", { length: 50 }),
    imagen: text(),
    caracteristicas: jsonb(),
    activo: boolean().default(true).notNull(),
    destacado: boolean().default(false).notNull(),
    orden: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("servicios_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("servicios_categoria_id_idx").using("btree", table.categoriaId.asc().nullsLast().op("uuid_ops")),
    index("servicios_destacado_idx").using("btree", table.destacado.asc().nullsLast().op("bool_ops")),
    index("servicios_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.categoriaId],
      foreignColumns: [categorias.id],
      name: "servicios_categoria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const suscripciones = pgTable(
  "suscripciones",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clienteId: uuid("cliente_id").notNull(),
    servicioId: uuid("servicio_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    planId: bigint("plan_id", { mode: "number" }),
    usuarioId: uuid("usuario_id"),
    numeroContrato: varchar("numero_contrato", { length: 50 }).notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaVencimiento: date("fecha_vencimiento"),
    fechaInstalacion: date("fecha_instalacion"),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    precioMensual: numeric("precio_mensual", { precision: 10, scale: 2 }).notNull(),
    descuentoAplicado: numeric("descuento_aplicado", { precision: 5, scale: 2 }).default("0").notNull(),
    fechaProximoPago: date("fecha_proximo_pago"),
    diaFacturacion: integer("dia_facturacion").default(1).notNull(),
    notasInstalacion: text("notas_instalacion"),
    notasServicio: text("notas_servicio"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("suscripciones_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("suscripciones_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("suscripciones_fecha_inicio_idx").using("btree", table.fechaInicio.asc().nullsLast().op("date_ops")),
    index("suscripciones_fecha_proximo_pago_idx").using(
      "btree",
      table.fechaProximoPago.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("suscripciones_numero_contrato_key").using(
      "btree",
      table.numeroContrato.asc().nullsLast().op("text_ops"),
    ),
    index("suscripciones_servicio_id_idx").using("btree", table.servicioId.asc().nullsLast().op("uuid_ops")),
    index("suscripciones_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "suscripciones_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [planes.id],
      name: "suscripciones_plan_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.servicioId],
      foreignColumns: [servicios.id],
      name: "suscripciones_servicio_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "suscripciones_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const proveedores = pgTable(
  "proveedores",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    codigo: varchar({ length: 20 }).notNull(),
    nombre: varchar({ length: 150 }).notNull(),
    razonSocial: varchar("razon_social", { length: 200 }),
    rnc: varchar({ length: 20 }),
    telefono: varchar({ length: 20 }),
    email: varchar({ length: 100 }),
    direccion: text(),
    contacto: varchar({ length: 100 }),
    telefonoContacto: varchar("telefono_contacto", { length: 20 }),
    emailContacto: varchar("email_contacto", { length: 100 }),
    tipoProveedor: varchar("tipo_proveedor", { length: 30 }).default("papeleria").notNull(),
    condicionesPago: text("condiciones_pago"),
    diasCredito: integer("dias_credito"),
    limiteCredito: numeric("limite_credito", { precision: 12, scale: 2 }),
    activo: boolean().default(true).notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("proveedores_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    uniqueIndex("proveedores_codigo_key").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
    uniqueIndex("proveedores_rnc_key").using("btree", table.rnc.asc().nullsLast().op("text_ops")),
  ],
);

export const ventasPapeleria = pgTable(
  "ventas_papeleria",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroVenta: varchar("numero_venta", { length: 50 }).notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    clienteNombre: varchar("cliente_nombre", { length: 200 }),
    clienteCedula: varchar("cliente_cedula", { length: 20 }),
    fechaVenta: timestamp("fecha_venta", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
    impuestos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    descuentos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 10, scale: 2 }).notNull(),
    moneda: varchar({ length: 3 }).default("USD").notNull(),
    metodoPago: varchar("metodo_pago", { length: 50 }).notNull(),
    estado: varchar({ length: 20 }).default("completada").notNull(),
    notas: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    clienteId: uuid("cliente_id"),
    cuentaBancariaId: uuid("cuenta_bancaria_id"),
    cajaId: uuid("caja_id"),
    movimientoContableId: uuid("movimiento_contable_id"),
  },
  (table) => [
    index("ventas_papeleria_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("ventas_papeleria_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("ventas_papeleria_cuenta_bancaria_id_idx").using(
      "btree",
      table.cuentaBancariaId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ventas_papeleria_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("ventas_papeleria_fecha_venta_idx").using("btree", table.fechaVenta.asc().nullsLast().op("timestamptz_ops")),
    uniqueIndex("ventas_papeleria_numero_venta_key").using("btree", table.numeroVenta.asc().nullsLast().op("text_ops")),
    index("ventas_papeleria_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "ventas_papeleria_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "ventas_papeleria_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
      name: "ventas_papeleria_cuenta_bancaria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "ventas_papeleria_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.movimientoContableId],
      foreignColumns: [movimientosContables.id],
      name: "ventas_papeleria_movimiento_contable_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const productosPapeleria = pgTable(
  "productos_papeleria",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    codigo: varchar({ length: 50 }).notNull(),
    nombre: varchar({ length: 200 }).notNull(),
    descripcion: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    categoriaId: bigint("categoria_id", { mode: "number" }).notNull(),
    marca: varchar({ length: 100 }),
    modelo: varchar({ length: 100 }),
    unidadMedida: varchar("unidad_medida", { length: 20 }).notNull(),
    precioCompra: numeric("precio_compra", { precision: 10, scale: 2 }).notNull(),
    precioVenta: numeric("precio_venta", { precision: 10, scale: 2 }).notNull(),
    margenGanancia: numeric("margen_ganancia", { precision: 5, scale: 2 }).notNull(),
    stockMinimo: integer("stock_minimo").default(0).notNull(),
    stockActual: integer("stock_actual").default(0).notNull(),
    ubicacion: varchar({ length: 100 }),
    codigoBarras: varchar("codigo_barras", { length: 50 }),
    imagen: text(),
    activo: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    proveedorId: uuid("proveedor_id"),
  },
  (table) => [
    index("productos_papeleria_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("productos_papeleria_categoria_id_idx").using("btree", table.categoriaId.asc().nullsLast().op("int8_ops")),
    uniqueIndex("productos_papeleria_codigo_barras_key").using(
      "btree",
      table.codigoBarras.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("productos_papeleria_codigo_key").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
    index("productos_papeleria_proveedor_id_idx").using("btree", table.proveedorId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.categoriaId],
      foreignColumns: [categoriasPapeleria.id],
      name: "productos_papeleria_categoria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.proveedorId],
      foreignColumns: [proveedores.id],
      name: "productos_papeleria_proveedor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const planes = pgTable(
  "planes",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    nombre: varchar({ length: 150 }).notNull(),
    descripcion: text(),
    categoriaId: uuid("categoria_id").notNull(),
    precio: numeric({ precision: 10, scale: 2 }).notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    subidaKbps: integer("subida_kbps").notNull(),
    bajadaMbps: integer("bajada_mbps").notNull(),
    detalles: jsonb(),
    activo: boolean().default(true).notNull(),
    orden: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("planes_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("planes_categoria_id_idx").using("btree", table.categoriaId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.categoriaId],
      foreignColumns: [categorias.id],
      name: "planes_categoria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroTicket: varchar("numero_ticket", { length: 20 }).notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    suscripcionId: uuid("suscripcion_id"),
    asunto: varchar({ length: 200 }).notNull(),
    descripcion: text().notNull(),
    categoria: varchar({ length: 50 }).notNull(),
    prioridad: varchar({ length: 20 }).default("media").notNull(),
    estado: varchar({ length: 20 }).default("abierto").notNull(),
    fechaCreacion: timestamp("fecha_creacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaCierre: timestamp("fecha_cierre", { precision: 6, withTimezone: true, mode: "string" }),
    tiempoRespuesta: integer("tiempo_respuesta"),
    satisfaccion: integer(),
    notas: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    tecnicoAsignadoId: bigint("tecnico_asignado_id", { mode: "number" }),
    clienteId: uuid("cliente_id"),
    contratoId: uuid("contrato_id"),
  },
  (table) => [
    index("tickets_cliente_id_idx").using("btree", table.clienteId.asc().nullsLast().op("uuid_ops")),
    index("tickets_contrato_id_idx").using("btree", table.contratoId.asc().nullsLast().op("uuid_ops")),
    index("tickets_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    uniqueIndex("tickets_numero_ticket_key").using("btree", table.numeroTicket.asc().nullsLast().op("text_ops")),
    index("tickets_prioridad_idx").using("btree", table.prioridad.asc().nullsLast().op("text_ops")),
    index("tickets_suscripcion_id_idx").using("btree", table.suscripcionId.asc().nullsLast().op("uuid_ops")),
    index("tickets_tecnico_asignado_id_idx").using("btree", table.tecnicoAsignadoId.asc().nullsLast().op("int8_ops")),
    index("tickets_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clienteId],
      foreignColumns: [clientes.id],
      name: "tickets_cliente_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.contratoId],
      foreignColumns: [contratos.id],
      name: "tickets_contrato_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.suscripcionId],
      foreignColumns: [suscripciones.id],
      name: "tickets_suscripcion_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.tecnicoAsignadoId],
      foreignColumns: [empleados.idEmpleado],
      name: "tickets_tecnico_asignado_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "tickets_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    nombreRol: varchar("nombre_rol", { length: 100 }).notNull(),
    descripcion: text(),
    activo: boolean().default(true).notNull(),
    esSistema: boolean("es_sistema").default(false).notNull(),
    prioridad: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [uniqueIndex("roles_nombre_rol_key").using("btree", table.nombreRol.asc().nullsLast().op("text_ops"))],
);

export const respuestasTickets = pgTable(
  "respuestas_tickets",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ticketId: uuid("ticket_id").notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    mensaje: text().notNull(),
    esInterno: boolean("es_interno").default(false).notNull(),
    fechaRespuesta: timestamp("fecha_respuesta", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    imagenUrl: text("imagen_url"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("respuestas_tickets_ticket_id_idx").using("btree", table.ticketId.asc().nullsLast().op("uuid_ops")),
    index("respuestas_tickets_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: "respuestas_tickets_ticket_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "respuestas_tickets_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const pagosPagosFijos = pgTable(
  "pagos_pagos_fijos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    pagoFijoId: uuid("pago_fijo_id").notNull(),
    fechaPago: date("fecha_pago").notNull(),
    montoPagado: numeric("monto_pagado", { precision: 12, scale: 2 }).notNull(),
    metodoPago: varchar("metodo_pago", { length: 30 }).notNull(),
    numeroReferencia: varchar("numero_referencia", { length: 50 }),
    observaciones: text(),
    pagadoPor: uuid("pagado_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("pagos_pagos_fijos_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
    index("pagos_pagos_fijos_pagado_por_idx").using("btree", table.pagadoPor.asc().nullsLast().op("uuid_ops")),
    index("pagos_pagos_fijos_pago_fijo_id_idx").using("btree", table.pagoFijoId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.pagadoPor],
      foreignColumns: [usuarios.id],
      name: "pagos_pagos_fijos_pagado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.pagoFijoId],
      foreignColumns: [pagosFijos.id],
      name: "pagos_pagos_fijos_pago_fijo_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const tareas = pgTable(
  "tareas",
  {
    id: text().primaryKey().notNull(),
    titulo: text().notNull(),
    descripcion: text(),
    color: text().notNull(),
    completada: boolean().default(false).notNull(),
    creadoPorId: uuid().notNull(),
    createdAt: timestamp({ precision: 3, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "string" }).notNull(),
  },
  (table) => [
    index("tareas_completada_idx").using("btree", table.completada.asc().nullsLast().op("bool_ops")),
    index("tareas_creadoPorId_idx").using("btree", table.creadoPorId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.creadoPorId],
      foreignColumns: [usuarios.id],
      name: "tareas_creadoPorId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const permisos = pgTable(
  "permisos",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    nombrePermiso: varchar("nombre_permiso", { length: 100 }).notNull(),
    descripcion: text(),
    categoria: varchar({ length: 50 }).default("general").notNull(),
    activo: boolean().default(true).notNull(),
    esSistema: boolean("es_sistema").default(false).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("permisos_activo_idx").using("btree", table.activo.asc().nullsLast().op("bool_ops")),
    index("permisos_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("text_ops")),
    uniqueIndex("permisos_nombre_permiso_key").using("btree", table.nombrePermiso.asc().nullsLast().op("text_ops")),
  ],
);

export const traspasos = pgTable(
  "traspasos",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    numeroTraspaso: varchar("numero_traspaso", { length: 30 }).notNull(),
    fechaTraspaso: timestamp("fecha_traspaso", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    monto: numeric({ precision: 12, scale: 2 }).notNull(),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    conceptoTraspaso: text("concepto_traspaso").notNull(),
    bancoOrigenId: uuid("banco_origen_id"),
    bancoDestinoId: uuid("banco_destino_id"),
    cajaOrigenId: uuid("caja_origen_id"),
    cajaDestinoId: uuid("caja_destino_id"),
    estado: varchar({ length: 20 }).default("completado").notNull(),
    observaciones: text(),
    autorizadoPor: uuid("autorizado_por"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("traspasos_autorizado_por_idx").using("btree", table.autorizadoPor.asc().nullsLast().op("uuid_ops")),
    index("traspasos_banco_destino_id_idx").using("btree", table.bancoDestinoId.asc().nullsLast().op("uuid_ops")),
    index("traspasos_banco_origen_id_idx").using("btree", table.bancoOrigenId.asc().nullsLast().op("uuid_ops")),
    index("traspasos_caja_destino_id_idx").using("btree", table.cajaDestinoId.asc().nullsLast().op("uuid_ops")),
    index("traspasos_caja_origen_id_idx").using("btree", table.cajaOrigenId.asc().nullsLast().op("uuid_ops")),
    index("traspasos_fecha_traspaso_idx").using("btree", table.fechaTraspaso.asc().nullsLast().op("timestamptz_ops")),
    uniqueIndex("traspasos_numero_traspaso_key").using("btree", table.numeroTraspaso.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.autorizadoPor],
      foreignColumns: [usuarios.id],
      name: "traspasos_autorizado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.bancoDestinoId],
      foreignColumns: [cuentasBancarias.id],
      name: "traspasos_banco_destino_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.bancoOrigenId],
      foreignColumns: [cuentasBancarias.id],
      name: "traspasos_banco_origen_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cajaDestinoId],
      foreignColumns: [cajas.id],
      name: "traspasos_caja_destino_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.cajaOrigenId],
      foreignColumns: [cajas.id],
      name: "traspasos_caja_origen_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const sesionesUsuario = pgTable(
  "sesiones_usuario",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    activa: boolean().default(true).notNull(),
    fechaInicio: timestamp("fecha_inicio", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaUltimoUso: timestamp("fecha_ultimo_uso", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    fechaExpiracion: timestamp("fecha_expiracion", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("sesiones_usuario_activa_idx").using("btree", table.activa.asc().nullsLast().op("bool_ops")),
    index("sesiones_usuario_fecha_expiracion_idx").using(
      "btree",
      table.fechaExpiracion.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("sesiones_usuario_fecha_inicio_idx").using(
      "btree",
      table.fechaInicio.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("sesiones_usuario_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "sesiones_usuario_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const empleados = pgTable(
  "empleados",
  {
    idEmpleado: bigserial("id_empleado", { mode: "bigint" }).primaryKey().notNull(),
    codigoEmpleado: varchar("codigo_empleado", { length: 20 }).notNull(),
    cedula: varchar({ length: 20 }).notNull(),
    nombres: varchar({ length: 100 }).notNull(),
    apellidos: varchar({ length: 100 }).notNull(),
    fechaNacimiento: date("fecha_nacimiento"),
    genero: char({ length: 1 }),
    estadoCivil: varchar("estado_civil", { length: 20 }),
    telefono: varchar({ length: 15 }),
    celular: varchar({ length: 15 }),
    email: varchar({ length: 100 }),
    direccion: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idDepartamento: bigint("id_departamento", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idCargo: bigint("id_cargo", { mode: "number" }),
    fechaIngreso: date("fecha_ingreso").notNull(),
    fechaRetiro: date("fecha_retiro"),
    tipoContrato: varchar("tipo_contrato", { length: 50 }),
    salarioBase: numeric("salario_base", { precision: 10, scale: 2 }).notNull(),
    estado: varchar({ length: 20 }).default("ACTIVO").notNull(),
    banco: varchar({ length: 100 }),
    numeroCuenta: varchar("numero_cuenta", { length: 30 }),
    tipoCuenta: varchar("tipo_cuenta", { length: 20 }),
    numeroDependientes: integer("numero_dependientes").default(0).notNull(),
    exentoIsr: boolean("exento_isr").default(false).notNull(),
    montoAfp: numeric("monto_afp", { precision: 10, scale: 2 }).default("0").notNull(),
    montoSfs: numeric("monto_sfs", { precision: 10, scale: 2 }).default("0").notNull(),
    montoIsr: numeric("monto_isr", { precision: 10, scale: 2 }).default("0").notNull(),
    otrosDescuentos: numeric("otros_descuentos", { precision: 10, scale: 2 }).default("0").notNull(),
    tipoSalario: varchar("tipo_salario", { length: 20 }).default("MENSUAL").notNull(),
    usuarioId: uuid("usuario_id"),
    fechaCreacion: timestamp("fecha_creacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaModificacion: timestamp("fecha_modificacion", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("empleados_cedula_key").using("btree", table.cedula.asc().nullsLast().op("text_ops")),
    uniqueIndex("empleados_codigo_empleado_key").using("btree", table.codigoEmpleado.asc().nullsLast().op("text_ops")),
    index("empleados_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("empleados_id_cargo_idx").using("btree", table.idCargo.asc().nullsLast().op("int8_ops")),
    index("empleados_id_departamento_idx").using("btree", table.idDepartamento.asc().nullsLast().op("int8_ops")),
    uniqueIndex("empleados_usuario_id_key").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.idCargo],
      foreignColumns: [cargos.idCargo],
      name: "empleados_id_cargo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.idDepartamento],
      foreignColumns: [departamentos.idDepartamento],
      name: "empleados_id_departamento_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "empleados_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const nomina = pgTable(
  "nomina",
  {
    idNomina: bigserial("id_nomina", { mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idPeriodo: bigint("id_periodo", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    idEmpleado: bigint("id_empleado", { mode: "number" }).notNull(),
    diasTrabajados: integer("dias_trabajados").notNull(),
    horasTrabajadas: numeric("horas_trabajadas", { precision: 6, scale: 2 }),
    salarioBase: numeric("salario_base", { precision: 10, scale: 2 }).notNull(),
    horasExtrasOrdinarias: numeric("horas_extras_ordinarias", { precision: 10, scale: 2 }).default("0").notNull(),
    horasExtrasNocturnas: numeric("horas_extras_nocturnas", { precision: 10, scale: 2 }).default("0").notNull(),
    horasExtrasFeriados: numeric("horas_extras_feriados", { precision: 10, scale: 2 }).default("0").notNull(),
    bonificaciones: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    comisiones: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    viaticos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    subsidios: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    retroactivos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    vacacionesPagadas: numeric("vacaciones_pagadas", { precision: 10, scale: 2 }).default("0").notNull(),
    otrosIngresos: numeric("otros_ingresos", { precision: 10, scale: 2 }).default("0").notNull(),
    seguridadSocial: numeric("seguridad_social", { precision: 10, scale: 2 }).default("0").notNull(),
    seguroSalud: numeric("seguro_salud", { precision: 10, scale: 2 }).default("0").notNull(),
    isr: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    prestamos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    adelantos: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    faltas: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    tardanzas: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    otrasDeducciones: numeric("otras_deducciones", { precision: 10, scale: 2 }).default("0").notNull(),
    totalIngresos: numeric("total_ingresos", { precision: 12, scale: 2 }).notNull(),
    totalDeducciones: numeric("total_deducciones", { precision: 12, scale: 2 }).notNull(),
    salarioNeto: numeric("salario_neto", { precision: 12, scale: 2 }).notNull(),
    formaPago: varchar("forma_pago", { length: 20 }),
    montoBanco: numeric("monto_banco", { precision: 12, scale: 2 }).default("0").notNull(),
    montoCaja: numeric("monto_caja", { precision: 12, scale: 2 }).default("0").notNull(),
    numeroTransaccion: varchar("numero_transaccion", { length: 50 }),
    cuentaBancariaId: uuid("cuenta_bancaria_id"),
    fechaPago: date("fecha_pago"),
    estadoPago: varchar("estado_pago", { length: 20 }).default("PENDIENTE").notNull(),
    fechaCalculo: timestamp("fecha_calculo", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    calculadoPor: bigint("calculado_por", { mode: "number" }),
    observaciones: text(),
  },
  (table) => [
    index("nomina_estado_pago_idx").using("btree", table.estadoPago.asc().nullsLast().op("text_ops")),
    index("nomina_fecha_pago_idx").using("btree", table.fechaPago.asc().nullsLast().op("date_ops")),
    index("nomina_id_empleado_idx").using("btree", table.idEmpleado.asc().nullsLast().op("int8_ops")),
    uniqueIndex("nomina_id_periodo_id_empleado_key").using(
      "btree",
      table.idPeriodo.asc().nullsLast().op("int8_ops"),
      table.idEmpleado.asc().nullsLast().op("int8_ops"),
    ),
    index("nomina_id_periodo_idx").using("btree", table.idPeriodo.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.calculadoPor],
      foreignColumns: [empleados.idEmpleado],
      name: "nomina_calculado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.idEmpleado],
      foreignColumns: [empleados.idEmpleado],
      name: "nomina_id_empleado_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.idPeriodo],
      foreignColumns: [periodosNomina.idPeriodo],
      name: "nomina_id_periodo_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
      name: "nomina_cuenta_bancaria_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const cuentasPorPagar = pgTable(
  "cuentas_por_pagar",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    proveedorId: uuid("proveedor_id"),
    numeroDocumento: varchar("numero_documento", { length: 30 }).notNull(),
    tipoDocumento: varchar("tipo_documento", { length: 20 }).notNull(),
    fechaEmision: date("fecha_emision").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    concepto: varchar({ length: 200 }).notNull(),
    montoOriginal: numeric("monto_original", { precision: 12, scale: 2 }).notNull(),
    montoPendiente: numeric("monto_pendiente", { precision: 12, scale: 2 }).notNull(),
    cuotaMensual: numeric("cuota_mensual", { precision: 12, scale: 2 }),
    moneda: varchar({ length: 3 }).default("DOP").notNull(),
    estado: varchar({ length: 20 }).default("pendiente").notNull(),
    diasVencido: integer("dias_vencido").default(0).notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    numeroCuotas: integer("numero_cuotas"),
    tipo: varchar({ length: 20 }).default("factura").notNull(),
  },
  (table) => [
    index("cuentas_por_pagar_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    index("cuentas_por_pagar_fecha_vencimiento_idx").using(
      "btree",
      table.fechaVencimiento.asc().nullsLast().op("date_ops"),
    ),
    uniqueIndex("cuentas_por_pagar_numero_documento_key").using(
      "btree",
      table.numeroDocumento.asc().nullsLast().op("text_ops"),
    ),
    index("cuentas_por_pagar_proveedor_id_idx").using("btree", table.proveedorId.asc().nullsLast().op("uuid_ops")),
    index("cuentas_por_pagar_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.proveedorId],
      foreignColumns: [proveedores.id],
      name: "cuentas_por_pagar_proveedor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const aperturasCaja = pgTable(
  "aperturas_caja",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cajaId: uuid("caja_id").notNull(),
    montoInicial: numeric("monto_inicial", { precision: 12, scale: 2 }).notNull(),
    fechaApertura: timestamp("fecha_apertura", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("aperturas_caja_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("aperturas_caja_fecha_apertura_idx").using(
      "btree",
      table.fechaApertura.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("aperturas_caja_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "aperturas_caja_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "aperturas_caja_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const sesionesCaja = pgTable(
  "sesiones_caja",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    cajaId: uuid("caja_id").notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    fechaApertura: timestamp("fecha_apertura", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaCierre: timestamp("fecha_cierre", { precision: 6, withTimezone: true, mode: "string" }),
    montoApertura: numeric("monto_apertura", { precision: 12, scale: 2 }).notNull(),
    montoCierre: numeric("monto_cierre", { precision: 12, scale: 2 }),
    estado: varchar({ length: 20 }).default("abierta").notNull(), // abierta, cerrada
    observaciones: text(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("sesiones_caja_caja_id_idx").using("btree", table.cajaId.asc().nullsLast().op("uuid_ops")),
    index("sesiones_caja_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    index("sesiones_caja_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.cajaId],
      foreignColumns: [cajas.id],
      name: "sesiones_caja_caja_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "sesiones_caja_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    username: varchar({ length: 50 }).notNull(),
    nombre: varchar({ length: 100 }).notNull(),
    apellido: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 100 }),
    telefono: varchar({ length: 20 }),
    cedula: varchar({ length: 20 }),
    direccion: text(),
    fechaNacimiento: date("fecha_nacimiento"),
    sexo: char({ length: 1 }),
    avatar: text(),
    passwordHash: text("password_hash").notNull(),
    activo: boolean().default(true).notNull(),
    esEmpleado: boolean("es_empleado").default(false).notNull(),
    esCliente: boolean("es_cliente").default(false).notNull(),
    notas: text(),
    ultimoAcceso: timestamp("ultimo_acceso", { precision: 6, withTimezone: true, mode: "string" }),
    intentosFallidos: integer("intentos_fallidos").default(0).notNull(),
    bloqueadoHasta: timestamp("bloqueado_hasta", { precision: 6, withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: "string" }).notNull(),
    tokenVersion: integer("token_version").default(1),
  },
  (table) => [
    uniqueIndex("usuarios_cedula_key").using("btree", table.cedula.asc().nullsLast().op("text_ops")),
    uniqueIndex("usuarios_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
    index("usuarios_ultimo_acceso_idx").using("btree", table.ultimoAcceso.asc().nullsLast().op("timestamptz_ops")),
    uniqueIndex("usuarios_username_key").using("btree", table.username.asc().nullsLast().op("text_ops")),
  ],
);

export const rolesPermisos = pgTable(
  "roles_permisos",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    rolId: bigint("rol_id", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    permisoId: bigint("permiso_id", { mode: "number" }).notNull(),
    activo: boolean().default(true).notNull(),
    fechaAsignacion: timestamp("fecha_asignacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    asignadoPor: uuid("asignado_por"),
  },
  (table) => [
    index("roles_permisos_fecha_asignacion_idx").using(
      "btree",
      table.fechaAsignacion.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("roles_permisos_permiso_id_idx").using("btree", table.permisoId.asc().nullsLast().op("int8_ops")),
    index("roles_permisos_rol_id_idx").using("btree", table.rolId.asc().nullsLast().op("int8_ops")),
    foreignKey({
      columns: [table.asignadoPor],
      foreignColumns: [usuarios.id],
      name: "roles_permisos_asignado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.permisoId],
      foreignColumns: [permisos.id],
      name: "roles_permisos_permiso_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "roles_permisos_rol_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({ columns: [table.rolId, table.permisoId], name: "roles_permisos_pkey" }),
  ],
);

export const usuariosRoles = pgTable(
  "usuarios_roles",
  {
    usuarioId: uuid("usuario_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    rolId: bigint("rol_id", { mode: "number" }).notNull(),
    activo: boolean().default(true).notNull(),
    fechaAsignacion: timestamp("fecha_asignacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaVencimiento: timestamp("fecha_vencimiento", { precision: 6, withTimezone: true, mode: "string" }),
    asignadoPor: uuid("asignado_por"),
  },
  (table) => [
    index("usuarios_roles_fecha_asignacion_idx").using(
      "btree",
      table.fechaAsignacion.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("usuarios_roles_rol_id_idx").using("btree", table.rolId.asc().nullsLast().op("int8_ops")),
    index("usuarios_roles_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.asignadoPor],
      foreignColumns: [usuarios.id],
      name: "usuarios_roles_asignado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.rolId],
      foreignColumns: [roles.id],
      name: "usuarios_roles_rol_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "usuarios_roles_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({ columns: [table.usuarioId, table.rolId], name: "usuarios_roles_pkey" }),
  ],
);

export const usuariosPermisos = pgTable(
  "usuarios_permisos",
  {
    usuarioId: uuid("usuario_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    permisoId: bigint("permiso_id", { mode: "number" }).notNull(),
    activo: boolean().default(true).notNull(),
    fechaAsignacion: timestamp("fecha_asignacion", { precision: 6, withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fechaVencimiento: timestamp("fecha_vencimiento", { precision: 6, withTimezone: true, mode: "string" }),
    asignadoPor: uuid("asignado_por"),
    motivo: text(),
  },
  (table) => [
    index("usuarios_permisos_fecha_asignacion_idx").using(
      "btree",
      table.fechaAsignacion.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("usuarios_permisos_fecha_vencimiento_idx").using(
      "btree",
      table.fechaVencimiento.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("usuarios_permisos_permiso_id_idx").using("btree", table.permisoId.asc().nullsLast().op("int8_ops")),
    index("usuarios_permisos_usuario_id_idx").using("btree", table.usuarioId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.asignadoPor],
      foreignColumns: [usuarios.id],
      name: "usuarios_permisos_asignado_por_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.permisoId],
      foreignColumns: [permisos.id],
      name: "usuarios_permisos_permiso_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.usuarioId],
      foreignColumns: [usuarios.id],
      name: "usuarios_permisos_usuario_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    primaryKey({ columns: [table.usuarioId, table.permisoId], name: "usuarios_permisos_pkey" }),
  ],
);
