"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Banknote, Receipt, AlertCircle, Loader2, PackageOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

type Producto = {
  id: number;
  codigo: string;
  codigoBarras: string | null;
  nombre: string;
  precioVenta: string;
  stockActual: number;
  imagen: string | null;
  aplicaImpuesto: boolean;
  tasaImpuesto: string;
  categoria?: { id: number; nombre: string; color: string | null };
};

type CartItem = {
  producto: Producto;
  cantidad: number;
};

type Caja = {
  id: string;
  nombre: string;
  saldoActual: string;
  activa: boolean;
};

type CuentaBancaria = {
  id: string;
  numeroCuenta: string;
  bancoNombre: string;
  bankId: string;
  activo: boolean;
};

// Helper: normaliza texto quitando tildes para comparación robusta
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function VentaPapeleriaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [cajaId, setCajaId] = useState<string>("");
  const [cuentaBancariaId, setCuentaBancariaId] = useState<string>("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteCedula, setClienteCedula] = useState("");
  const [descuento, setDescuento] = useState<number>(0);
  const [montoPagado, setMontoPagado] = useState<number>(0);
  
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchProductos();
    fetchCajas();
    fetchCuentasBancarias();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/papeleria/productos");
      const data = await res.json();
      if (data.success) {
        const productosNormalizados = (data.data || []).map((p: any) => ({
          ...p,
          id: Number(p.id),
          stockActual: Number(p.stockActual),
        }));
        setProductos(productosNormalizados);
      } else {
        toast.error("Error al cargar productos");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const fetchCajas = async () => {
    try {
      const res = await fetch("/api/traspasos/cuentas/cajas");
      const data = await res.json();
      if (data.success) {
        const cajasActivas = data.data.filter((c: Caja) => c.activa);
        setCajas(cajasActivas);
        // Auto-seleccionar caja de papelería (ignora tildes y mayúsculas)
        const cajaPapeleria = cajasActivas.find((c: Caja) => normalize(c.nombre).includes("papeleria"));
        if (cajaPapeleria) {
          setCajaId(cajaPapeleria.id);
        }
      }
    } catch (error) {
      console.error("Error cargando cajas:", error);
    }
  };

  const fetchCuentasBancarias = async () => {
    try {
      const res = await fetch("/api/traspasos/cuentas/bancos");
      const data = await res.json();
      if (data.success) {
        const cuentasActivas = data.data.filter((c: CuentaBancaria) => c.activo);
        setCuentasBancarias(cuentasActivas);
      }
    } catch (error) {
      console.error("Error cargando cuentas bancarias:", error);
    }
  };

  const filteredProductos = useMemo(() => {
    if (!searchTerm) return productos;
    const lowerSearch = searchTerm.toLowerCase();
    return productos.filter(
      p => 
        p.nombre.toLowerCase().includes(lowerSearch) || 
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(lowerSearch)) ||
        p.codigo.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, productos]);

  const addToCart = (producto: Producto) => {
    if (producto.stockActual <= 0) {
      toast.error("No hay stock disponible");
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stockActual) {
          toast.warning("Has alcanzado el límite de stock de este producto");
          return prev;
        }
        return prev.map(item => 
          item.producto.id === producto.id 
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const updateQuantity = (productoId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.producto.id === productoId) {
          const newQuantity = item.cantidad + delta;
          if (newQuantity <= 0) return item; // should be removed via trash icon instead
          if (newQuantity > item.producto.stockActual) {
            toast.warning("Límite de stock alcanzado");
            return item;
          }
          return { ...item, cantidad: newQuantity };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productoId: number) => {
    setCart(prev => prev.filter(item => item.producto.id !== productoId));
  };

  const totales = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => {
      const precioMonto = Number(item.producto.precioVenta);
      const sub = precioMonto * item.cantidad;
      return acc + sub;
    }, 0);

    const impuestos = cart.reduce((acc, item) => {
      const precioMonto = Number(item.producto.precioVenta);
      const sub = precioMonto * item.cantidad;
      let impuesto = 0;
      if (item.producto.aplicaImpuesto) {
        impuesto = sub * (Number(item.producto.tasaImpuesto) / 100);
      }
      return acc + impuesto;
    }, 0);

    const descuentoMonto = Math.min(descuento, subtotal + impuestos);
    const total = subtotal + impuestos - descuentoMonto;
    const cambio = Math.max(0, montoPagado - total);

    return { 
      subtotal, 
      impuestos, 
      descuentoMonto,
      total, 
      montoPagado,
      cambio
    };
  }, [cart, descuento, montoPagado]);

  const handleProcesarVenta = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (metodoPago === "TRANSFERENCIA" && !cuentaBancariaId) {
      toast.error("Selecciona una cuenta bancaria para la transferencia");
      return;
    }

    if (metodoPago === "EFECTIVO" && !cajaId) {
      toast.error("Selecciona una caja para el efectivo");
      return;
    }

    if (montoPagado > 0 && montoPagado < totales.total) {
      toast.error("El monto pagado es insuficiente");
      return;
    }

    try {
      setProcesando(true);
      const payload = {
        clienteNombre,
        clienteCedula,
        metodoPago,
        cajaId: metodoPago === "EFECTIVO" ? cajaId : undefined,
        cuentaBancariaId: metodoPago === "TRANSFERENCIA" ? cuentaBancariaId : undefined,
        notas: `Descuento: RD$ ${totales.descuentoMonto.toFixed(2)} | Cambio: RD$ ${totales.cambio.toFixed(2)}`,
        items: cart.map(c => ({
          productoId: Number(c.producto.id),
          cantidad: c.cantidad
        }))
      };

      const res = await fetch("/api/papeleria/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Error procesando la venta");
        if (data.details) console.error(data.details);
        return;
      }

      toast.success("Venta completada con éxito!");
      setCart([]);
      setClienteNombre("");
      setClienteCedula("");
      setMetodoPago("EFECTIVO");
      setCuentaBancariaId("");
      setDescuento(0);
      setMontoPagado(0);
      // Restaurar caja de papelería como predeterminada
      setCajas(prev => {
        const cajaPapeleria = prev.find((c) => normalize(c.nombre).includes("papeleria"));
        if (cajaPapeleria) setCajaId(cajaPapeleria.id);
        return prev;
      });
      fetchProductos();
      
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 p-4 w-full">
      {/* SECCIÓN IZQUIERDA: PRODUCTOS */}
      <Card className="flex-[2] flex flex-col h-full overflow-hidden border-none shadow-sm">
        <CardHeader className="pb-3 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <PackageOpen className="h-6 w-6 text-primary" />
              Punto de Venta Papelería
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Cargando catálogo...</p>
            </div>
          ) : filteredProductos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <PackageOpen className="h-12 w-12 mb-2 opacity-20" />
              <p>No se encontraron productos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProductos.map((prod) => (
                <div 
                  key={prod.id} 
                  className={`bg-white dark:bg-slate-950 border rounded-xl overflow-hidden cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${prod.stockActual <= 0 ? 'opacity-50 grayscale' : ''}`}
                  onClick={() => addToCart(prod)}
                >
                  <div className="h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                    {prod.imagen ? (
                      <img src={prod.imagen} alt={prod.nombre} className="object-cover h-full w-full" />
                    ) : (
                      <PackageOpen className="h-10 w-10 text-slate-300" />
                    )}
                    {prod.categoria && (
                      <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
                        {prod.categoria.nombre}
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-1 font-mono">{prod.codigo}</p>
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px] leading-tight mb-2">
                      {prod.nombre}
                    </h3>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="font-bold text-primary">
                        RD$ {Number(prod.precioVenta).toFixed(2)}
                      </span>
                      <Badge variant={prod.stockActual > 5 ? "outline" : "destructive"} className="text-[10px]">
                        Dis: {prod.stockActual}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN DERECHA: CARRITO */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden max-w-[450px]">
        <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Carrito de Venta
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-0 md:p-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
              <ShoppingCart className="h-24 w-24 mb-6 opacity-20" />
              <p className="text-2xl font-semibold">El carrito está vacío</p>
              <p className="text-base mt-3">Selecciona productos a la izquierda para agregarlos.</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.producto.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-1">{item.producto.nombre}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      RD$ {Number(item.producto.precioVenta).toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md h-8">
                      <button 
                        onClick={() => updateQuantity(item.producto.id, -1)}
                        className="px-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.cantidad}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.producto.id, 1)}
                        className="px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="w-20 text-right font-semibold text-sm">
                      RD$ {(Number(item.producto.precioVenta) * item.cantidad).toFixed(2)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.producto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-t bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
               <Label className="text-xs">Cliente (Opcional)</Label>
               <Input 
                 placeholder="Nombre consumidor" 
                 className="h-8 text-sm"
                 value={clienteNombre}
                 onChange={(e) => setClienteNombre(e.target.value)}
               />
             </div>
             <div className="space-y-1.5">
               <Label className="text-xs">Identificación / RNC</Label>
               <Input 
                 placeholder="Cédula/RNC" 
                 className="h-8 text-sm"
                 value={clienteCedula}
                 onChange={(e) => setClienteCedula(e.target.value)}
               />
             </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Método de Pago</Label>
            <Select value={metodoPago} onValueChange={(value) => {
              setMetodoPago(value);
              // Reset related fields
              if (value !== "TRANSFERENCIA") setCuentaBancariaId("");
              if (value !== "EFECTIVO") {
                setCajaId("");
              } else {
                // Re-apply the papelería caja default when switching back to EFECTIVO
                const cajaPapeleria = cajas.find((c) => c.nombre.toLowerCase().includes("papeleria"));
                if (cajaPapeleria) setCajaId(cajaPapeleria.id);
              }
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO"><div className="flex items-center gap-2"><Banknote className="h-4 w-4"/> Efectivo</div></SelectItem>
                <SelectItem value="TARJETA"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4"/> Tarjeta</div></SelectItem>
                <SelectItem value="TRANSFERENCIA"><div className="flex items-center gap-2"><Receipt className="h-4 w-4"/> Transferencia</div></SelectItem>
                <SelectItem value="CREDITO"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/> A Crédito</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {metodoPago === "EFECTIVO" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Caja de Papelería *</Label>
              <Select value={cajaId} onValueChange={setCajaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cajas.map((caja) => (
                    <SelectItem key={caja.id} value={caja.id}>
                      {caja.nombre} - RD$ {Number(caja.saldoActual).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {metodoPago === "TRANSFERENCIA" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Cuenta Bancaria *</Label>
              <Select value={cuentaBancariaId} onValueChange={setCuentaBancariaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentasBancarias.map((cuenta) => (
                    <SelectItem key={cuenta.id} value={cuenta.id}>
                      {cuenta.bancoNombre} - {cuenta.numeroCuenta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Descuento (RD$)</Label>
              <Input 
                type="number"
                placeholder="0.00"
                className="h-8 text-sm"
                value={descuento || ""}
                onChange={(e) => setDescuento(Math.max(0, Number(e.target.value) || 0))}
                min="0"
              />
            </div>
            {metodoPago === "EFECTIVO" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Monto Pagado (RD$)</Label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  className="h-8 text-sm"
                  value={montoPagado || ""}
                  onChange={(e) => setMontoPagado(Math.max(0, Number(e.target.value) || 0))}
                  min="0"
                />
              </div>
            )}
          </div>
        </div>

        <CardFooter className="flex-col gap-3 border-t p-4 pb-6 bg-slate-100 dark:bg-slate-950">
          <div className="w-full space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>RD$ {totales.subtotal.toFixed(2)}</span>
            </div>
            {totales.impuestos > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>ITBIS:</span>
                <span>RD$ {totales.impuestos.toFixed(2)}</span>
              </div>
            )}
            {totales.descuentoMonto > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento:</span>
                <span className="text-green-600 dark:text-green-400">-RD$ {totales.descuentoMonto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
              <span>Total a Pagar:</span>
              <span className="text-primary">RD$ {totales.total.toFixed(2)}</span>
            </div>
            {metodoPago === "EFECTIVO" && totales.montoPagado > 0 && (
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span className="text-yellow-600 dark:text-yellow-400">Cambio:</span>
                <span className="text-yellow-600 dark:text-yellow-400">RD$ {totales.cambio.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <Button 
            className="w-full h-12 text-md font-bold uppercase tracking-wider" 
            size="lg"
            onClick={handleProcesarVenta}
            disabled={cart.length === 0 || procesando || (metodoPago === "EFECTIVO" && !cajaId) || (metodoPago === "TRANSFERENCIA" && !cuentaBancariaId)}
          >
            {procesando ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
            ) : (
              "Completar Venta"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}