export type FormState = {
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  celular: string;
  email: string;
  direccion: string;
  tipoCliente: "residencial" | "empresarial";
  categoria: "NUEVO" | "VIEJO" | "VIP" | "INACTIVO";
  sector: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  coordenadas: string;
  limiteCredito: string;
  diasCredito: string;
  descuentoCliente: string;
  sexo: "M" | "F" | "";
  ocupacion: string;
  nombreEmpresa: string;
  referenciaPersonal: string;
  observaciones: string;
  activo: boolean;
  aceptaPromociones: boolean;
  planId: string;
  servicioIds: string[];
  fotoUrl: string;
};

export const initialForm: FormState = {
  codigoCliente: "",
  nombre: "",
  apellidos: "",
  cedula: "",
  telefono: "",
  celular: "",
  email: "",
  direccion: "",
  tipoCliente: "residencial",
  categoria: "NUEVO",
  sector: "",
  ciudad: "",
  provincia: "",
  codigoPostal: "",
  coordenadas: "",
  limiteCredito: "",
  diasCredito: "",
  descuentoCliente: "",
  sexo: "",
  ocupacion: "",
  nombreEmpresa: "",
  referenciaPersonal: "",
  observaciones: "",
  activo: true,
  aceptaPromociones: true,
  planId: "",
  servicioIds: [],
  fotoUrl: "",
};
