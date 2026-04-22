import { relations } from "drizzle-orm/relations";
import { usuarios, bitacora, empleados, comisiones, tiposComision, historialSalarios, comprasPapeleria, detalleComprasPapeleria, productosPapeleria, facturasClientes, detalleFacturas, servicios, asientosContables, detalleAsientos, cajas, cuentasContables, nomina, nominaPrestamos, pagosPrestamos, prestamos, nominaComisiones, periodosVacaciones, tiposVacacion, solicitudesVacaciones, tiposPrestamo, cuentasBancarias, categoriasCuentas, clientes, proveedores, cierresCaja, chats, tickets, chatParticipantes, archivos, cuentasPorPagar, pagosCuentasPorPagar, mensajesChat, contratos, banks, movimientosContables, pagosClientes, eventos, cuentasPorCobrar, pagosFijos, equiposCliente, suscripciones, movimientosInventario, categorias, planes, ventasPapeleria, respuestasTickets, pagosPagosFijos, tareas, traspasos, sesionesUsuario, cargos, departamentos, periodosNomina, aperturasCaja, sesionesCaja, cajaCheckpoints, categoriasPapeleria, detallesVentaPapeleria, historialCostosPapeleria, rolesPermisos, permisos, roles, usuariosRoles, usuariosPermisos } from "./schema";

export const bitacoraRelations = relations(bitacora, ({one}) => ({
	usuario: one(usuarios, {
		fields: [bitacora.usuarioId],
		references: [usuarios.id]
	}),
}));

export const usuariosRelations = relations(usuarios, ({many}) => ({
	bitacoras: many(bitacora),
	clientes: many(clientes),
	comprasPapelerias: many(comprasPapeleria),
	cierresCajas: many(cierresCaja),
	chats: many(chats),
	chatParticipantes: many(chatParticipantes),
	asientosContables: many(asientosContables),
	cajas: many(cajas),
	archivos: many(archivos),
	pagosCuentasPorPagars: many(pagosCuentasPorPagar),
	mensajesChats: many(mensajesChat),
	movimientosContables: many(movimientosContables),
	pagosClientes: many(pagosClientes),
	eventos: many(eventos),
	facturasClientes: many(facturasClientes),
	movimientosInventarios: many(movimientosInventario),
	suscripciones: many(suscripciones),
	ventasPapelerias: many(ventasPapeleria),
	tickets: many(tickets),
	respuestasTickets: many(respuestasTickets),
	pagosPagosFijos: many(pagosPagosFijos),
	tareas: many(tareas),
	traspasos: many(traspasos),
	sesionesUsuarios: many(sesionesUsuario),
	empleados: many(empleados),
	aperturasCajas: many(aperturasCaja),
	sesionesCajas: many(sesionesCaja),
	cajaCheckpoints: many(cajaCheckpoints),
	historialCostosPapelerias: many(historialCostosPapeleria),
	rolesPermisos: many(rolesPermisos),
	usuariosRoles_asignadoPor: many(usuariosRoles, {
		relationName: "usuariosRoles_asignadoPor_usuarios_id"
	}),
	usuariosRoles_usuarioId: many(usuariosRoles, {
		relationName: "usuariosRoles_usuarioId_usuarios_id"
	}),
	usuariosPermisos_asignadoPor: many(usuariosPermisos, {
		relationName: "usuariosPermisos_asignadoPor_usuarios_id"
	}),
	usuariosPermisos_usuarioId: many(usuariosPermisos, {
		relationName: "usuariosPermisos_usuarioId_usuarios_id"
	}),
}));

export const comisionesRelations = relations(comisiones, ({one, many}) => ({
	empleado: one(empleados, {
		fields: [comisiones.idEmpleado],
		references: [empleados.idEmpleado]
	}),
	tiposComision: one(tiposComision, {
		fields: [comisiones.idTipoComision],
		references: [tiposComision.idTipoComision]
	}),
	nominaComisiones: many(nominaComisiones),
}));

export const empleadosRelations = relations(empleados, ({one, many}) => ({
	comisiones: many(comisiones),
	historialSalarios_aprobadoPor: many(historialSalarios, {
		relationName: "historialSalarios_aprobadoPor_empleados_idEmpleado"
	}),
	historialSalarios_idEmpleado: many(historialSalarios, {
		relationName: "historialSalarios_idEmpleado_empleados_idEmpleado"
	}),
	periodosVacaciones: many(periodosVacaciones),
	solicitudesVacaciones_aprobadoPor: many(solicitudesVacaciones, {
		relationName: "solicitudesVacaciones_aprobadoPor_empleados_idEmpleado"
	}),
	solicitudesVacaciones_idEmpleado: many(solicitudesVacaciones, {
		relationName: "solicitudesVacaciones_idEmpleado_empleados_idEmpleado"
	}),
	prestamos_aprobadoPor: many(prestamos, {
		relationName: "prestamos_aprobadoPor_empleados_idEmpleado"
	}),
	prestamos_idEmpleado: many(prestamos, {
		relationName: "prestamos_idEmpleado_empleados_idEmpleado"
	}),
	tickets: many(tickets),
	cargo: one(cargos, {
		fields: [empleados.idCargo],
		references: [cargos.idCargo]
	}),
	departamento: one(departamentos, {
		fields: [empleados.idDepartamento],
		references: [departamentos.idDepartamento]
	}),
	usuario: one(usuarios, {
		fields: [empleados.usuarioId],
		references: [usuarios.id]
	}),
	nominas_calculadoPor: many(nomina, {
		relationName: "nomina_calculadoPor_empleados_idEmpleado"
	}),
	nominas_idEmpleado: many(nomina, {
		relationName: "nomina_idEmpleado_empleados_idEmpleado"
	}),
}));

export const tiposComisionRelations = relations(tiposComision, ({many}) => ({
	comisiones: many(comisiones),
}));

export const historialSalariosRelations = relations(historialSalarios, ({one}) => ({
	empleado_aprobadoPor: one(empleados, {
		fields: [historialSalarios.aprobadoPor],
		references: [empleados.idEmpleado],
		relationName: "historialSalarios_aprobadoPor_empleados_idEmpleado"
	}),
	empleado_idEmpleado: one(empleados, {
		fields: [historialSalarios.idEmpleado],
		references: [empleados.idEmpleado],
		relationName: "historialSalarios_idEmpleado_empleados_idEmpleado"
	}),
}));

export const detalleComprasPapeleriaRelations = relations(detalleComprasPapeleria, ({one}) => ({
	comprasPapeleria: one(comprasPapeleria, {
		fields: [detalleComprasPapeleria.compraId],
		references: [comprasPapeleria.id]
	}),
	productosPapeleria: one(productosPapeleria, {
		fields: [detalleComprasPapeleria.productoId],
		references: [productosPapeleria.id]
	}),
}));

export const comprasPapeleriaRelations = relations(comprasPapeleria, ({one, many}) => ({
	detalleComprasPapelerias: many(detalleComprasPapeleria),
	proveedore: one(proveedores, {
		fields: [comprasPapeleria.proveedorId],
		references: [proveedores.id]
	}),
	usuario: one(usuarios, {
		fields: [comprasPapeleria.recibidaPor],
		references: [usuarios.id]
	}),
}));

export const productosPapeleriaRelations = relations(productosPapeleria, ({one, many}) => ({
	detalleComprasPapelerias: many(detalleComprasPapeleria),
	detalleFacturas: many(detalleFacturas),
	movimientosInventarios: many(movimientosInventario),
	categoriasPapeleria: one(categoriasPapeleria, {
		fields: [productosPapeleria.categoriaId],
		references: [categoriasPapeleria.id]
	}),
	proveedore: one(proveedores, {
		fields: [productosPapeleria.proveedorId],
		references: [proveedores.id]
	}),
	detallesVentaPapelerias: many(detallesVentaPapeleria),
	historialCostosPapelerias: many(historialCostosPapeleria),
}));

export const detalleFacturasRelations = relations(detalleFacturas, ({one}) => ({
	facturasCliente: one(facturasClientes, {
		fields: [detalleFacturas.facturaId],
		references: [facturasClientes.id]
	}),
	productosPapeleria: one(productosPapeleria, {
		fields: [detalleFacturas.productoId],
		references: [productosPapeleria.id]
	}),
	servicio: one(servicios, {
		fields: [detalleFacturas.servicioId],
		references: [servicios.id]
	}),
}));

export const facturasClientesRelations = relations(facturasClientes, ({one, many}) => ({
	detalleFacturas: many(detalleFacturas),
	pagosClientes: many(pagosClientes),
	cliente: one(clientes, {
		fields: [facturasClientes.clienteId],
		references: [clientes.id]
	}),
	contrato: one(contratos, {
		fields: [facturasClientes.contratoId],
		references: [contratos.id]
	}),
	usuario: one(usuarios, {
		fields: [facturasClientes.facturadaPor],
		references: [usuarios.id]
	}),
	cuentasPorCobrars: many(cuentasPorCobrar),
}));

export const serviciosRelations = relations(servicios, ({one, many}) => ({
	detalleFacturas: many(detalleFacturas),
	contratos: many(contratos),
	categoria: one(categorias, {
		fields: [servicios.categoriaId],
		references: [categorias.id]
	}),
	suscripciones: many(suscripciones),
}));

export const detalleAsientosRelations = relations(detalleAsientos, ({one}) => ({
	asientosContable: one(asientosContables, {
		fields: [detalleAsientos.asientoId],
		references: [asientosContables.id]
	}),
	caja: one(cajas, {
		fields: [detalleAsientos.cajaId],
		references: [cajas.id]
	}),
	cuentasContable: one(cuentasContables, {
		fields: [detalleAsientos.cuentaId],
		references: [cuentasContables.id]
	}),
}));

export const asientosContablesRelations = relations(asientosContables, ({one, many}) => ({
	detalleAsientos: many(detalleAsientos),
	usuario: one(usuarios, {
		fields: [asientosContables.creadoPor],
		references: [usuarios.id]
	}),
}));

export const cajasRelations = relations(cajas, ({one, many}) => ({
	detalleAsientos: many(detalleAsientos),
	prestamos: many(prestamos),
	cierresCajas: many(cierresCaja),
	cuentasContable: one(cuentasContables, {
		fields: [cajas.cuentaContableId],
		references: [cuentasContables.id]
	}),
	usuario: one(usuarios, {
		fields: [cajas.responsableId],
		references: [usuarios.id]
	}),
	movimientosContables: many(movimientosContables),
	pagosClientes: many(pagosClientes),
	ventasPapelerias: many(ventasPapeleria),
	traspasos_cajaDestinoId: many(traspasos, {
		relationName: "traspasos_cajaDestinoId_cajas_id"
	}),
	traspasos_cajaOrigenId: many(traspasos, {
		relationName: "traspasos_cajaOrigenId_cajas_id"
	}),
	aperturasCajas: many(aperturasCaja),
	sesionesCajas: many(sesionesCaja),
	cajaCheckpoints: many(cajaCheckpoints),
}));

export const cuentasContablesRelations = relations(cuentasContables, ({one, many}) => ({
	detalleAsientos: many(detalleAsientos),
	cajas: many(cajas),
	categoriasCuenta: one(categoriasCuentas, {
		fields: [cuentasContables.categoriaId],
		references: [categoriasCuentas.id]
	}),
	cuentasBancarias: many(cuentasBancarias),
	pagosFijos: many(pagosFijos),
}));

export const nominaPrestamosRelations = relations(nominaPrestamos, ({one}) => ({
	nomina: one(nomina, {
		fields: [nominaPrestamos.idNomina],
		references: [nomina.idNomina]
	}),
	pagosPrestamo: one(pagosPrestamos, {
		fields: [nominaPrestamos.idPagoPrestamo],
		references: [pagosPrestamos.idPagoPrestamo]
	}),
	prestamo: one(prestamos, {
		fields: [nominaPrestamos.idPrestamo],
		references: [prestamos.idPrestamo]
	}),
}));

export const nominaRelations = relations(nomina, ({one, many}) => ({
	nominaPrestamos: many(nominaPrestamos),
	nominaComisiones: many(nominaComisiones),
	empleado_calculadoPor: one(empleados, {
		fields: [nomina.calculadoPor],
		references: [empleados.idEmpleado],
		relationName: "nomina_calculadoPor_empleados_idEmpleado"
	}),
	empleado_idEmpleado: one(empleados, {
		fields: [nomina.idEmpleado],
		references: [empleados.idEmpleado],
		relationName: "nomina_idEmpleado_empleados_idEmpleado"
	}),
	periodosNomina: one(periodosNomina, {
		fields: [nomina.idPeriodo],
		references: [periodosNomina.idPeriodo]
	}),
	cuentasBancaria: one(cuentasBancarias, {
		fields: [nomina.cuentaBancariaId],
		references: [cuentasBancarias.id]
	}),
}));

export const pagosPrestamosRelations = relations(pagosPrestamos, ({one, many}) => ({
	nominaPrestamos: many(nominaPrestamos),
	prestamo: one(prestamos, {
		fields: [pagosPrestamos.idPrestamo],
		references: [prestamos.idPrestamo]
	}),
}));

export const prestamosRelations = relations(prestamos, ({one, many}) => ({
	nominaPrestamos: many(nominaPrestamos),
	pagosPrestamos: many(pagosPrestamos),
	empleado_aprobadoPor: one(empleados, {
		fields: [prestamos.aprobadoPor],
		references: [empleados.idEmpleado],
		relationName: "prestamos_aprobadoPor_empleados_idEmpleado"
	}),
	empleado_idEmpleado: one(empleados, {
		fields: [prestamos.idEmpleado],
		references: [empleados.idEmpleado],
		relationName: "prestamos_idEmpleado_empleados_idEmpleado"
	}),
	tiposPrestamo: one(tiposPrestamo, {
		fields: [prestamos.idTipoPrestamo],
		references: [tiposPrestamo.idTipoPrestamo]
	}),
	caja: one(cajas, {
		fields: [prestamos.cajaId],
		references: [cajas.id]
	}),
	cuentasBancaria: one(cuentasBancarias, {
		fields: [prestamos.cuentaBancariaId],
		references: [cuentasBancarias.id]
	}),
}));

export const nominaComisionesRelations = relations(nominaComisiones, ({one}) => ({
	comisione: one(comisiones, {
		fields: [nominaComisiones.idComision],
		references: [comisiones.idComision]
	}),
	nomina: one(nomina, {
		fields: [nominaComisiones.idNomina],
		references: [nomina.idNomina]
	}),
}));

export const periodosVacacionesRelations = relations(periodosVacaciones, ({one}) => ({
	empleado: one(empleados, {
		fields: [periodosVacaciones.idEmpleado],
		references: [empleados.idEmpleado]
	}),
	tiposVacacion: one(tiposVacacion, {
		fields: [periodosVacaciones.idTipoVacacion],
		references: [tiposVacacion.idTipoVacacion]
	}),
}));

export const tiposVacacionRelations = relations(tiposVacacion, ({many}) => ({
	periodosVacaciones: many(periodosVacaciones),
	solicitudesVacaciones: many(solicitudesVacaciones),
}));

export const solicitudesVacacionesRelations = relations(solicitudesVacaciones, ({one}) => ({
	empleado_aprobadoPor: one(empleados, {
		fields: [solicitudesVacaciones.aprobadoPor],
		references: [empleados.idEmpleado],
		relationName: "solicitudesVacaciones_aprobadoPor_empleados_idEmpleado"
	}),
	empleado_idEmpleado: one(empleados, {
		fields: [solicitudesVacaciones.idEmpleado],
		references: [empleados.idEmpleado],
		relationName: "solicitudesVacaciones_idEmpleado_empleados_idEmpleado"
	}),
	tiposVacacion: one(tiposVacacion, {
		fields: [solicitudesVacaciones.idTipoVacacion],
		references: [tiposVacacion.idTipoVacacion]
	}),
}));

export const tiposPrestamoRelations = relations(tiposPrestamo, ({many}) => ({
	prestamos: many(prestamos),
}));

export const cuentasBancariasRelations = relations(cuentasBancarias, ({one, many}) => ({
	prestamos: many(prestamos),
	movimientosContables: many(movimientosContables),
	pagosClientes: many(pagosClientes),
	bank: one(banks, {
		fields: [cuentasBancarias.bankId],
		references: [banks.id]
	}),
	cuentasContable: one(cuentasContables, {
		fields: [cuentasBancarias.cuentaContableId],
		references: [cuentasContables.id]
	}),
	ventasPapelerias: many(ventasPapeleria),
	traspasos_bancoDestinoId: many(traspasos, {
		relationName: "traspasos_bancoDestinoId_cuentasBancarias_id"
	}),
	traspasos_bancoOrigenId: many(traspasos, {
		relationName: "traspasos_bancoOrigenId_cuentasBancarias_id"
	}),
	nominas: many(nomina),
}));

export const categoriasCuentasRelations = relations(categoriasCuentas, ({one, many}) => ({
	categoriasCuenta: one(categoriasCuentas, {
		fields: [categoriasCuentas.padreId],
		references: [categoriasCuentas.id],
		relationName: "categoriasCuentas_padreId_categoriasCuentas_id"
	}),
	categoriasCuentas: many(categoriasCuentas, {
		relationName: "categoriasCuentas_padreId_categoriasCuentas_id"
	}),
	cuentasContables: many(cuentasContables),
	movimientosContables: many(movimientosContables),
}));

export const clientesRelations = relations(clientes, ({one, many}) => ({
	cliente: one(clientes, {
		fields: [clientes.referidoPor],
		references: [clientes.id],
		relationName: "clientes_referidoPor_clientes_id"
	}),
	clientes: many(clientes, {
		relationName: "clientes_referidoPor_clientes_id"
	}),
	usuario: one(usuarios, {
		fields: [clientes.usuarioId],
		references: [usuarios.id]
	}),
	chats: many(chats),
	archivos: many(archivos),
	contratos: many(contratos),
	pagosClientes: many(pagosClientes),
	facturasClientes: many(facturasClientes),
	cuentasPorCobrars: many(cuentasPorCobrar),
	equiposClientes: many(equiposCliente),
	suscripciones: many(suscripciones),
	ventasPapelerias: many(ventasPapeleria),
	tickets: many(tickets),
}));

export const proveedoresRelations = relations(proveedores, ({many}) => ({
	comprasPapelerias: many(comprasPapeleria),
	pagosFijos: many(pagosFijos),
	cuentasPorPagars: many(cuentasPorPagar),
	productosPapelerias: many(productosPapeleria),
}));

export const cierresCajaRelations = relations(cierresCaja, ({one}) => ({
	caja: one(cajas, {
		fields: [cierresCaja.cajaId],
		references: [cajas.id]
	}),
	usuario: one(usuarios, {
		fields: [cierresCaja.usuarioId],
		references: [usuarios.id]
	}),
}));

export const chatsRelations = relations(chats, ({one, many}) => ({
	cliente: one(clientes, {
		fields: [chats.clienteId],
		references: [clientes.id]
	}),
	usuario: one(usuarios, {
		fields: [chats.creadoPor],
		references: [usuarios.id]
	}),
	ticket: one(tickets, {
		fields: [chats.ticketId],
		references: [tickets.id]
	}),
	chatParticipantes: many(chatParticipantes),
	mensajesChats: many(mensajesChat),
}));

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	chats: many(chats),
	cliente: one(clientes, {
		fields: [tickets.clienteId],
		references: [clientes.id]
	}),
	contrato: one(contratos, {
		fields: [tickets.contratoId],
		references: [contratos.id]
	}),
	suscripcione: one(suscripciones, {
		fields: [tickets.suscripcionId],
		references: [suscripciones.id]
	}),
	empleado: one(empleados, {
		fields: [tickets.tecnicoAsignadoId],
		references: [empleados.idEmpleado]
	}),
	usuario: one(usuarios, {
		fields: [tickets.usuarioId],
		references: [usuarios.id]
	}),
	respuestasTickets: many(respuestasTickets),
}));

export const chatParticipantesRelations = relations(chatParticipantes, ({one}) => ({
	chat: one(chats, {
		fields: [chatParticipantes.chatId],
		references: [chats.id]
	}),
	usuario: one(usuarios, {
		fields: [chatParticipantes.usuarioId],
		references: [usuarios.id]
	}),
}));

export const archivosRelations = relations(archivos, ({one, many}) => ({
	cliente: one(clientes, {
		fields: [archivos.clienteId],
		references: [clientes.id]
	}),
	usuario: one(usuarios, {
		fields: [archivos.subidoPor],
		references: [usuarios.id]
	}),
	mensajesChats: many(mensajesChat),
}));

export const pagosCuentasPorPagarRelations = relations(pagosCuentasPorPagar, ({one}) => ({
	cuentasPorPagar: one(cuentasPorPagar, {
		fields: [pagosCuentasPorPagar.cuentaPorPagarId],
		references: [cuentasPorPagar.id]
	}),
	usuario: one(usuarios, {
		fields: [pagosCuentasPorPagar.creadoPor],
		references: [usuarios.id]
	}),
}));

export const cuentasPorPagarRelations = relations(cuentasPorPagar, ({one, many}) => ({
	pagosCuentasPorPagars: many(pagosCuentasPorPagar),
	movimientosContables: many(movimientosContables),
	proveedore: one(proveedores, {
		fields: [cuentasPorPagar.proveedorId],
		references: [proveedores.id]
	}),
}));

export const mensajesChatRelations = relations(mensajesChat, ({one}) => ({
	archivo: one(archivos, {
		fields: [mensajesChat.archivoId],
		references: [archivos.id]
	}),
	chat: one(chats, {
		fields: [mensajesChat.chatId],
		references: [chats.id]
	}),
	usuario: one(usuarios, {
		fields: [mensajesChat.usuarioId],
		references: [usuarios.id]
	}),
}));

export const contratosRelations = relations(contratos, ({one, many}) => ({
	cliente: one(clientes, {
		fields: [contratos.clienteId],
		references: [clientes.id]
	}),
	servicio: one(servicios, {
		fields: [contratos.servicioId],
		references: [servicios.id]
	}),
	facturasClientes: many(facturasClientes),
	equiposClientes: many(equiposCliente),
	tickets: many(tickets),
}));

export const movimientosContablesRelations = relations(movimientosContables, ({one, many}) => ({
	bank: one(banks, {
		fields: [movimientosContables.bankId],
		references: [banks.id]
	}),
	caja: one(cajas, {
		fields: [movimientosContables.cajaId],
		references: [cajas.id]
	}),
	categoriasCuenta: one(categoriasCuentas, {
		fields: [movimientosContables.categoriaId],
		references: [categoriasCuentas.id]
	}),
	cuentasBancaria: one(cuentasBancarias, {
		fields: [movimientosContables.cuentaBancariaId],
		references: [cuentasBancarias.id]
	}),
	usuario: one(usuarios, {
		fields: [movimientosContables.usuarioId],
		references: [usuarios.id]
	}),
	cuentasPorPagar: one(cuentasPorPagar, {
		fields: [movimientosContables.cuentaPorPagarId],
		references: [cuentasPorPagar.id]
	}),
	ventasPapelerias: many(ventasPapeleria),
}));

export const banksRelations = relations(banks, ({many}) => ({
	movimientosContables: many(movimientosContables),
	cuentasBancarias: many(cuentasBancarias),
}));

export const pagosClientesRelations = relations(pagosClientes, ({one}) => ({
	caja: one(cajas, {
		fields: [pagosClientes.cajaId],
		references: [cajas.id]
	}),
	cliente: one(clientes, {
		fields: [pagosClientes.clienteId],
		references: [clientes.id]
	}),
	cuentasBancaria: one(cuentasBancarias, {
		fields: [pagosClientes.cuentaBancariaId],
		references: [cuentasBancarias.id]
	}),
	facturasCliente: one(facturasClientes, {
		fields: [pagosClientes.facturaId],
		references: [facturasClientes.id]
	}),
	usuario: one(usuarios, {
		fields: [pagosClientes.recibidoPor],
		references: [usuarios.id]
	}),
}));

export const eventosRelations = relations(eventos, ({one}) => ({
	usuario: one(usuarios, {
		fields: [eventos.creadoPorId],
		references: [usuarios.id]
	}),
}));

export const cuentasPorCobrarRelations = relations(cuentasPorCobrar, ({one}) => ({
	cliente: one(clientes, {
		fields: [cuentasPorCobrar.clienteId],
		references: [clientes.id]
	}),
	facturasCliente: one(facturasClientes, {
		fields: [cuentasPorCobrar.facturaId],
		references: [facturasClientes.id]
	}),
}));

export const pagosFijosRelations = relations(pagosFijos, ({one, many}) => ({
	cuentasContable: one(cuentasContables, {
		fields: [pagosFijos.cuentaContableId],
		references: [cuentasContables.id]
	}),
	proveedore: one(proveedores, {
		fields: [pagosFijos.proveedorId],
		references: [proveedores.id]
	}),
	pagosPagosFijos: many(pagosPagosFijos),
}));

export const equiposClienteRelations = relations(equiposCliente, ({one}) => ({
	cliente: one(clientes, {
		fields: [equiposCliente.clienteId],
		references: [clientes.id]
	}),
	contrato: one(contratos, {
		fields: [equiposCliente.contratoId],
		references: [contratos.id]
	}),
	suscripcione: one(suscripciones, {
		fields: [equiposCliente.suscripcionId],
		references: [suscripciones.id]
	}),
}));

export const suscripcionesRelations = relations(suscripciones, ({one, many}) => ({
	equiposClientes: many(equiposCliente),
	cliente: one(clientes, {
		fields: [suscripciones.clienteId],
		references: [clientes.id]
	}),
	plane: one(planes, {
		fields: [suscripciones.planId],
		references: [planes.id]
	}),
	servicio: one(servicios, {
		fields: [suscripciones.servicioId],
		references: [servicios.id]
	}),
	usuario: one(usuarios, {
		fields: [suscripciones.usuarioId],
		references: [usuarios.id]
	}),
	tickets: many(tickets),
}));

export const movimientosInventarioRelations = relations(movimientosInventario, ({one}) => ({
	productosPapeleria: one(productosPapeleria, {
		fields: [movimientosInventario.productoId],
		references: [productosPapeleria.id]
	}),
	usuario: one(usuarios, {
		fields: [movimientosInventario.usuarioId],
		references: [usuarios.id]
	}),
}));

export const categoriasRelations = relations(categorias, ({many}) => ({
	servicios: many(servicios),
	planes: many(planes),
}));

export const planesRelations = relations(planes, ({one, many}) => ({
	suscripciones: many(suscripciones),
	categoria: one(categorias, {
		fields: [planes.categoriaId],
		references: [categorias.id]
	}),
}));

export const ventasPapeleriaRelations = relations(ventasPapeleria, ({one, many}) => ({
	caja: one(cajas, {
		fields: [ventasPapeleria.cajaId],
		references: [cajas.id]
	}),
	cliente: one(clientes, {
		fields: [ventasPapeleria.clienteId],
		references: [clientes.id]
	}),
	cuentasBancaria: one(cuentasBancarias, {
		fields: [ventasPapeleria.cuentaBancariaId],
		references: [cuentasBancarias.id]
	}),
	usuario: one(usuarios, {
		fields: [ventasPapeleria.usuarioId],
		references: [usuarios.id]
	}),
	movimientosContable: one(movimientosContables, {
		fields: [ventasPapeleria.movimientoContableId],
		references: [movimientosContables.id]
	}),
	detallesVentaPapelerias: many(detallesVentaPapeleria),
}));

export const respuestasTicketsRelations = relations(respuestasTickets, ({one}) => ({
	ticket: one(tickets, {
		fields: [respuestasTickets.ticketId],
		references: [tickets.id]
	}),
	usuario: one(usuarios, {
		fields: [respuestasTickets.usuarioId],
		references: [usuarios.id]
	}),
}));

export const pagosPagosFijosRelations = relations(pagosPagosFijos, ({one}) => ({
	usuario: one(usuarios, {
		fields: [pagosPagosFijos.pagadoPor],
		references: [usuarios.id]
	}),
	pagosFijo: one(pagosFijos, {
		fields: [pagosPagosFijos.pagoFijoId],
		references: [pagosFijos.id]
	}),
}));

export const tareasRelations = relations(tareas, ({one}) => ({
	usuario: one(usuarios, {
		fields: [tareas.creadoPorId],
		references: [usuarios.id]
	}),
}));

export const traspasosRelations = relations(traspasos, ({one}) => ({
	usuario: one(usuarios, {
		fields: [traspasos.autorizadoPor],
		references: [usuarios.id]
	}),
	cuentasBancaria_bancoDestinoId: one(cuentasBancarias, {
		fields: [traspasos.bancoDestinoId],
		references: [cuentasBancarias.id],
		relationName: "traspasos_bancoDestinoId_cuentasBancarias_id"
	}),
	cuentasBancaria_bancoOrigenId: one(cuentasBancarias, {
		fields: [traspasos.bancoOrigenId],
		references: [cuentasBancarias.id],
		relationName: "traspasos_bancoOrigenId_cuentasBancarias_id"
	}),
	caja_cajaDestinoId: one(cajas, {
		fields: [traspasos.cajaDestinoId],
		references: [cajas.id],
		relationName: "traspasos_cajaDestinoId_cajas_id"
	}),
	caja_cajaOrigenId: one(cajas, {
		fields: [traspasos.cajaOrigenId],
		references: [cajas.id],
		relationName: "traspasos_cajaOrigenId_cajas_id"
	}),
}));

export const sesionesUsuarioRelations = relations(sesionesUsuario, ({one}) => ({
	usuario: one(usuarios, {
		fields: [sesionesUsuario.usuarioId],
		references: [usuarios.id]
	}),
}));

export const cargosRelations = relations(cargos, ({many}) => ({
	empleados: many(empleados),
}));

export const departamentosRelations = relations(departamentos, ({many}) => ({
	empleados: many(empleados),
}));

export const periodosNominaRelations = relations(periodosNomina, ({many}) => ({
	nominas: many(nomina),
}));

export const aperturasCajaRelations = relations(aperturasCaja, ({one}) => ({
	caja: one(cajas, {
		fields: [aperturasCaja.cajaId],
		references: [cajas.id]
	}),
	usuario: one(usuarios, {
		fields: [aperturasCaja.usuarioId],
		references: [usuarios.id]
	}),
}));

export const sesionesCajaRelations = relations(sesionesCaja, ({one}) => ({
	caja: one(cajas, {
		fields: [sesionesCaja.cajaId],
		references: [cajas.id]
	}),
	usuario: one(usuarios, {
		fields: [sesionesCaja.usuarioId],
		references: [usuarios.id]
	}),
}));

export const cajaCheckpointsRelations = relations(cajaCheckpoints, ({one}) => ({
	caja: one(cajas, {
		fields: [cajaCheckpoints.cajaId],
		references: [cajas.id]
	}),
	usuario: one(usuarios, {
		fields: [cajaCheckpoints.creadoPor],
		references: [usuarios.id]
	}),
}));

export const categoriasPapeleriaRelations = relations(categoriasPapeleria, ({many}) => ({
	productosPapelerias: many(productosPapeleria),
}));

export const detallesVentaPapeleriaRelations = relations(detallesVentaPapeleria, ({one}) => ({
	productosPapeleria: one(productosPapeleria, {
		fields: [detallesVentaPapeleria.productoId],
		references: [productosPapeleria.id]
	}),
	ventasPapeleria: one(ventasPapeleria, {
		fields: [detallesVentaPapeleria.ventaId],
		references: [ventasPapeleria.id]
	}),
}));

export const historialCostosPapeleriaRelations = relations(historialCostosPapeleria, ({one}) => ({
	productosPapeleria: one(productosPapeleria, {
		fields: [historialCostosPapeleria.productoId],
		references: [productosPapeleria.id]
	}),
	usuario: one(usuarios, {
		fields: [historialCostosPapeleria.usuarioId],
		references: [usuarios.id]
	}),
}));

export const rolesPermisosRelations = relations(rolesPermisos, ({one}) => ({
	usuario: one(usuarios, {
		fields: [rolesPermisos.asignadoPor],
		references: [usuarios.id]
	}),
	permiso: one(permisos, {
		fields: [rolesPermisos.permisoId],
		references: [permisos.id]
	}),
	role: one(roles, {
		fields: [rolesPermisos.rolId],
		references: [roles.id]
	}),
}));

export const permisosRelations = relations(permisos, ({many}) => ({
	rolesPermisos: many(rolesPermisos),
	usuariosPermisos: many(usuariosPermisos),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolesPermisos: many(rolesPermisos),
	usuariosRoles: many(usuariosRoles),
}));

export const usuariosRolesRelations = relations(usuariosRoles, ({one}) => ({
	usuario_asignadoPor: one(usuarios, {
		fields: [usuariosRoles.asignadoPor],
		references: [usuarios.id],
		relationName: "usuariosRoles_asignadoPor_usuarios_id"
	}),
	role: one(roles, {
		fields: [usuariosRoles.rolId],
		references: [roles.id]
	}),
	usuario_usuarioId: one(usuarios, {
		fields: [usuariosRoles.usuarioId],
		references: [usuarios.id],
		relationName: "usuariosRoles_usuarioId_usuarios_id"
	}),
}));

export const usuariosPermisosRelations = relations(usuariosPermisos, ({one}) => ({
	usuario_asignadoPor: one(usuarios, {
		fields: [usuariosPermisos.asignadoPor],
		references: [usuarios.id],
		relationName: "usuariosPermisos_asignadoPor_usuarios_id"
	}),
	permiso: one(permisos, {
		fields: [usuariosPermisos.permisoId],
		references: [permisos.id]
	}),
	usuario_usuarioId: one(usuarios, {
		fields: [usuariosPermisos.usuarioId],
		references: [usuarios.id],
		relationName: "usuariosPermisos_usuarioId_usuarios_id"
	}),
}));