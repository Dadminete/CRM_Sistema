export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiFailure {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface UserSummary {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  avatar?: string | null;
}

export interface ClienteListItem {
  id: string;
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  telefono?: string | null;
  email?: string | null;
  estado: string;
  montoMensual?: string;
  fotoUrl?: string | null;
  categoriaCliente?: "NUEVO" | "VIEJO" | "VIP" | "INACTIVO";
  tipoCliente?: string;
}

export interface ClienteDetail extends ClienteListItem {
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  montoTotal?: string;
  cedula?: string | null;
  telefonoSecundario?: string | null;
}

export interface SuscripcionItem {
  id: string;
  numero_contrato?: string;
  numeroContrato?: string;
  cliente_nombre?: string;
  cliente_apellidos?: string;
  plan_nombre?: string;
  servicio_nombre?: string;
  precio_mensual?: string;
  precioMensual?: string;
  estado: string;
}

export interface FacturaListItem {
  id: string;
  numeroFactura: string;
  clienteId: string;
  clienteNombre: string;
  clienteApellidos: string;
  fechaFactura: string;
  fechaVencimiento: string;
  estado: string;
  total: number | string;
  pendiente?: number | string;
}
