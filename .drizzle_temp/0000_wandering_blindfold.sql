-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."CategoriaCliente" AS ENUM('NUEVO', 'VIEJO', 'VIP', 'INACTIVO');--> statement-breakpoint
CREATE TYPE "public"."EstadoCompraPapeleria" AS ENUM('BORRADOR', 'PENDIENTE', 'PROCESADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."EstadoVentaPapeleria" AS ENUM('PENDIENTE', 'COMPLETADA', 'CANCELADA', 'DEVUELTA');--> statement-breakpoint
CREATE TYPE "public"."MetodoPagoPapeleria" AS ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."Sexo" AS ENUM('MASCULINO', 'FEMENINO', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."TipoMovimientoInventario" AS ENUM('ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA', 'DEVOLUCION');--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"sesion_id" uuid,
	"accion" varchar(100) NOT NULL,
	"tabla_afectada" varchar(100),
	"registro_afectado_id" text,
	"detalles_anteriores" jsonb,
	"detalles_nuevos" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"metodo" varchar(10),
	"ruta" varchar(255),
	"resultado" varchar(20) DEFAULT 'exitoso' NOT NULL,
	"mensaje_error" text,
	"duracion_ms" integer,
	"fecha_hora" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargos" (
	"id_cargo" bigserial PRIMARY KEY NOT NULL,
	"nombre_cargo" varchar(100) NOT NULL,
	"descripcion" text,
	"salario_minimo" numeric(10, 2),
	"salario_maximo" numeric(10, 2),
	"nivel_cargo" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_creacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comisiones" (
	"id_comision" bigserial PRIMARY KEY NOT NULL,
	"id_empleado" bigint NOT NULL,
	"id_tipo_comision" bigint NOT NULL,
	"periodo_año" integer NOT NULL,
	"periodo_mes" integer NOT NULL,
	"monto_base" numeric(12, 2) NOT NULL,
	"porcentaje_aplicado" numeric(5, 2) NOT NULL,
	"monto_comision" numeric(10, 2) NOT NULL,
	"descripcion" text,
	"fecha_generacion" date DEFAULT CURRENT_DATE NOT NULL,
	"estado" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_pago" date,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "departamentos" (
	"id_departamento" bigserial PRIMARY KEY NOT NULL,
	"nombre_departamento" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_creacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_modificacion" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_salarios" (
	"id_historial" bigserial PRIMARY KEY NOT NULL,
	"id_empleado" bigint NOT NULL,
	"salario_anterior" numeric(10, 2),
	"salario_nuevo" numeric(10, 2) NOT NULL,
	"motivo" varchar(200),
	"fecha_efectiva" date NOT NULL,
	"aprobado_por" bigint,
	"fecha_registro" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalle_compras_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"producto_id" bigint NOT NULL,
	"cantidad" numeric(10, 3) NOT NULL,
	"costo_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0' NOT NULL,
	"impuesto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"fecha_vencimiento" date,
	"lote" varchar(50),
	"orden" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalle_facturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factura_id" uuid NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"cantidad" numeric(10, 3) DEFAULT '1' NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0' NOT NULL,
	"impuesto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"servicio_id" uuid,
	"producto_id" bigint,
	"orden" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalle_asientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asiento_id" uuid NOT NULL,
	"cuenta_id" uuid,
	"caja_id" uuid,
	"descripcion" text,
	"debe" numeric(15, 2) DEFAULT '0' NOT NULL,
	"haber" numeric(15, 2) DEFAULT '0' NOT NULL,
	"orden" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomina_prestamos" (
	"id_nomina_prestamo" bigserial PRIMARY KEY NOT NULL,
	"id_nomina" bigint NOT NULL,
	"id_prestamo" bigint NOT NULL,
	"id_pago_prestamo" bigint NOT NULL,
	"monto_deducido" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomina_comisiones" (
	"id_nomina_comision" bigserial PRIMARY KEY NOT NULL,
	"id_nomina" bigint NOT NULL,
	"id_comision" bigint NOT NULL,
	"monto_pagado" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodos_vacaciones" (
	"id_periodo_vacacion" bigserial PRIMARY KEY NOT NULL,
	"id_empleado" bigint NOT NULL,
	"id_tipo_vacacion" bigint NOT NULL,
	"ano" integer NOT NULL,
	"dias_ganados" numeric(4, 2) NOT NULL,
	"dias_tomados" numeric(4, 2) DEFAULT '0' NOT NULL,
	"dias_pagados" numeric(4, 2) DEFAULT '0' NOT NULL,
	"dias_disponibles" numeric(4, 2) NOT NULL,
	"fecha_corte" date,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "solicitudes_vacaciones" (
	"id_solicitud_vacacion" bigserial PRIMARY KEY NOT NULL,
	"id_empleado" bigint NOT NULL,
	"id_tipo_vacacion" bigint NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"dias_solicitados" integer NOT NULL,
	"motivo" text,
	"fecha_solicitud" date DEFAULT CURRENT_DATE NOT NULL,
	"estado" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"aprobado_por" bigint,
	"fecha_aprobacion" date,
	"observaciones_aprobacion" text,
	"pago_adelantado" boolean DEFAULT false NOT NULL,
	"monto_pago" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "pagos_prestamos" (
	"id_pago_prestamo" bigserial PRIMARY KEY NOT NULL,
	"id_prestamo" bigint NOT NULL,
	"numero_cuota" integer NOT NULL,
	"fecha_programada" date NOT NULL,
	"fecha_pago" date,
	"monto_cota" numeric(10, 2) NOT NULL,
	"monto_capital" numeric(10, 2) NOT NULL,
	"monto_interes" numeric(10, 2) NOT NULL,
	"monto_pagado" numeric(10, 2),
	"saldo_restante" numeric(12, 2),
	"estado" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "periodos_nomina" (
	"id_periodo" bigserial PRIMARY KEY NOT NULL,
	"codigo_periodo" varchar(20) NOT NULL,
	"ano" integer NOT NULL,
	"mes" integer,
	"quincena" integer,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"fecha_pago" date NOT NULL,
	"estado" varchar(20) DEFAULT 'ABIERTO' NOT NULL,
	"tipo_periodo" varchar(20) NOT NULL,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id_prestamo" bigserial PRIMARY KEY NOT NULL,
	"id_empleado" bigint NOT NULL,
	"id_tipo_prestamo" bigint NOT NULL,
	"codigo_prestamo" varchar(20) NOT NULL,
	"monto_solicitado" numeric(12, 2) NOT NULL,
	"monto_aprobado" numeric(12, 2) NOT NULL,
	"tasa_interes" numeric(5, 2),
	"plazo_meses" integer NOT NULL,
	"cuota_mensual" numeric(10, 2) NOT NULL,
	"fecha_solicitud" date DEFAULT CURRENT_DATE NOT NULL,
	"fecha_aprobacion" date,
	"fecha_desembolso" date,
	"fecha_primer_pago" date,
	"estado" varchar(20) DEFAULT 'SOLICITADO' NOT NULL,
	"saldo_pendiente" numeric(12, 2),
	"cuotas_pagadas" integer DEFAULT 0 NOT NULL,
	"motivo" text,
	"garantia" text,
	"observaciones" text,
	"metodo_pago" varchar(50),
	"caja_id" uuid,
	"cuenta_bancaria_id" uuid,
	"observaciones_aprobacion" text,
	"aprobado_por" bigint,
	"fecha_creacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_comision" (
	"id_tipo_comision" bigserial PRIMARY KEY NOT NULL,
	"nombre_tipo" varchar(100) NOT NULL,
	"descripcion" text,
	"porcentaje_base" numeric(5, 2),
	"monto_fijo" numeric(10, 2),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias_cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"subtipo" varchar(50),
	"padre_id" uuid,
	"nivel" integer DEFAULT 1 NOT NULL,
	"es_detalle" boolean DEFAULT true NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"codigo_cliente" varchar(20) NOT NULL,
	"cedula" varchar(20),
	"nombre" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"telefono" varchar(20),
	"telefono_secundario" varchar(20),
	"email" varchar(100),
	"direccion" text,
	"sector_barrio" varchar(100),
	"ciudad" varchar(50),
	"provincia" varchar(50),
	"codigo_postal" varchar(10),
	"coordenadas_lat" numeric(10, 8),
	"coordenadas_lng" numeric(11, 8),
	"fecha_suscripcion" date,
	"sexo" "Sexo",
	"foto_url" text,
	"contacto" varchar(100),
	"contacto_emergencia" varchar(100),
	"telefono_emergencia" varchar(20),
	"referencia_direccion" text,
	"tipo_cliente" varchar(20) DEFAULT 'residencial' NOT NULL,
	"categoria_cliente" "CategoriaCliente" DEFAULT 'NUEVO' NOT NULL,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"limite_crediticio" numeric(10, 2) DEFAULT '0' NOT NULL,
	"credito_disponible" numeric(10, 2) DEFAULT '0' NOT NULL,
	"dias_credito" integer DEFAULT 0 NOT NULL,
	"descuento_porcentaje" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notas" text,
	"referido_por" uuid,
	"fecha_ingreso" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_prestamo" (
	"id_tipo_prestamo" bigserial PRIMARY KEY NOT NULL,
	"nombre_tipo" varchar(100) NOT NULL,
	"descripcion" text,
	"monto_maximo" numeric(12, 2),
	"plazo_maximo_meses" integer,
	"tasa_interes" numeric(5, 2),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compras_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_compra" varchar(30) NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"fecha_compra" date NOT NULL,
	"numero_factura" varchar(50),
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"itbis" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"estado" "EstadoCompraPapeleria" DEFAULT 'PENDIENTE' NOT NULL,
	"forma_pago" varchar(20),
	"observaciones" text,
	"recibida_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"descripcion" text,
	"icono" varchar(100),
	"color" varchar(50),
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellido" varchar(100) NOT NULL,
	"email" varchar(100),
	"telefono" varchar(20),
	"cedula" varchar(20),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cierres_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caja_id" uuid NOT NULL,
	"monto_final" numeric(12, 2) NOT NULL,
	"ingresos_del_dia" numeric(12, 2) NOT NULL,
	"gastos_del_dia" numeric(12, 2) NOT NULL,
	"fecha_cierre" timestamp(6) with time zone NOT NULL,
	"usuario_id" uuid NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuraciones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"clave" varchar(100) NOT NULL,
	"valor" text NOT NULL,
	"descripcion" text,
	"tipo" varchar(20) DEFAULT 'string' NOT NULL,
	"es_publica" boolean DEFAULT false NOT NULL,
	"categoria" varchar(50) DEFAULT 'general' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias_papeleria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"icono" varchar(50),
	"color" varchar(7),
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_vacacion" (
	"id_tipo_vacacion" bigserial PRIMARY KEY NOT NULL,
	"nombre_tipo" varchar(100) NOT NULL,
	"descripcion" text,
	"dias_por_año" numeric(4, 2),
	"acumulable" boolean DEFAULT true NOT NULL,
	"maximo_acumulable" integer,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(100),
	"tipo" varchar(20) NOT NULL,
	"cliente_id" uuid,
	"ticket_id" uuid,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"creado_por" uuid NOT NULL,
	"ultimo_mensaje" timestamp(6) with time zone,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol" varchar(20) DEFAULT 'participante' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"codigo" varchar(10),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asientos_contables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_asiento" varchar(20) NOT NULL,
	"fecha_asiento" date NOT NULL,
	"descripcion" text NOT NULL,
	"tipo" varchar(20),
	"referencia" varchar(50),
	"total_debe" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_haber" numeric(15, 2) DEFAULT '0' NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"creado_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cajas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"tipo" varchar(20) NOT NULL,
	"cuenta_contable_id" uuid,
	"responsable_id" uuid,
	"saldo_inicial" numeric(12, 2) DEFAULT '0' NOT NULL,
	"saldo_actual" numeric(12, 2) DEFAULT '0' NOT NULL,
	"limite_maximo" numeric(12, 2),
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_original" varchar(255) NOT NULL,
	"nombre_archivo" varchar(255) NOT NULL,
	"ruta_archivo" varchar(500) NOT NULL,
	"tipo_mime" varchar(100) NOT NULL,
	"categoria" varchar(50),
	"descripcion" text,
	"es_publico" boolean DEFAULT false NOT NULL,
	"subido_por" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"cliente_id" uuid,
	"tamaño" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas_contables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"categoria_id" uuid,
	"tipo_cuenta" varchar(30) NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"saldo_inicial" numeric(15, 2) DEFAULT '0' NOT NULL,
	"saldo_actual" numeric(15, 2) DEFAULT '0' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_cuentas_por_pagar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_por_pagar_id" uuid NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"fecha_pago" date NOT NULL,
	"metodo_pago" varchar(50) NOT NULL,
	"numero_referencia" varchar(100),
	"observaciones" text,
	"creado_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensajes_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"tipo" varchar(20) DEFAULT 'texto' NOT NULL,
	"archivo_id" uuid,
	"leido" boolean DEFAULT false NOT NULL,
	"editado" boolean DEFAULT false NOT NULL,
	"fecha_edicion" timestamp(6) with time zone,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"razon_social" varchar(200),
	"rnc" varchar(50),
	"telefono" varchar(50),
	"email" varchar(100),
	"direccion" text,
	"ciudad" varchar(50),
	"provincia" varchar(50),
	"codigo_postal" varchar(20),
	"logo_url" text,
	"sitio_web" varchar(100),
	"moneda_principal" varchar(3) DEFAULT 'DOP' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_contrato" varchar(30) NOT NULL,
	"cliente_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"precio_mensual" numeric(10, 2) NOT NULL,
	"direccion_instalacion" text,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_contables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"categoria_id" uuid NOT NULL,
	"metodo" varchar(20) NOT NULL,
	"caja_id" uuid,
	"bank_id" uuid,
	"cuenta_bancaria_id" uuid,
	"descripcion" text,
	"fecha" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"cuenta_por_pagar_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pagos_clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factura_id" uuid,
	"cliente_id" uuid NOT NULL,
	"numero_pago" varchar(30) NOT NULL,
	"fecha_pago" date NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"metodo_pago" varchar(30) NOT NULL,
	"numero_referencia" varchar(50),
	"cuenta_bancaria_id" uuid,
	"caja_id" uuid,
	"estado" varchar(20) DEFAULT 'confirmado' NOT NULL,
	"observaciones" text,
	"recibido_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"fecha_inicio" timestamp(6) with time zone NOT NULL,
	"fecha_fin" timestamp(6) with time zone,
	"todo_el_dia" boolean DEFAULT false NOT NULL,
	"color" varchar(7),
	"ubicacion" text,
	"creado_por_id" uuid NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facturas_clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_factura" varchar(30) NOT NULL,
	"cliente_id" uuid NOT NULL,
	"contrato_id" uuid,
	"tipo_factura" varchar(20) DEFAULT 'servicio' NOT NULL,
	"fecha_factura" date NOT NULL,
	"fecha_vencimiento" date,
	"periodo_facturado_inicio" date,
	"periodo_facturado_fin" date,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"itbis" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"forma_pago" varchar(20),
	"observaciones" text,
	"facturada_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"numero_cuenta" varchar(50) NOT NULL,
	"tipo_cuenta" varchar(50),
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"nombre_oficial_cuenta" varchar(150),
	"cuenta_contable_id" uuid NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas_por_cobrar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factura_id" uuid,
	"cliente_id" uuid NOT NULL,
	"numero_documento" varchar(30) NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"monto_original" numeric(12, 2) NOT NULL,
	"monto_pendiente" numeric(12, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"dias_vencido" integer DEFAULT 0 NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_fijos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"monto" numeric(12, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"dia_vencimiento" integer NOT NULL,
	"cuenta_contable_id" uuid,
	"proveedor_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"proximo_vencimiento" date,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipos_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"suscripcion_id" uuid,
	"tipo_equipo" varchar(50) NOT NULL,
	"marca" varchar(100) NOT NULL,
	"modelo" varchar(100) NOT NULL,
	"numero_serie" varchar(100) NOT NULL,
	"mac_address" varchar(17),
	"ip_asignada" "inet",
	"estado" varchar(20) DEFAULT 'instalado' NOT NULL,
	"fecha_instalacion" date,
	"fecha_retiro" date,
	"ubicacion" text,
	"notas" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"contrato_id" uuid
);
--> statement-breakpoint
CREATE TABLE "movimientos_inventario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" bigint NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_movimiento" "TipoMovimientoInventario" NOT NULL,
	"cantidad" integer NOT NULL,
	"cantidad_anterior" integer NOT NULL,
	"cantidad_nueva" integer NOT NULL,
	"motivo" varchar(100) NOT NULL,
	"referencia" varchar(100),
	"notas" text,
	"fecha_movimiento" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"descripcion_corta" text,
	"categoria_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"es_recurrente" boolean DEFAULT false NOT NULL,
	"requiere_plan" boolean DEFAULT false NOT NULL,
	"precio_base" numeric(10, 2),
	"moneda" varchar(3) DEFAULT 'USD' NOT NULL,
	"unidad_tiempo" varchar(50),
	"imagen" text,
	"caracteristicas" jsonb,
	"activo" boolean DEFAULT true NOT NULL,
	"destacado" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suscripciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"servicio_id" uuid,
	"plan_id" bigint,
	"usuario_id" uuid,
	"numero_contrato" varchar(50) NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_vencimiento" date,
	"fecha_instalacion" date,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"precio_mensual" numeric(10, 2) NOT NULL,
	"descuento_aplicado" numeric(5, 2) DEFAULT '0' NOT NULL,
	"fecha_proximo_pago" date,
	"dia_facturacion" integer DEFAULT 1 NOT NULL,
	"notas_instalacion" text,
	"notas_servicio" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"razon_social" varchar(200),
	"rnc" varchar(20),
	"telefono" varchar(20),
	"email" varchar(100),
	"direccion" text,
	"contacto" varchar(100),
	"telefono_contacto" varchar(20),
	"email_contacto" varchar(100),
	"tipo_proveedor" varchar(30) DEFAULT 'papeleria' NOT NULL,
	"condiciones_pago" text,
	"dias_credito" integer,
	"limite_credito" numeric(12, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ventas_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_venta" varchar(50) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"cliente_nombre" varchar(200),
	"cliente_cedula" varchar(20),
	"fecha_venta" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"impuestos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"descuentos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD' NOT NULL,
	"metodo_pago" "MetodoPagoPapeleria" DEFAULT 'EFECTIVO' NOT NULL,
	"estado" "EstadoVentaPapeleria" DEFAULT 'COMPLETADA' NOT NULL,
	"notas" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"cliente_id" uuid,
	"cuenta_bancaria_id" uuid,
	"caja_id" uuid,
	"movimiento_contable_id" uuid
);
--> statement-breakpoint
CREATE TABLE "planes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"categoria_id" uuid NOT NULL,
	"precio" numeric(10, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"subida_kbps" integer NOT NULL,
	"bajada_mbps" integer NOT NULL,
	"detalles" jsonb,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_ticket" varchar(20) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"suscripcion_id" uuid,
	"asunto" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"categoria" varchar(50) NOT NULL,
	"prioridad" varchar(20) DEFAULT 'media' NOT NULL,
	"estado" varchar(20) DEFAULT 'abierto' NOT NULL,
	"fecha_creacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_cierre" timestamp(6) with time zone,
	"tiempo_respuesta" integer,
	"satisfaccion" integer,
	"notas" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"tecnico_asignado_id" bigint,
	"cliente_id" uuid,
	"contrato_id" uuid
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre_rol" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"es_sistema" boolean DEFAULT false NOT NULL,
	"prioridad" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "respuestas_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"es_interno" boolean DEFAULT false NOT NULL,
	"fecha_respuesta" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"imagen_url" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_pagos_fijos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_fijo_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"monto_pagado" numeric(12, 2) NOT NULL,
	"metodo_pago" varchar(30) NOT NULL,
	"numero_referencia" varchar(50),
	"observaciones" text,
	"pagado_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tareas" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"color" text NOT NULL,
	"completada" boolean DEFAULT false NOT NULL,
	"creadoPorId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permisos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre_permiso" varchar(100) NOT NULL,
	"descripcion" text,
	"categoria" varchar(50) DEFAULT 'general' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"es_sistema" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traspasos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_traspaso" varchar(30) NOT NULL,
	"fecha_traspaso" timestamp(6) with time zone NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"concepto_traspaso" text NOT NULL,
	"banco_origen_id" uuid,
	"banco_destino_id" uuid,
	"caja_origen_id" uuid,
	"caja_destino_id" uuid,
	"estado" varchar(20) DEFAULT 'completado' NOT NULL,
	"observaciones" text,
	"autorizado_por" uuid,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones_usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"activa" boolean DEFAULT true NOT NULL,
	"fecha_inicio" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_ultimo_uso" timestamp(6) with time zone NOT NULL,
	"fecha_expiracion" timestamp(6) with time zone NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empleados" (
	"id_empleado" bigserial PRIMARY KEY NOT NULL,
	"codigo_empleado" varchar(20) NOT NULL,
	"cedula" varchar(20) NOT NULL,
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"fecha_nacimiento" date,
	"genero" char(1),
	"estado_civil" varchar(20),
	"telefono" varchar(15),
	"celular" varchar(15),
	"email" varchar(100),
	"direccion" text,
	"id_departamento" bigint,
	"id_cargo" bigint,
	"fecha_ingreso" date NOT NULL,
	"fecha_retiro" date,
	"tipo_contrato" varchar(50),
	"salario_base" numeric(10, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'ACTIVO' NOT NULL,
	"banco" varchar(100),
	"numero_cuenta" varchar(30),
	"tipo_cuenta" varchar(20),
	"numero_dependientes" integer DEFAULT 0 NOT NULL,
	"exento_isr" boolean DEFAULT false NOT NULL,
	"monto_afp" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monto_sfs" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monto_isr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"otros_descuentos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tipo_salario" varchar(20) DEFAULT 'MENSUAL' NOT NULL,
	"usuario_id" uuid,
	"fecha_creacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_modificacion" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomina" (
	"id_nomina" bigserial PRIMARY KEY NOT NULL,
	"id_periodo" bigint NOT NULL,
	"id_empleado" bigint NOT NULL,
	"dias_trabajados" integer NOT NULL,
	"horas_trabajadas" numeric(6, 2),
	"salario_base" numeric(10, 2) NOT NULL,
	"horas_extras_ordinarias" numeric(10, 2) DEFAULT '0' NOT NULL,
	"horas_extras_nocturnas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"horas_extras_feriados" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bonificaciones" numeric(10, 2) DEFAULT '0' NOT NULL,
	"comisiones" numeric(10, 2) DEFAULT '0' NOT NULL,
	"viaticos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"subsidios" numeric(10, 2) DEFAULT '0' NOT NULL,
	"retroactivos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vacaciones_pagadas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"otros_ingresos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"seguridad_social" numeric(10, 2) DEFAULT '0' NOT NULL,
	"seguro_salud" numeric(10, 2) DEFAULT '0' NOT NULL,
	"isr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"prestamos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"adelantos" numeric(10, 2) DEFAULT '0' NOT NULL,
	"faltas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tardanzas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"otras_deducciones" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_ingresos" numeric(12, 2) NOT NULL,
	"total_deducciones" numeric(12, 2) NOT NULL,
	"salario_neto" numeric(12, 2) NOT NULL,
	"forma_pago" varchar(20),
	"monto_banco" numeric(12, 2) DEFAULT '0' NOT NULL,
	"monto_caja" numeric(12, 2) DEFAULT '0' NOT NULL,
	"numero_transaccion" varchar(50),
	"cuenta_bancaria_id" uuid,
	"fecha_pago" date,
	"estado_pago" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_calculo" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"calculado_por" bigint,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellido" varchar(100) NOT NULL,
	"email" varchar(100),
	"telefono" varchar(20),
	"cedula" varchar(20),
	"direccion" text,
	"fecha_nacimiento" date,
	"sexo" char(1),
	"avatar" text,
	"password_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"es_empleado" boolean DEFAULT false NOT NULL,
	"es_cliente" boolean DEFAULT false NOT NULL,
	"notas" text,
	"ultimo_acceso" timestamp(6) with time zone,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp(6) with time zone,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"token_version" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "aperturas_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caja_id" uuid NOT NULL,
	"monto_inicial" numeric(12, 2) NOT NULL,
	"fecha_apertura" timestamp(6) with time zone NOT NULL,
	"usuario_id" uuid NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones_caja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caja_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fecha_apertura" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_cierre" timestamp(6) with time zone,
	"monto_apertura" numeric(12, 2) NOT NULL,
	"monto_cierre" numeric(12, 2),
	"estado" varchar(20) DEFAULT 'abierta' NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proveedor_id" uuid,
	"numero_documento" varchar(30) NOT NULL,
	"tipo_documento" varchar(20) NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"monto_original" numeric(12, 2) NOT NULL,
	"monto_pendiente" numeric(12, 2) NOT NULL,
	"cuota_mensual" numeric(12, 2),
	"moneda" varchar(3) DEFAULT 'DOP' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"dias_vencido" integer DEFAULT 0 NOT NULL,
	"observaciones" text,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"numero_cuotas" integer,
	"tipo" varchar(20) DEFAULT 'factura' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caja_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caja_id" uuid NOT NULL,
	"descripcion" varchar(255) NOT NULL,
	"saldo_establecido" numeric(15, 2) NOT NULL,
	"total_ingresos" numeric(15, 2) NOT NULL,
	"total_gastos" numeric(15, 2) NOT NULL,
	"cantidad_movimientos" integer NOT NULL,
	"fecha_checkpoint" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"creado_por" uuid,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "productos_papeleria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"categoria_id" bigint NOT NULL,
	"marca" varchar(100),
	"modelo" varchar(100),
	"unidad_medida" varchar(20) NOT NULL,
	"precio_compra" numeric(10, 2) NOT NULL,
	"precio_venta" numeric(10, 2) NOT NULL,
	"margen_ganancia" numeric(5, 2) NOT NULL,
	"stock_minimo" integer DEFAULT 0 NOT NULL,
	"stock_actual" integer DEFAULT 0 NOT NULL,
	"ubicacion" varchar(100),
	"codigo_barras" varchar(50),
	"imagen" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"proveedor_id" uuid,
	"aplica_impuesto" boolean DEFAULT false NOT NULL,
	"tasa_impuesto" numeric(5, 2) DEFAULT '0' NOT NULL,
	"costo_promedio" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalles_venta_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venta_id" uuid NOT NULL,
	"producto_id" bigint NOT NULL,
	"nombre_producto" varchar(200),
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"impuesto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"lote" varchar(50),
	"cantidad_devuelta" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_costos_papeleria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" bigint NOT NULL,
	"costo_anterior" numeric(10, 2) NOT NULL,
	"costo_nuevo" numeric(10, 2) NOT NULL,
	"fecha_cambio" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" uuid,
	"motivo" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "roles_permisos" (
	"rol_id" bigint NOT NULL,
	"permiso_id" bigint NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_asignacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"asignado_por" uuid,
	CONSTRAINT "roles_permisos_pkey" PRIMARY KEY("rol_id","permiso_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios_roles" (
	"usuario_id" uuid NOT NULL,
	"rol_id" bigint NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_asignacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_vencimiento" timestamp(6) with time zone,
	"asignado_por" uuid,
	CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY("usuario_id","rol_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios_permisos" (
	"usuario_id" uuid NOT NULL,
	"permiso_id" bigint NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_asignacion" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fecha_vencimiento" timestamp(6) with time zone,
	"asignado_por" uuid,
	"motivo" text,
	CONSTRAINT "usuarios_permisos_pkey" PRIMARY KEY("usuario_id","permiso_id")
);
--> statement-breakpoint
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_id_tipo_comision_fkey" FOREIGN KEY ("id_tipo_comision") REFERENCES "public"."tipos_comision"("id_tipo_comision") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_salarios" ADD CONSTRAINT "historial_salarios_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."empleados"("id_empleado") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_salarios" ADD CONSTRAINT "historial_salarios_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_compras_papeleria" ADD CONSTRAINT "detalle_compras_papeleria_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "public"."compras_papeleria"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_compras_papeleria" ADD CONSTRAINT "detalle_compras_papeleria_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_papeleria"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_facturas" ADD CONSTRAINT "detalle_facturas_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas_clientes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_facturas" ADD CONSTRAINT "detalle_facturas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_papeleria"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_facturas" ADD CONSTRAINT "detalle_facturas_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_asientos" ADD CONSTRAINT "detalle_asientos_asiento_id_fkey" FOREIGN KEY ("asiento_id") REFERENCES "public"."asientos_contables"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_asientos" ADD CONSTRAINT "detalle_asientos_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalle_asientos" ADD CONSTRAINT "detalle_asientos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas_contables"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina_prestamos" ADD CONSTRAINT "nomina_prestamos_id_nomina_fkey" FOREIGN KEY ("id_nomina") REFERENCES "public"."nomina"("id_nomina") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina_prestamos" ADD CONSTRAINT "nomina_prestamos_id_pago_prestamo_fkey" FOREIGN KEY ("id_pago_prestamo") REFERENCES "public"."pagos_prestamos"("id_pago_prestamo") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina_prestamos" ADD CONSTRAINT "nomina_prestamos_id_prestamo_fkey" FOREIGN KEY ("id_prestamo") REFERENCES "public"."prestamos"("id_prestamo") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina_comisiones" ADD CONSTRAINT "nomina_comisiones_id_comision_fkey" FOREIGN KEY ("id_comision") REFERENCES "public"."comisiones"("id_comision") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina_comisiones" ADD CONSTRAINT "nomina_comisiones_id_nomina_fkey" FOREIGN KEY ("id_nomina") REFERENCES "public"."nomina"("id_nomina") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "periodos_vacaciones" ADD CONSTRAINT "periodos_vacaciones_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "periodos_vacaciones" ADD CONSTRAINT "periodos_vacaciones_id_tipo_vacacion_fkey" FOREIGN KEY ("id_tipo_vacacion") REFERENCES "public"."tipos_vacacion"("id_tipo_vacacion") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."empleados"("id_empleado") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_id_tipo_vacacion_fkey" FOREIGN KEY ("id_tipo_vacacion") REFERENCES "public"."tipos_vacacion"("id_tipo_vacacion") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_prestamos" ADD CONSTRAINT "pagos_prestamos_id_prestamo_fkey" FOREIGN KEY ("id_prestamo") REFERENCES "public"."prestamos"("id_prestamo") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "public"."empleados"("id_empleado") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_id_tipo_prestamo_fkey" FOREIGN KEY ("id_tipo_prestamo") REFERENCES "public"."tipos_prestamo"("id_tipo_prestamo") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categorias_cuentas" ADD CONSTRAINT "categorias_cuentas_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "public"."categorias_cuentas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_referido_por_fkey" FOREIGN KEY ("referido_por") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "compras_papeleria" ADD CONSTRAINT "compras_papeleria_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "compras_papeleria" ADD CONSTRAINT "compras_papeleria_recibida_por_fkey" FOREIGN KEY ("recibida_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_participantes" ADD CONSTRAINT "chat_participantes_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat_participantes" ADD CONSTRAINT "chat_participantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "asientos_contables" ADD CONSTRAINT "asientos_contables_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "public"."cuentas_contables"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_cuentas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_cuentas_por_pagar" ADD CONSTRAINT "pagos_cuentas_por_pagar_cuenta_por_pagar_id_fkey" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "public"."cuentas_por_pagar"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_cuentas_por_pagar" ADD CONSTRAINT "pagos_cuentas_por_pagar_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivos"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_cuentas"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_cuenta_por_pagar_id_fkey" FOREIGN KEY ("cuenta_por_pagar_id") REFERENCES "public"."cuentas_por_pagar"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas_clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_recibido_por_fkey" FOREIGN KEY ("recibido_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_facturada_por_fkey" FOREIGN KEY ("facturada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "public"."cuentas_contables"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_por_cobrar" ADD CONSTRAINT "cuentas_por_cobrar_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "public"."facturas_clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_fijos" ADD CONSTRAINT "pagos_fijos_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "public"."cuentas_contables"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_fijos" ADD CONSTRAINT "pagos_fijos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "equipos_cliente" ADD CONSTRAINT "equipos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "equipos_cliente" ADD CONSTRAINT "equipos_cliente_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "equipos_cliente" ADD CONSTRAINT "equipos_cliente_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "public"."suscripciones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_papeleria"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ventas_papeleria" ADD CONSTRAINT "ventas_papeleria_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ventas_papeleria" ADD CONSTRAINT "ventas_papeleria_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ventas_papeleria" ADD CONSTRAINT "ventas_papeleria_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ventas_papeleria" ADD CONSTRAINT "ventas_papeleria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ventas_papeleria" ADD CONSTRAINT "ventas_papeleria_movimiento_contable_id_fkey" FOREIGN KEY ("movimiento_contable_id") REFERENCES "public"."movimientos_contables"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "planes" ADD CONSTRAINT "planes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "public"."suscripciones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tecnico_asignado_id_fkey" FOREIGN KEY ("tecnico_asignado_id") REFERENCES "public"."empleados"("id_empleado") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "respuestas_tickets" ADD CONSTRAINT "respuestas_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "respuestas_tickets" ADD CONSTRAINT "respuestas_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_pagos_fijos" ADD CONSTRAINT "pagos_pagos_fijos_pagado_por_fkey" FOREIGN KEY ("pagado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pagos_pagos_fijos" ADD CONSTRAINT "pagos_pagos_fijos_pago_fijo_id_fkey" FOREIGN KEY ("pago_fijo_id") REFERENCES "public"."pagos_fijos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "traspasos" ADD CONSTRAINT "traspasos_autorizado_por_fkey" FOREIGN KEY ("autorizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "traspasos" ADD CONSTRAINT "traspasos_banco_destino_id_fkey" FOREIGN KEY ("banco_destino_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "traspasos" ADD CONSTRAINT "traspasos_banco_origen_id_fkey" FOREIGN KEY ("banco_origen_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "traspasos" ADD CONSTRAINT "traspasos_caja_destino_id_fkey" FOREIGN KEY ("caja_destino_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "traspasos" ADD CONSTRAINT "traspasos_caja_origen_id_fkey" FOREIGN KEY ("caja_origen_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sesiones_usuario" ADD CONSTRAINT "sesiones_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "public"."cargos"("id_cargo") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "public"."departamentos"("id_departamento") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_calculado_por_fkey" FOREIGN KEY ("calculado_por") REFERENCES "public"."empleados"("id_empleado") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "public"."empleados"("id_empleado") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_id_periodo_fkey" FOREIGN KEY ("id_periodo") REFERENCES "public"."periodos_nomina"("id_periodo") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "public"."cuentas_bancarias"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "aperturas_caja" ADD CONSTRAINT "aperturas_caja_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "aperturas_caja" ADD CONSTRAINT "aperturas_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar" ADD CONSTRAINT "cuentas_por_pagar_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "caja_checkpoints" ADD CONSTRAINT "caja_checkpoints_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_checkpoints" ADD CONSTRAINT "caja_checkpoints_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos_papeleria" ADD CONSTRAINT "productos_papeleria_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_papeleria"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "productos_papeleria" ADD CONSTRAINT "productos_papeleria_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalles_venta_papeleria" ADD CONSTRAINT "detalles_venta_papeleria_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_papeleria"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "detalles_venta_papeleria" ADD CONSTRAINT "detalles_venta_papeleria_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas_papeleria"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_costos_papeleria" ADD CONSTRAINT "historial_costos_papeleria_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_papeleria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_costos_papeleria" ADD CONSTRAINT "historial_costos_papeleria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_permisos" ADD CONSTRAINT "usuarios_permisos_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_permisos" ADD CONSTRAINT "usuarios_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios_permisos" ADD CONSTRAINT "usuarios_permisos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "bitacora_accion_idx" ON "bitacora" USING btree ("accion" text_ops);--> statement-breakpoint
CREATE INDEX "bitacora_fecha_hora_idx" ON "bitacora" USING btree ("fecha_hora" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "bitacora_metodo_idx" ON "bitacora" USING btree ("metodo" text_ops);--> statement-breakpoint
CREATE INDEX "bitacora_sesion_id_idx" ON "bitacora" USING btree ("sesion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "bitacora_tabla_afectada_idx" ON "bitacora" USING btree ("tabla_afectada" text_ops);--> statement-breakpoint
CREATE INDEX "bitacora_usuario_id_idx" ON "bitacora" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "comisiones_id_empleado_idx" ON "comisiones" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "comisiones_id_tipo_comision_idx" ON "comisiones" USING btree ("id_tipo_comision" int8_ops);--> statement-breakpoint
CREATE INDEX "comisiones_periodo_año_periodo_mes_idx" ON "comisiones" USING btree ("periodo_año" int4_ops,"periodo_mes" int4_ops);--> statement-breakpoint
CREATE INDEX "historial_salarios_aprobado_por_idx" ON "historial_salarios" USING btree ("aprobado_por" int8_ops);--> statement-breakpoint
CREATE INDEX "historial_salarios_fecha_efectiva_idx" ON "historial_salarios" USING btree ("fecha_efectiva" date_ops);--> statement-breakpoint
CREATE INDEX "historial_salarios_id_empleado_idx" ON "historial_salarios" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "detalle_compras_papeleria_compra_id_idx" ON "detalle_compras_papeleria" USING btree ("compra_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalle_compras_papeleria_producto_id_idx" ON "detalle_compras_papeleria" USING btree ("producto_id" int8_ops);--> statement-breakpoint
CREATE INDEX "detalle_facturas_factura_id_idx" ON "detalle_facturas" USING btree ("factura_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalle_facturas_producto_id_idx" ON "detalle_facturas" USING btree ("producto_id" int8_ops);--> statement-breakpoint
CREATE INDEX "detalle_facturas_servicio_id_idx" ON "detalle_facturas" USING btree ("servicio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalle_asientos_asiento_id_idx" ON "detalle_asientos" USING btree ("asiento_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalle_asientos_caja_id_idx" ON "detalle_asientos" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalle_asientos_cuenta_id_idx" ON "detalle_asientos" USING btree ("cuenta_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "nomina_prestamos_id_nomina_idx" ON "nomina_prestamos" USING btree ("id_nomina" int8_ops);--> statement-breakpoint
CREATE INDEX "nomina_prestamos_id_pago_prestamo_idx" ON "nomina_prestamos" USING btree ("id_pago_prestamo" int8_ops);--> statement-breakpoint
CREATE INDEX "nomina_prestamos_id_prestamo_idx" ON "nomina_prestamos" USING btree ("id_prestamo" int8_ops);--> statement-breakpoint
CREATE INDEX "nomina_comisiones_id_comision_idx" ON "nomina_comisiones" USING btree ("id_comision" int8_ops);--> statement-breakpoint
CREATE INDEX "nomina_comisiones_id_nomina_idx" ON "nomina_comisiones" USING btree ("id_nomina" int8_ops);--> statement-breakpoint
CREATE INDEX "periodos_vacaciones_ano_idx" ON "periodos_vacaciones" USING btree ("ano" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_vacaciones_id_empleado_ano_id_tipo_vacacion_key" ON "periodos_vacaciones" USING btree ("id_empleado" int4_ops,"ano" int8_ops,"id_tipo_vacacion" int8_ops);--> statement-breakpoint
CREATE INDEX "periodos_vacaciones_id_empleado_idx" ON "periodos_vacaciones" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "periodos_vacaciones_id_tipo_vacacion_idx" ON "periodos_vacaciones" USING btree ("id_tipo_vacacion" int8_ops);--> statement-breakpoint
CREATE INDEX "solicitudes_vacaciones_aprobado_por_idx" ON "solicitudes_vacaciones" USING btree ("aprobado_por" int8_ops);--> statement-breakpoint
CREATE INDEX "solicitudes_vacaciones_estado_idx" ON "solicitudes_vacaciones" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "solicitudes_vacaciones_fecha_inicio_idx" ON "solicitudes_vacaciones" USING btree ("fecha_inicio" date_ops);--> statement-breakpoint
CREATE INDEX "solicitudes_vacaciones_id_empleado_idx" ON "solicitudes_vacaciones" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "solicitudes_vacaciones_id_tipo_vacacion_idx" ON "solicitudes_vacaciones" USING btree ("id_tipo_vacacion" int8_ops);--> statement-breakpoint
CREATE INDEX "pagos_prestamos_fecha_pago_idx" ON "pagos_prestamos" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE INDEX "pagos_prestamos_fecha_programada_idx" ON "pagos_prestamos" USING btree ("fecha_programada" date_ops);--> statement-breakpoint
CREATE INDEX "pagos_prestamos_id_prestamo_idx" ON "pagos_prestamos" USING btree ("id_prestamo" int8_ops);--> statement-breakpoint
CREATE INDEX "pagos_prestamos_numero_cuota_idx" ON "pagos_prestamos" USING btree ("numero_cuota" int4_ops);--> statement-breakpoint
CREATE INDEX "periodos_nomina_ano_mes_idx" ON "periodos_nomina" USING btree ("ano" int4_ops,"mes" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_nomina_codigo_periodo_key" ON "periodos_nomina" USING btree ("codigo_periodo" text_ops);--> statement-breakpoint
CREATE INDEX "periodos_nomina_fecha_pago_idx" ON "periodos_nomina" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE INDEX "prestamos_aprobado_por_idx" ON "prestamos" USING btree ("aprobado_por" int8_ops);--> statement-breakpoint
CREATE INDEX "prestamos_caja_id_idx" ON "prestamos" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "prestamos_codigo_prestamo_key" ON "prestamos" USING btree ("codigo_prestamo" text_ops);--> statement-breakpoint
CREATE INDEX "prestamos_cuenta_bancaria_id_idx" ON "prestamos" USING btree ("cuenta_bancaria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "prestamos_estado_idx" ON "prestamos" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "prestamos_id_empleado_idx" ON "prestamos" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "prestamos_id_tipo_prestamo_idx" ON "prestamos" USING btree ("id_tipo_prestamo" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_cuentas_codigo_key" ON "categorias_cuentas" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE INDEX "categorias_cuentas_padre_id_idx" ON "categorias_cuentas" USING btree ("padre_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "categorias_cuentas_tipo_idx" ON "categorias_cuentas" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_cedula_key" ON "clientes" USING btree ("cedula" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_codigo_cliente_key" ON "clientes" USING btree ("codigo_cliente" text_ops);--> statement-breakpoint
CREATE INDEX "clientes_estado_idx" ON "clientes" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "clientes_fecha_ingreso_idx" ON "clientes" USING btree ("fecha_ingreso" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "clientes_referido_por_idx" ON "clientes" USING btree ("referido_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "clientes_tipo_cliente_idx" ON "clientes" USING btree ("tipo_cliente" text_ops);--> statement-breakpoint
CREATE INDEX "clientes_usuario_id_idx" ON "clientes" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_usuario_id_key" ON "clientes" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_apellidos" ON "clientes" USING btree ("apellidos" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_categoria" ON "clientes" USING btree ("categoria_cliente" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_email" ON "clientes" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_estado" ON "clientes" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_estado_fecha" ON "clientes" USING btree ("estado" text_ops,"fecha_ingreso" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_fecha_ingreso" ON "clientes" USING btree ("fecha_ingreso" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_nombre" ON "clientes" USING btree ("nombre" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_nombre_apellidos" ON "clientes" USING btree ("nombre" text_ops,"apellidos" text_ops);--> statement-breakpoint
CREATE INDEX "idx_clientes_telefono" ON "clientes" USING btree ("telefono" text_ops);--> statement-breakpoint
CREATE INDEX "compras_papeleria_estado_idx" ON "compras_papeleria" USING btree ("estado" enum_ops);--> statement-breakpoint
CREATE INDEX "compras_papeleria_fecha_compra_idx" ON "compras_papeleria" USING btree ("fecha_compra" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "compras_papeleria_numero_compra_key" ON "compras_papeleria" USING btree ("numero_compra" text_ops);--> statement-breakpoint
CREATE INDEX "compras_papeleria_proveedor_id_idx" ON "compras_papeleria" USING btree ("proveedor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "compras_papeleria_recibida_por_idx" ON "compras_papeleria" USING btree ("recibida_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "categorias_activo_idx" ON "categorias" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias" USING btree ("nombre" text_ops);--> statement-breakpoint
CREATE INDEX "clientes_papeleria_activo_idx" ON "clientes_papeleria" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "cierres_caja_caja_id_idx" ON "cierres_caja" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cierres_caja_fecha_cierre_idx" ON "cierres_caja" USING btree ("fecha_cierre" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "cierres_caja_usuario_id_idx" ON "cierres_caja" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "configuraciones_categoria_idx" ON "configuraciones" USING btree ("categoria" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "configuraciones_clave_key" ON "configuraciones" USING btree ("clave" text_ops);--> statement-breakpoint
CREATE INDEX "configuraciones_es_publica_idx" ON "configuraciones" USING btree ("es_publica" bool_ops);--> statement-breakpoint
CREATE INDEX "categorias_papeleria_activo_idx" ON "categorias_papeleria" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_papeleria_nombre_key" ON "categorias_papeleria" USING btree ("nombre" text_ops);--> statement-breakpoint
CREATE INDEX "chats_cliente_id_idx" ON "chats" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chats_creado_por_idx" ON "chats" USING btree ("creado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "chats_estado_idx" ON "chats" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "chats_ticket_id_idx" ON "chats" USING btree ("ticket_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chats_tipo_idx" ON "chats" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "chat_participantes_chat_id_idx" ON "chat_participantes" USING btree ("chat_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "chat_participantes_chat_id_usuario_id_key" ON "chat_participantes" USING btree ("chat_id" uuid_ops,"usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "chat_participantes_usuario_id_idx" ON "chat_participantes" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "banks_activo_idx" ON "banks" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "banks_codigo_key" ON "banks" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE INDEX "asientos_contables_creado_por_idx" ON "asientos_contables" USING btree ("creado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "asientos_contables_estado_idx" ON "asientos_contables" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "asientos_contables_fecha_asiento_idx" ON "asientos_contables" USING btree ("fecha_asiento" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "asientos_contables_numero_asiento_key" ON "asientos_contables" USING btree ("numero_asiento" text_ops);--> statement-breakpoint
CREATE INDEX "cajas_activa_idx" ON "cajas" USING btree ("activa" bool_ops);--> statement-breakpoint
CREATE INDEX "cajas_cuenta_contable_id_idx" ON "cajas" USING btree ("cuenta_contable_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cajas_responsable_id_idx" ON "cajas" USING btree ("responsable_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "archivos_categoria_idx" ON "archivos" USING btree ("categoria" text_ops);--> statement-breakpoint
CREATE INDEX "archivos_cliente_id_idx" ON "archivos" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "archivos_subido_por_idx" ON "archivos" USING btree ("subido_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_contables_activa_idx" ON "cuentas_contables" USING btree ("activa" bool_ops);--> statement-breakpoint
CREATE INDEX "cuentas_contables_categoria_id_idx" ON "cuentas_contables" USING btree ("categoria_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_contables_codigo_key" ON "cuentas_contables" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE INDEX "pagos_cuentas_por_pagar_creado_por_idx" ON "pagos_cuentas_por_pagar" USING btree ("creado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_cuentas_por_pagar_cuenta_por_pagar_id_idx" ON "pagos_cuentas_por_pagar" USING btree ("cuenta_por_pagar_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_cuentas_por_pagar_fecha_pago_idx" ON "pagos_cuentas_por_pagar" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE INDEX "pagos_cuentas_por_pagar_metodo_pago_idx" ON "pagos_cuentas_por_pagar" USING btree ("metodo_pago" text_ops);--> statement-breakpoint
CREATE INDEX "mensajes_chat_archivo_id_idx" ON "mensajes_chat" USING btree ("archivo_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "mensajes_chat_chat_id_idx" ON "mensajes_chat" USING btree ("chat_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "mensajes_chat_usuario_id_idx" ON "mensajes_chat" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "empresa_ciudad_idx" ON "empresa" USING btree ("ciudad" text_ops);--> statement-breakpoint
CREATE INDEX "empresa_provincia_idx" ON "empresa" USING btree ("provincia" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "empresa_rnc_key" ON "empresa" USING btree ("rnc" text_ops);--> statement-breakpoint
CREATE INDEX "contratos_cliente_id_idx" ON "contratos" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "contratos_estado_idx" ON "contratos" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "contratos_fecha_inicio_idx" ON "contratos" USING btree ("fecha_inicio" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "contratos_numero_contrato_key" ON "contratos" USING btree ("numero_contrato" text_ops);--> statement-breakpoint
CREATE INDEX "contratos_servicio_id_idx" ON "contratos" USING btree ("servicio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_bank_id_idx" ON "movimientos_contables" USING btree ("bank_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_caja_id_idx" ON "movimientos_contables" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_categoria_id_idx" ON "movimientos_contables" USING btree ("categoria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_cuenta_bancaria_id_idx" ON "movimientos_contables" USING btree ("cuenta_bancaria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_fecha_idx" ON "movimientos_contables" USING btree ("fecha" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_metodo_idx" ON "movimientos_contables" USING btree ("metodo" text_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_tipo_idx" ON "movimientos_contables" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "movimientos_contables_usuario_id_idx" ON "movimientos_contables" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_caja_id_idx" ON "pagos_clientes" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_cliente_id_idx" ON "pagos_clientes" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_cuenta_bancaria_id_idx" ON "pagos_clientes" USING btree ("cuenta_bancaria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_estado_idx" ON "pagos_clientes" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_factura_id_idx" ON "pagos_clientes" USING btree ("factura_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_fecha_pago_idx" ON "pagos_clientes" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_clientes_numero_pago_key" ON "pagos_clientes" USING btree ("numero_pago" text_ops);--> statement-breakpoint
CREATE INDEX "pagos_clientes_recibido_por_idx" ON "pagos_clientes" USING btree ("recibido_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "eventos_creado_por_id_idx" ON "eventos" USING btree ("creado_por_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "eventos_fecha_inicio_idx" ON "eventos" USING btree ("fecha_inicio" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "eventos_todo_el_dia_idx" ON "eventos" USING btree ("todo_el_dia" bool_ops);--> statement-breakpoint
CREATE INDEX "facturas_clientes_cliente_id_idx" ON "facturas_clientes" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "facturas_clientes_contrato_id_idx" ON "facturas_clientes" USING btree ("contrato_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "facturas_clientes_estado_idx" ON "facturas_clientes" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "facturas_clientes_facturada_por_idx" ON "facturas_clientes" USING btree ("facturada_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "facturas_clientes_fecha_factura_idx" ON "facturas_clientes" USING btree ("fecha_factura" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "facturas_clientes_numero_factura_key" ON "facturas_clientes" USING btree ("numero_factura" text_ops);--> statement-breakpoint
CREATE INDEX "cuentas_bancarias_activo_idx" ON "cuentas_bancarias" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "cuentas_bancarias_bank_id_idx" ON "cuentas_bancarias" USING btree ("bank_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_bancarias_cuenta_contable_id_idx" ON "cuentas_bancarias" USING btree ("cuenta_contable_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_bancarias_numero_cuenta_key" ON "cuentas_bancarias" USING btree ("numero_cuenta" text_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_cobrar_cliente_id_idx" ON "cuentas_por_cobrar" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_cobrar_estado_idx" ON "cuentas_por_cobrar" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_cobrar_factura_id_idx" ON "cuentas_por_cobrar" USING btree ("factura_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_cobrar_fecha_vencimiento_idx" ON "cuentas_por_cobrar" USING btree ("fecha_vencimiento" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_por_cobrar_numero_documento_key" ON "cuentas_por_cobrar" USING btree ("numero_documento" text_ops);--> statement-breakpoint
CREATE INDEX "pagos_fijos_activo_idx" ON "pagos_fijos" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "pagos_fijos_cuenta_contable_id_idx" ON "pagos_fijos" USING btree ("cuenta_contable_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_fijos_proveedor_id_idx" ON "pagos_fijos" USING btree ("proveedor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "equipos_cliente_cliente_id_idx" ON "equipos_cliente" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "equipos_cliente_estado_idx" ON "equipos_cliente" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "equipos_cliente_mac_address_key" ON "equipos_cliente" USING btree ("mac_address" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "equipos_cliente_numero_serie_key" ON "equipos_cliente" USING btree ("numero_serie" text_ops);--> statement-breakpoint
CREATE INDEX "equipos_cliente_suscripcion_id_idx" ON "equipos_cliente" USING btree ("suscripcion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "movimientos_inventario_fecha_movimiento_idx" ON "movimientos_inventario" USING btree ("fecha_movimiento" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "movimientos_inventario_producto_id_idx" ON "movimientos_inventario" USING btree ("producto_id" int8_ops);--> statement-breakpoint
CREATE INDEX "movimientos_inventario_tipo_movimiento_idx" ON "movimientos_inventario" USING btree ("tipo_movimiento" enum_ops);--> statement-breakpoint
CREATE INDEX "movimientos_inventario_usuario_id_idx" ON "movimientos_inventario" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "servicios_activo_idx" ON "servicios" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "servicios_categoria_id_idx" ON "servicios" USING btree ("categoria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "servicios_destacado_idx" ON "servicios" USING btree ("destacado" bool_ops);--> statement-breakpoint
CREATE INDEX "servicios_tipo_idx" ON "servicios" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_cliente_id_idx" ON "suscripciones" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_estado_idx" ON "suscripciones" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_fecha_inicio_idx" ON "suscripciones" USING btree ("fecha_inicio" date_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_fecha_proximo_pago_idx" ON "suscripciones" USING btree ("fecha_proximo_pago" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "suscripciones_numero_contrato_key" ON "suscripciones" USING btree ("numero_contrato" text_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_servicio_id_idx" ON "suscripciones" USING btree ("servicio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "suscripciones_usuario_id_idx" ON "suscripciones" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "proveedores_activo_idx" ON "proveedores" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "proveedores_codigo_key" ON "proveedores" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "proveedores_rnc_key" ON "proveedores" USING btree ("rnc" text_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_caja_id_idx" ON "ventas_papeleria" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_cliente_id_idx" ON "ventas_papeleria" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_cuenta_bancaria_id_idx" ON "ventas_papeleria" USING btree ("cuenta_bancaria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_estado_idx" ON "ventas_papeleria" USING btree ("estado" enum_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_fecha_venta_idx" ON "ventas_papeleria" USING btree ("fecha_venta" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ventas_papeleria_numero_venta_key" ON "ventas_papeleria" USING btree ("numero_venta" text_ops);--> statement-breakpoint
CREATE INDEX "ventas_papeleria_usuario_id_idx" ON "ventas_papeleria" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "planes_activo_idx" ON "planes" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "planes_categoria_id_idx" ON "planes" USING btree ("categoria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_cliente_id_idx" ON "tickets" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_contrato_id_idx" ON "tickets" USING btree ("contrato_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_estado_idx" ON "tickets" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_numero_ticket_key" ON "tickets" USING btree ("numero_ticket" text_ops);--> statement-breakpoint
CREATE INDEX "tickets_prioridad_idx" ON "tickets" USING btree ("prioridad" text_ops);--> statement-breakpoint
CREATE INDEX "tickets_suscripcion_id_idx" ON "tickets" USING btree ("suscripcion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_tecnico_asignado_id_idx" ON "tickets" USING btree ("tecnico_asignado_id" int8_ops);--> statement-breakpoint
CREATE INDEX "tickets_usuario_id_idx" ON "tickets" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "roles_nombre_rol_key" ON "roles" USING btree ("nombre_rol" text_ops);--> statement-breakpoint
CREATE INDEX "respuestas_tickets_ticket_id_idx" ON "respuestas_tickets" USING btree ("ticket_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "respuestas_tickets_usuario_id_idx" ON "respuestas_tickets" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_pagos_fijos_fecha_pago_idx" ON "pagos_pagos_fijos" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE INDEX "pagos_pagos_fijos_pagado_por_idx" ON "pagos_pagos_fijos" USING btree ("pagado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "pagos_pagos_fijos_pago_fijo_id_idx" ON "pagos_pagos_fijos" USING btree ("pago_fijo_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tareas_completada_idx" ON "tareas" USING btree ("completada" bool_ops);--> statement-breakpoint
CREATE INDEX "tareas_creadoPorId_idx" ON "tareas" USING btree ("creadoPorId" uuid_ops);--> statement-breakpoint
CREATE INDEX "permisos_activo_idx" ON "permisos" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "permisos_categoria_idx" ON "permisos" USING btree ("categoria" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "permisos_nombre_permiso_key" ON "permisos" USING btree ("nombre_permiso" text_ops);--> statement-breakpoint
CREATE INDEX "traspasos_autorizado_por_idx" ON "traspasos" USING btree ("autorizado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "traspasos_banco_destino_id_idx" ON "traspasos" USING btree ("banco_destino_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "traspasos_banco_origen_id_idx" ON "traspasos" USING btree ("banco_origen_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "traspasos_caja_destino_id_idx" ON "traspasos" USING btree ("caja_destino_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "traspasos_caja_origen_id_idx" ON "traspasos" USING btree ("caja_origen_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "traspasos_fecha_traspaso_idx" ON "traspasos" USING btree ("fecha_traspaso" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "traspasos_numero_traspaso_key" ON "traspasos" USING btree ("numero_traspaso" text_ops);--> statement-breakpoint
CREATE INDEX "sesiones_usuario_activa_idx" ON "sesiones_usuario" USING btree ("activa" bool_ops);--> statement-breakpoint
CREATE INDEX "sesiones_usuario_fecha_expiracion_idx" ON "sesiones_usuario" USING btree ("fecha_expiracion" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "sesiones_usuario_fecha_inicio_idx" ON "sesiones_usuario" USING btree ("fecha_inicio" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "sesiones_usuario_usuario_id_idx" ON "sesiones_usuario" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "empleados_cedula_key" ON "empleados" USING btree ("cedula" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "empleados_codigo_empleado_key" ON "empleados" USING btree ("codigo_empleado" text_ops);--> statement-breakpoint
CREATE INDEX "empleados_estado_idx" ON "empleados" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "empleados_id_cargo_idx" ON "empleados" USING btree ("id_cargo" int8_ops);--> statement-breakpoint
CREATE INDEX "empleados_id_departamento_idx" ON "empleados" USING btree ("id_departamento" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "empleados_usuario_id_key" ON "empleados" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "nomina_estado_pago_idx" ON "nomina" USING btree ("estado_pago" text_ops);--> statement-breakpoint
CREATE INDEX "nomina_fecha_pago_idx" ON "nomina" USING btree ("fecha_pago" date_ops);--> statement-breakpoint
CREATE INDEX "nomina_id_empleado_idx" ON "nomina" USING btree ("id_empleado" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "nomina_id_periodo_id_empleado_key" ON "nomina" USING btree ("id_periodo" int8_ops,"id_empleado" int8_ops);--> statement-breakpoint
CREATE INDEX "nomina_id_periodo_idx" ON "nomina" USING btree ("id_periodo" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios" USING btree ("cedula" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "usuarios_ultimo_acceso_idx" ON "usuarios" USING btree ("ultimo_acceso" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "aperturas_caja_caja_id_idx" ON "aperturas_caja" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "aperturas_caja_fecha_apertura_idx" ON "aperturas_caja" USING btree ("fecha_apertura" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "aperturas_caja_usuario_id_idx" ON "aperturas_caja" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "sesiones_caja_caja_id_idx" ON "sesiones_caja" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "sesiones_caja_estado_idx" ON "sesiones_caja" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "sesiones_caja_usuario_id_idx" ON "sesiones_caja" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_pagar_estado_idx" ON "cuentas_por_pagar" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_pagar_fecha_vencimiento_idx" ON "cuentas_por_pagar" USING btree ("fecha_vencimiento" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_por_pagar_numero_documento_key" ON "cuentas_por_pagar" USING btree ("numero_documento" text_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_pagar_proveedor_id_idx" ON "cuentas_por_pagar" USING btree ("proveedor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "cuentas_por_pagar_tipo_idx" ON "cuentas_por_pagar" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "caja_checkpoints_caja_id_idx" ON "caja_checkpoints" USING btree ("caja_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "caja_checkpoints_fecha_checkpoint_idx" ON "caja_checkpoints" USING btree ("fecha_checkpoint" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "productos_papeleria_activo_idx" ON "productos_papeleria" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "productos_papeleria_categoria_id_idx" ON "productos_papeleria" USING btree ("categoria_id" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "productos_papeleria_codigo_barras_key" ON "productos_papeleria" USING btree ("codigo_barras" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "productos_papeleria_codigo_key" ON "productos_papeleria" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE INDEX "productos_papeleria_proveedor_id_idx" ON "productos_papeleria" USING btree ("proveedor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "detalles_venta_papeleria_producto_id_idx" ON "detalles_venta_papeleria" USING btree ("producto_id" int8_ops);--> statement-breakpoint
CREATE INDEX "detalles_venta_papeleria_venta_id_idx" ON "detalles_venta_papeleria" USING btree ("venta_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "roles_permisos_fecha_asignacion_idx" ON "roles_permisos" USING btree ("fecha_asignacion" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "roles_permisos_permiso_id_idx" ON "roles_permisos" USING btree ("permiso_id" int8_ops);--> statement-breakpoint
CREATE INDEX "roles_permisos_rol_id_idx" ON "roles_permisos" USING btree ("rol_id" int8_ops);--> statement-breakpoint
CREATE INDEX "usuarios_roles_fecha_asignacion_idx" ON "usuarios_roles" USING btree ("fecha_asignacion" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "usuarios_roles_rol_id_idx" ON "usuarios_roles" USING btree ("rol_id" int8_ops);--> statement-breakpoint
CREATE INDEX "usuarios_roles_usuario_id_idx" ON "usuarios_roles" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "usuarios_permisos_fecha_asignacion_idx" ON "usuarios_permisos" USING btree ("fecha_asignacion" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "usuarios_permisos_fecha_vencimiento_idx" ON "usuarios_permisos" USING btree ("fecha_vencimiento" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "usuarios_permisos_permiso_id_idx" ON "usuarios_permisos" USING btree ("permiso_id" int8_ops);--> statement-breakpoint
CREATE INDEX "usuarios_permisos_usuario_id_idx" ON "usuarios_permisos" USING btree ("usuario_id" uuid_ops);
*/