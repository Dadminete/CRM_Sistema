"use client";

import { useState, useEffect } from "react";
import {
    Wrench,
    User,
    FileText,
    AlertTriangle,
    Send,
    ArrowLeft,
    Search,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Cliente {
    id: string;
    nombre: string;
    apellidos: string;
    codigoCliente: string;
}

export default function CrearAveriaPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoadingClientes, setIsLoadingClientes] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        clienteId: "",
        asunto: "",
        descripcion: "",
        prioridad: "media",
        categoria: "Internet",
    });

    useEffect(() => {
        const fetchClientes = async () => {
            setIsLoadingClientes(true);
            try {
                const res = await fetch("/api/clientes");
                const data = await res.json();
                if (data.success) {
                    const clientesList = Array.isArray(data.data) ? data.data : (data.data.data || []);
                    setClientes(clientesList);
                    setFilteredClientes(clientesList);
                }
            } catch (error) {
                console.error("Error fetching clients:", error);
            } finally {
                setIsLoadingClientes(false);
            }
        };
        fetchClientes();
    }, []);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredClientes(
            clientes.filter(
                (c) =>
                    c.nombre.toLowerCase().includes(term) ||
                    c.apellidos.toLowerCase().includes(term) ||
                    c.codigoCliente.toLowerCase().includes(term)
            )
        );
    }, [searchTerm, clientes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clienteId) {
            toast.error("Debe seleccionar un cliente");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/averias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Avería registrada exitosamente");
                // Reset form
                setFormData({
                    clienteId: "",
                    asunto: "",
                    descripcion: "",
                    prioridad: "media",
                    categoria: "Internet",
                });
                setSearchTerm("");
            } else {
                toast.error(data.error || "Error al registrar avería");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-in fade-in max-w-4xl mx-auto flex flex-col gap-6 p-6 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Wrench className="text-primary h-8 w-8" />
                        Reportar Avería
                    </h1>
                    <p className="text-muted-foreground mt-1">Registra un nuevo problema técnico o solicitud de soporte.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Cliente Selection */}
                <Card className="md:col-span-12">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Seleccionar Cliente
                        </CardTitle>
                        <CardDescription>Busca y selecciona el cliente que reporta la avería</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o código de cliente..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {isLoadingClientes ? (
                                <div className="col-span-full py-8 text-center text-muted-foreground animate-pulse">
                                    Cargando clientes...
                                </div>
                            ) : filteredClientes.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-muted-foreground italic">
                                    No se encontraron clientes
                                </div>
                            ) : (
                                filteredClientes.map((cliente) => (
                                    <div
                                        key={cliente.id}
                                        onClick={() => setFormData({ ...formData, clienteId: cliente.id })}
                                        className={cn(
                                            "cursor-pointer p-3 rounded-lg border transition-all text-sm",
                                            formData.clienteId === cliente.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="font-bold">
                                            {cliente.nombre} {cliente.apellidos}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">{cliente.codigoCliente}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Ticket Details */}
                <Card className="md:col-span-12">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Detalles del Reporte
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="asunto">Asunto</Label>
                                <Input
                                    id="asunto"
                                    placeholder="Ej: Internet muy lento, Sin señal..."
                                    required
                                    value={formData.asunto}
                                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="categoria">Categoría</Label>
                                <Select
                                    value={formData.categoria}
                                    onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Internet">Internet</SelectItem>
                                        <SelectItem value="TV">Televisión</SelectItem>
                                        <SelectItem value="Instalacion">Instalación</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prioridad">Prioridad</Label>
                                <Select
                                    value={formData.prioridad}
                                    onValueChange={(val) => setFormData({ ...formData, prioridad: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar prioridad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="baixa">Baja</SelectItem>
                                        <SelectItem value="media">Media</SelectItem>
                                        <SelectItem value="alta">Alta</SelectItem>
                                        <SelectItem value="critica">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción del Problema</Label>
                            <Textarea
                                id="descripcion"
                                placeholder="Describe detalladamente el problema reportado por el cliente..."
                                className="min-h-[120px]"
                                required
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !formData.clienteId} className="min-w-[150px]">
                                {isSubmitting ? (
                                    "Registrando..."
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Registrar Reporte
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
