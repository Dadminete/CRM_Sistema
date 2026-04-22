"use client";

import { useState, useEffect } from "react";
import {
    Wrench,
    Search,
    RefreshCw,
    Plus,
    Filter,
    ChevronLeft,
    ChevronRight,
    Clock,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Eye,
    CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TicketDetailModal } from "./_components/ticket-detail-modal";


interface Ticket {
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
    } | null;
}

const ITEMS_PER_PAGE = 10;

export default function ListadoAveriasPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchTickets = async () => {

        setIsLoading(true);
        try {
            const res = await fetch("/api/averias");
            const data = await res.json();
            if (data.success) {
                const ticketsList = Array.isArray(data.data) ? data.data : (data.data.data || []);
                setTickets(ticketsList);
            } else {
                toast.error(data.error || "Error al cargar reportes");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const filteredTickets = tickets.filter((t) => {
        const matchesSearch =
            t.ticket.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticket.numeroTicket.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.cliente?.nombre.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.cliente?.apellidos.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || t.ticket.estado === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredTickets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "baixa":
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Baja</Badge>;
            case "media":
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">Media</Badge>;
            case "alta":
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">Alta</Badge>;
            case "critica":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Crítica</Badge>;
            default:
                return <Badge>{priority}</Badge>;
        }
    };

    const handleQuickClose = async (id: string) => {
        try {
            const res = await fetch(`/api/averias/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: "cerrado" }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Ticket cerrado exitosamente");
                fetchTickets();
            } else {
                toast.error(data.error || "Error al cerrar ticket");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    const handleViewTicket = (id: string) => {
        setSelectedTicketId(id);
        setIsDetailOpen(true);
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

    return (
        <div className="animate-in fade-in flex flex-col gap-6 p-6 duration-500">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 underline underline-offset-8 decoration-primary/30">
                        <Wrench className="text-primary h-8 w-8" />
                        Listado de Averías
                    </h1>
                    <p className="text-muted-foreground mt-2">Seguimiento y gestión de reportes técnicos y tickets de soporte.</p>
                </div>
                <Button
                    className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 text-white"
                    onClick={() => window.location.href = "/dashboard/averias/crear"}
                >
                    <Plus className="h-5 w-5" />
                    Nuevo Reporte
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Abiertos</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.ticket.estado === 'abierto').length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">En Proceso</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.ticket.estado === 'proceso').length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cerrados</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.ticket.estado === 'cerrado').length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Críticos</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.ticket.prioridad === 'critica').length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Card */}
            <Card className="shadow-md border-none ring-1 ring-border/60 overflow-hidden">
                <CardHeader className="bg-muted/5 flex flex-col md:flex-row justify-between gap-4 border-b pb-6 md:items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Filter className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Filtros y Búsqueda</CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="abierto">Abiertos</SelectItem>
                                <SelectItem value="proceso">En Proceso</SelectItem>
                                <SelectItem value="cerrado">Cerrados</SelectItem>
                                <SelectItem value="cancelado">Cancelados</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por ticket, cliente, asunto..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchTickets} className="h-9 w-9">
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[120px] font-bold">Ticket</TableHead>
                                <TableHead className="font-bold">Cliente</TableHead>
                                <TableHead className="font-bold">Asunto</TableHead>
                                <TableHead className="w-[100px] font-bold text-center">Prioridad</TableHead>
                                <TableHead className="w-[120px] font-bold text-center">Estado</TableHead>
                                <TableHead className="w-[150px] font-bold">Fecha</TableHead>
                                <TableHead className="w-[100px] text-center font-bold">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">
                                        Cargando reportes...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">
                                        No se encontraron resultados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((item) => (
                                    <TableRow key={item.ticket.id} className="hover:bg-primary/5 group transition-colors">
                                        <TableCell className="px-4 py-3 font-mono text-xs font-bold text-primary">
                                            {item.ticket.numeroTicket}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">
                                                    {item.cliente?.nombre} {item.cliente?.apellidos}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tight">
                                                    {item.cliente?.codigoCliente}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm font-medium max-w-[200px] truncate">
                                            {item.ticket.asunto}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-center">
                                            {getPriorityBadge(item.ticket.prioridad)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-center">
                                            {getStatusBadge(item.ticket.estado)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium">
                                            {item.ticket.fechaCreacion
                                                ? format(new Date(item.ticket.fechaCreacion), "dd MMM yyyy, HH:mm", { locale: es })
                                                : "N/A"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleViewTicket(item.ticket.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {item.ticket.estado !== 'cerrado' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                                        onClick={() => handleQuickClose(item.ticket.id)}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>

                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/5">
                        <span className="text-xs text-muted-foreground font-medium">
                            Mostrando página {currentPage} de {totalPages || 1}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px] font-bold"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px] font-bold"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-xs text-blue-800 shadow-sm">
                <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                <p>
                    <strong>Información:</strong> Las averías recibidas por WhatsApp aparecerán automáticamente en este listado con el cliente identificado y un aviso de notificación.
                </p>
            </div>

            <TicketDetailModal
                ticketId={selectedTicketId}
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedTicketId(null);
                }}
                onUpdate={fetchTickets}
            />
        </div>
    );
}


function AlertTriangle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
