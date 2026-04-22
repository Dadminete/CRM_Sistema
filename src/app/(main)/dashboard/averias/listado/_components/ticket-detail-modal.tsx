"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Wrench,
    User,
    Clock,
    CheckCircle2,
    XCircle,
    PlayCircle,
    Send,
    MessageSquare,
    Phone,
    MapPin,
    AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Response {
    id: string;
    mensaje: string;
    esInterno: boolean;
    fechaRespuesta: string;
}

interface TicketDetail {
    ticket: {
        id: string;
        numeroTicket: string;
        asunto: string;
        descripcion: string;
        categoria: string;
        prioridad: string;
        estado: string;
        fechaCreacion: string;
    };
    cliente: {
        id: string;
        nombre: string;
        apellidos: string;
        codigoCliente: string;
        telefono: string | null;
        telefonoSecundario: string | null;
        direccion: string | null;
    } | null;
    responses: Response[];
}

interface TicketDetailModalProps {
    ticketId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function TicketDetailModal({ ticketId, isOpen, onClose, onUpdate }: TicketDetailModalProps) {
    const [data, setData] = useState<TicketDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newResponse, setNewResponse] = useState("");

    useEffect(() => {
        if (isOpen && ticketId) {
            fetchDetail();
        } else {
            setData(null);
            setNewResponse("");
        }
    }, [isOpen, ticketId]);

    const fetchDetail = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/averias/${ticketId}`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                toast.error(result.error || "Error al cargar detalles");
                onClose();
            }
        } catch (error) {
            toast.error("Error de conexión");
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/averias/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: newStatus }),
            });
            const result = await res.json();
            if (result.success) {
                toast.success(`Ticket ${newStatus === 'cerrado' ? 'cerrado' : 'actualizado'} correctamente`);
                fetchDetail();
                onUpdate();
            } else {
                toast.error(result.error || "Error al actualizar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddResponse = async () => {
        if (!newResponse.trim()) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/averias/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje: newResponse }),
            });
            const result = await res.json();
            if (result.success) {
                toast.success("Respuesta enviada");
                setNewResponse("");
                fetchDetail();
            } else {
                toast.error(result.error || "Error al enviar respuesta");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "abierto":
                return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Abierto</Badge>;
            case "proceso":
                return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">En Proceso</Badge>;
            case "cerrado":
                return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Cerrado</Badge>;
            case "cancelado":
                return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <Wrench className="h-6 w-6 text-primary" />
                                {data?.ticket.numeroTicket || "Cargando..."}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {data?.ticket.asunto}
                            </DialogDescription>
                        </div>
                        {data && getStatusBadge(data.ticket.estado)}
                    </div>
                </DialogHeader>

                <Separator />

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Panel: Info */}
                    <ScrollArea className="flex-1 md:w-2/5 border-r">
                        <div className="p-6 space-y-6">
                            {isLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                    <div className="h-20 bg-muted rounded"></div>
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                </div>
                            ) : data && (
                                <>
                                    <section className="space-y-3">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <User className="h-4 w-4" /> Cliente
                                        </h4>
                                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                            <p className="font-bold text-sm">{data.cliente?.nombre} {data.cliente?.apellidos}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{data.cliente?.codigoCliente}</p>
                                            <div className="mt-2 space-y-1">
                                                {(data.cliente?.telefono || data.cliente?.telefonoSecundario) && (
                                                    <p className="text-xs flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-primary" />
                                                        {data.cliente?.telefonoSecundario || data.cliente?.telefono}
                                                    </p>
                                                )}
                                                {data.cliente?.direccion && (
                                                    <p className="text-xs flex items-center gap-2">
                                                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                                                        <span className="truncate">{data.cliente?.direccion}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Descripción</h4>
                                        <div className="text-sm bg-primary/5 p-4 rounded-lg border border-primary/10 leading-relaxed italic">
                                            "{data.ticket.descripcion}"
                                        </div>
                                    </section>

                                    <section className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">Categoría:</span>
                                            <span className="font-bold">{data.ticket.categoria}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">Prioridad:</span>
                                            <Badge variant="outline" className="uppercase text-[10px] py-0">{data.ticket.prioridad}</Badge>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">Creado:</span>
                                            <span>
                                                {data.ticket.fechaCreacion
                                                    ? format(new Date(data.ticket.fechaCreacion), "dd/MM/yyyy HH:mm", { locale: es })
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Right Panel: Timeline/Responses */}
                    <div className="flex-1 md:w-3/5 flex flex-col bg-muted/5">
                        <div className="p-4 border-b flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold">Historial de Respuestas</h4>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {data?.responses && data.responses.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground italic text-xs">
                                        No hay respuestas registradas aún.
                                    </div>
                                ) : (
                                    data?.responses.map((resp) => (
                                        <div key={resp.id} className={cn(
                                            "p-3 rounded-lg text-sm shadow-sm",
                                            resp.esInterno ? "bg-amber-50 border border-amber-100 ml-4" : "bg-white border border-border mr-4"
                                        )}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-[11px] uppercase text-primary">
                                                    {resp.esInterno ? "Interno" : "Sistema/Admin"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {format(new Date(resp.fechaRespuesta), "HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                            <p className="leading-snug">{resp.mensaje}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {/* Add Response Form */}
                        <div className="p-4 border-t bg-white space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="resp" className="text-[10px] uppercase font-bold text-muted-foreground">Nueva Respuesta</Label>
                                <Textarea
                                    id="resp"
                                    placeholder="Escribe una actualización para el ticket..."
                                    className="min-h-[80px] text-sm resize-none"
                                    value={newResponse}
                                    onChange={(e) => setNewResponse(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    className="h-8"
                                    disabled={isUpdating || !newResponse.trim()}
                                    onClick={handleAddResponse}
                                >
                                    <Send className="h-3 w-3 mr-2" /> Enviar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 border-t flex flex-row justify-between sm:justify-between items-center bg-muted/5">
                    <div className="flex gap-2">
                        {data?.ticket.estado === 'abierto' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-orange-200 text-orange-600 hover:bg-orange-50 gap-2"
                                onClick={() => handleUpdateStatus('proceso')}
                                disabled={isUpdating}
                            >
                                <PlayCircle className="h-4 w-4" /> Atender
                            </Button>
                        )}
                        {(data?.ticket.estado === 'abierto' || data?.ticket.estado === 'proceso') && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50 gap-2"
                                onClick={() => handleUpdateStatus('cerrado')}
                                disabled={isUpdating}
                            >
                                <CheckCircle2 className="h-4 w-4" /> Cerrar Ticket
                            </Button>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-9">Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
