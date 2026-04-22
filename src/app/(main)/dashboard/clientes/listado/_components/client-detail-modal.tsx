"use client";

import {
  Calendar,
  Clock,
  Edit,
  FileText,
  History,
  Info,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Users,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  apellidos: string;
  cedula: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  email: string | null;
  direccion: string | null;
  sectorBarrio: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  coordenadasLat: string | number | null;
  coordenadasLng: string | number | null;
  sexo: string | null;
  estado: string;
  tipoCliente: string;
  categoriaCliente: string;
  fotoUrl: string | null;
  limiteCrediticio: string | number | null;
  diasCredito: number | null;
  descuentoPorcentaje: string | number | null;
  notas: string | null;
  contacto: string | null;
  createdAt: string;
  montoTotal?: string | number;
  montoMensual?: string | number;
}

interface Factura {
  id: string;
  numeroFactura: string;
  fechaFactura: string;
  total: string;
  estado: string;
  montoPendiente?: string | number;
  cobradoPor?: string;
  subtotal?: string;
  itbis?: string;
  descuento?: string;
  observaciones?: string;
}

interface Ticket {
  id: string;
  numeroTicket: string;
  asunto: string;
  fechaCreacion: string;
  estado: string;
  prioridad: string;
}

interface Subscription {
  id: string;
  numeroContrato: string;
  servicio: string | null;
  plan: string | null;
  precioMensual: string;
  estado: string;
  fechaInicio: string;
  fechaProximoPago: string | null;
}

interface HistoryItem {
  id: string;
  suscripcionId: string;
  tipoCambio: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
  usuario: string | null;
}

interface ClientDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isFetching: boolean;
  detailClient: {
    client: Cliente;
    invoices: Factura[];
    tickets: Ticket[];
    subscriptions?: Subscription[];
    history?: HistoryItem[];
  } | null;
  onEdit: (client: Cliente) => void;
}

export function ClientDetailModal({ isOpen, onOpenChange, isFetching, detailClient, onEdit }: ClientDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col overflow-hidden rounded-xl border-none p-0 shadow-2xl sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Expediente del Cliente</DialogTitle>
          <DialogDescription>
            Información detallada sobre el perfil, facturación y servicios del cliente.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <RefreshCw className="text-primary h-10 w-10 animate-spin" />
            <p className="text-muted-foreground font-medium">Obteniendo expediente del cliente...</p>
          </div>
        ) : detailClient ? (
          <>
            <div className="bg-primary/95 relative overflow-hidden px-8 pt-8 pb-12">
              <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-10">
                <Users className="h-48 w-48 text-white" />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="flex h-24 w-24 rotate-3 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-4xl font-bold text-white shadow-2xl backdrop-blur-xl transition-transform group-hover:rotate-0">
                  {detailClient.client.fotoUrl ? (
                    <img
                      src={detailClient.client.fotoUrl}
                      alt={`${detailClient.client.nombre} ${detailClient.client.apellidos}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {detailClient.client.nombre[0]}
                      {detailClient.client.apellidos[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl leading-tight font-bold tracking-tight text-white">
                    {detailClient.client.nombre} {detailClient.client.apellidos}
                  </h2>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge className="h-5 border-white/20 bg-white/20 px-2 py-0 text-[10px] font-bold text-white backdrop-blur-md">
                      ID: {detailClient.client.codigoCliente}
                    </Badge>
                    <Badge
                      className={`h-5 border-none px-2 py-0 text-[10px] font-bold ${detailClient.client.estado === "activo" ? "bg-emerald-400 text-emerald-950" : "bg-red-400 text-red-950"}`}
                    >
                      {detailClient.client.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-1">
                    <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">Monto Mensual</p>
                    <p className="text-xl font-black text-white">
                      RD${" "}
                      {parseFloat(
                        (detailClient.client.montoMensual ?? detailClient.client.montoTotal ?? "0").toString(),
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="info" className="flex flex-1 flex-col">
              <TabsList className="bg-background h-14 w-full justify-start gap-8 rounded-none border-b px-8">
                <TabsTrigger
                  value="info"
                  className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                >
                  <Info className="h-4 w-4" /> Información
                </TabsTrigger>
                <TabsTrigger
                  value="facturas"
                  className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="h-4 w-4" /> Facturas
                  {detailClient.invoices.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary ml-1 h-5 min-w-[20px] justify-center border-none px-1.5"
                    >
                      {detailClient.invoices.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="averias"
                  className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                >
                  <Wrench className="h-4 w-4" /> Averías
                  {detailClient.tickets.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary ml-1 h-5 min-w-[20px] justify-center border-none px-1.5"
                    >
                      {detailClient.tickets.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-primary h-full gap-2 rounded-none px-0 font-bold shadow-none transition-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                >
                  <History className="h-4 w-4" /> Historial
                </TabsTrigger>
              </TabsList>

              <div className="bg-muted/5 flex-1 overflow-y-auto p-6">
                <TabsContent
                  value="info"
                  className="animate-in fade-in slide-in-from-bottom-2 mt-0 space-y-6 duration-300"
                >
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-primary/60 flex items-center gap-2 px-1 text-[11px] font-black tracking-[0.2em] uppercase">
                        Identidad y Clasificación
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <Card className="bg-background ring-border/50 border-none shadow-none ring-1">
                          <CardContent className="space-y-4 p-4">
                            <div className="border-muted/50 flex items-center justify-between border-b py-1">
                              <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Cédula / RNC
                              </Label>
                              <p className="text-foreground text-sm font-bold">{detailClient.client.cedula || "N/A"}</p>
                            </div>
                            <div className="border-muted/50 flex items-center justify-between border-b py-1">
                              <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Categoría
                              </Label>
                              <p className="text-foreground text-sm font-bold capitalize">
                                {detailClient.client.categoriaCliente}
                              </p>
                            </div>
                            <div className="border-muted/50 flex items-center justify-between border-b py-1">
                              <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Tipo Cliente
                              </Label>
                              <p className="text-foreground text-sm font-bold capitalize">
                                {detailClient.client.tipoCliente}
                              </p>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Límite Crédito
                              </Label>
                              <p className="text-foreground text-sm font-bold">
                                RD${" "}
                                {parseFloat(detailClient.client.limiteCrediticio?.toString() || "0").toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-primary/60 flex items-center gap-2 px-1 text-[11px] font-black tracking-[0.2em] uppercase">
                        Servicios Activos
                      </h3>
                      <div className="space-y-2">
                        {detailClient.subscriptions?.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-background ring-border/50 flex items-center justify-between rounded-xl p-3 shadow-sm ring-1"
                          >
                            <div className="flex flex-col">
                              <span className="text-foreground text-xs leading-none font-bold">
                                {sub.servicio || sub.plan || "Servicio General"}
                              </span>
                              <span className="text-muted-foreground mt-1 font-mono text-[10px]">
                                {sub.numeroContrato}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-primary text-xs font-black">
                                RD$ {parseFloat(sub.precioMensual).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(!detailClient.subscriptions || detailClient.subscriptions.length === 0) && (
                          <p className="text-muted-foreground px-1 text-xs italic">No hay servicios registrados.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-primary/60 flex items-center gap-2 px-1 text-[11px] font-black tracking-[0.2em] uppercase">
                        Vías de Comunicación
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Phone className="h-5 w-5" />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                              Teléfono Principal
                            </Label>
                            <p className="text-foreground text-sm font-bold">
                              {detailClient.client.telefono || "No especificado"}
                            </p>
                          </div>
                        </div>
                        {detailClient.client.telefonoSecundario && (
                          <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
                              <Phone className="h-5 w-5" />
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                                Teléfono Secundario
                              </Label>
                              <p className="text-foreground text-sm font-bold">
                                {detailClient.client.telefonoSecundario}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="overflow-hidden">
                            <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                              Email de Contacto
                            </Label>
                            <p className="text-foreground truncate text-sm font-bold">
                              {detailClient.client.email || "No especificado"}
                            </p>
                          </div>
                        </div>
                        <div className="bg-background ring-border/50 flex items-center gap-4 rounded-2xl p-4 shadow-sm ring-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-[10px] font-black tracking-tighter uppercase">
                              Ubicación
                            </Label>
                            <p className="text-foreground text-sm font-bold">
                              {detailClient.client.direccion || "Sin dirección"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Card className="bg-primary/5 ring-primary/10 border-none ring-1">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="text-primary/70 h-5 w-5" />
                        <div>
                          <p className="text-primary/70 text-[10px] font-bold tracking-widest uppercase">
                            Miembro desde
                          </p>
                          <p className="text-foreground text-sm font-bold">
                            {new Date(detailClient.client.createdAt).toLocaleDateString("es-DO", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <History className="text-primary/5 h-8 w-8" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="facturas" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                  {detailClient.invoices.length === 0 ? (
                    <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-4 py-20">
                      <div className="bg-muted/20 rounded-full p-4">
                        <FileText className="h-12 w-12" />
                      </div>
                      <p className="text-sm font-bold">No se registra actividad financiera reciente.</p>
                    </div>
                  ) : (
                    <Card className="ring-border/50 overflow-hidden border-none shadow-sm ring-1">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">Factura</TableHead>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">Fecha</TableHead>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">Importe</TableHead>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">
                              Pendiente
                            </TableHead>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">
                              Cobrado por
                            </TableHead>
                            <TableHead className="text-muted-foreground text-xs font-bold uppercase">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailClient.invoices.map((inv) => (
                            <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="text-primary font-mono text-xs font-bold">
                                {inv.numeroFactura}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {new Date(inv.fechaFactura).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-foreground text-xs font-bold">
                                RD$ {parseFloat(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-foreground text-xs font-bold">
                                RD${" "}
                                {parseFloat(inv.montoPendiente || "0").toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-foreground text-xs font-medium">
                                <span className="font-bold text-blue-600">
                                  {inv.cobradoPor ? inv.cobradoPor.toUpperCase() : "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`h-5 border-none py-0 text-[9px] font-bold shadow-none ${
                                    inv.estado === "paga" || inv.estado === "pagada"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : inv.estado === "pendiente"
                                        ? "bg-red-500/10 text-red-600"
                                        : inv.estado === "parcial" || inv.estado === "pago parcial"
                                          ? "bg-orange-500/10 text-orange-600"
                                          : "bg-gray-500/10 text-gray-600"
                                  }`}
                                >
                                  {inv.estado.toUpperCase()}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="averias" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                  {detailClient.tickets.length === 0 ? (
                    <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-4 py-20">
                      <div className="bg-muted/20 rounded-full p-4">
                        <Wrench className="h-12 w-12" />
                      </div>
                      <p className="text-sm font-bold">Sin reportes de averías o tickets técnicos.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {detailClient.tickets.map((t) => (
                        <Card
                          key={t.id}
                          className="ring-border/60 hover:ring-primary/20 group border-none shadow-sm ring-1 transition-all"
                        >
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="bg-muted ring-border/50 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ring-1">
                                  {t.numeroTicket}
                                </span>
                                <Badge
                                  className={`h-5 border-none text-[9px] font-bold shadow-none ${
                                    t.estado === "abierto"
                                      ? "bg-red-500/10 text-red-600"
                                      : t.estado === "proceso"
                                        ? "bg-amber-500/10 text-amber-600"
                                        : "bg-emerald-500/10 text-emerald-600"
                                  }`}
                                >
                                  {t.estado === "abierto"
                                    ? "REPORTADA"
                                    : t.estado === "cerrado"
                                      ? "SOLUCIONADA"
                                      : "PROCESANDO"}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold opacity-70">
                                <Clock className="h-3.5 w-3.5" /> {new Date(t.fechaCreacion).toLocaleDateString()}
                              </div>
                            </div>
                            <h4 className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                              {t.asunto}
                            </h4>
                            <div className="mt-3 flex items-center justify-between">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-widest uppercase ${
                                  t.prioridad === "alta"
                                    ? "bg-red-100 text-red-600"
                                    : t.prioridad === "media"
                                      ? "bg-amber-100 text-amber-600"
                                      : "bg-blue-100 text-blue-600"
                                }`}
                              >
                                Prioridad {t.prioridad}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:bg-primary/5 h-7 px-2 text-[10px] font-bold uppercase"
                              >
                                Ver Informe
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                  {!detailClient.history || detailClient.history.length === 0 ? (
                    <div className="text-muted-foreground/50 flex flex-col items-center justify-center gap-4 py-20">
                      <div className="bg-muted/20 rounded-full p-4">
                        <History className="h-12 w-12" />
                      </div>
                      <p className="text-sm font-bold">No se registran cambios de servicios.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detailClient.history.map((h) => (
                        <div
                          key={h.id}
                          className="bg-background ring-border/60 flex flex-col gap-2 rounded-xl p-4 shadow-sm ring-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest uppercase">
                              {h.tipoCambio}
                            </Badge>
                            <span className="text-muted-foreground text-[10px] font-bold">
                              {new Date(h.fecha).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-muted-foreground text-[9px] font-bold tracking-wider uppercase">
                                Anterior
                              </p>
                              <p className="truncate text-xs font-bold text-red-600 line-through">
                                {h.valorAnterior || "---"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-[9px] font-bold tracking-wider uppercase">
                                Nuevo
                              </p>
                              <p className="truncate text-xs font-bold text-emerald-600">{h.valorNuevo || "---"}</p>
                            </div>
                          </div>
                          <div className="mt-1 border-t pt-2">
                            <p className="text-muted-foreground text-[10px] italic">
                              Modificado por:{" "}
                              <span className="text-foreground font-bold not-italic">{h.usuario || "Sistema"}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="bg-background flex flex-col items-center justify-between gap-4 border-t p-6 sm:flex-row">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:bg-muted/50 text-xs font-bold tracking-widest uppercase"
                onClick={() => onOpenChange(false)}
              >
                Cerrar Expediente
              </Button>
              <Button
                className="shadow-primary/20 gap-2 px-8 font-bold shadow-xl"
                onClick={() => {
                  onEdit(detailClient.client);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4" /> Editar Perfil
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
