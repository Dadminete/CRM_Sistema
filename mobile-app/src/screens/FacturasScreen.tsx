import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";
import { getApiErrorMessage } from "@/services/http";
import { getFacturasDashboard, getFacturasList, pagarFactura, PaymentPayload } from "@/services/facturas";
import { getLookupData, LookupData } from "@/services/dashboard";
import { FacturaListItem } from "@/types/api";
import { formatCurrency } from "@/utils/format";
import { 
  Filter, 
  Search, 
  ChevronRight, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  X
} from "lucide-react-native";
import { Modal, TextInput } from "react-native";

export function FacturasScreen() {
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<FacturaListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Payment State
  const [selectedInvoice, setSelectedInvoice] = useState<FacturaListItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [selectedCajaId, setSelectedCajaId] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  async function loadData() {
    try {
      const [dashboard, lookup] = await Promise.all([
        getFacturasDashboard(),
        getLookupData()
      ]);
      setStats(dashboard.resumen);
      setLookupData(lookup);
      
      // Set defaults
      if (lookup.cajas.length > 0) setSelectedCajaId(lookup.cajas[0].id);
      if (lookup.cuentasBancarias.length > 0) setSelectedBankAccountId(lookup.cuentasBancarias[0].id);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadData(), fetchInvoices()]);
      setLoading(false);
    }
    init();
  }, [status]);

  const fetchInvoices = async () => {
    try {
      const data = await getFacturasList(search, status);
      setInvoices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    
    try {
      setPaymentLoading(true);
      setPaymentError(null);
      
      await pagarFactura({
        facturaId: selectedInvoice.id,
        clienteId: selectedInvoice.clienteId,
        monto: parseFloat(paymentAmount),
        metodoPago: paymentMethod,
        cajaId: paymentMethod === "efectivo" ? selectedCajaId : undefined,
        cuentaBancariaId: paymentMethod === "transferencia" ? selectedBankAccountId : undefined,
        observaciones: "Pago desde App Móvil"
      });
      
      setSelectedInvoice(null);
      setPaymentAmount("");
      await Promise.all([loadData(), fetchInvoices()]);
      alert("Pago registrado exitosamente");
    } catch (err: any) {
      setPaymentError(err.message || "Error al procesar el pago");
    } finally {
      setPaymentLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), fetchInvoices()]);
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Facturas</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Dashboard Financiero</Text>
        </View>
        <View style={{ flex: 1 }} />
      </View>

      {/* Filters Section */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textDim} />
          <TextInput 
            placeholder="Buscar factura..." 
            placeholderTextColor={colors.textDim}
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchInvoices}
          />
          <Pressable onPress={() => setShowFilters(!showFilters)} style={[styles.filterBtn, showFilters && { backgroundColor: colors.primary }]}>
            <Filter size={18} color={showFilters ? "#FFF" : colors.textDim} />
          </Pressable>
        </View>
        
        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilters}>
            {["", "pendiente", "parcial", "adelantada", "pagada", "anulada"].map((s) => (
              <Pressable 
                key={s} 
                onPress={() => setStatus(s)}
                style={[
                  styles.filterChip, 
                  { borderColor: colors.border },
                  status === s && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Text style={[styles.filterChipText, { color: status === s ? "#FFF" : colors.textMuted }]}>
                  {s === "" ? "Todas" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Stats Cards Row 1 */}
        <View style={styles.cardGrid}>
          <StatCard
            label="Facturado (Mes)"
            value={formatCurrency(stats?.facturadoMesActual)}
            icon={<DollarSign size={16} color={colors.primary} />}
            colors={colors}
          />
          <StatCard
            label="Cobrado (Mes)"
            value={formatCurrency(stats?.cobradoMesActual)}
            icon={<CheckCircle size={16} color={colors.success} />}
            colors={colors}
          />
        </View>

        {/* Stats Cards Row 2 */}
        <View style={styles.cardGrid}>
          <StatCard
            label="Pendiente Global"
            value={formatCurrency(stats?.montoPendienteGlobal)}
            icon={<Clock size={16} color={colors.warning} />}
            colors={colors}
          />
          <StatCard
            label="Adelantado"
            value={formatCurrency(stats?.montoAdelantadoPendiente)}
            icon={<TrendingUp size={16} color={colors.secondary} />}
            colors={colors}
          />
        </View>

        {/* Trend Chart Section */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: appSpacing.lg }}>
             <View>
                <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Tendencia de Cobros (Mes)</Text>
                <Text style={{ fontSize: 10, color: colors.textDim }}>Toque una barra para ver detalles</Text>
             </View>
             <TrendingUp size={14} color={colors.success} />
           </View>
           
           <View style={styles.barChartContainer}>
             {stats?.tendenciaCobros && stats.tendenciaCobros.length > 0 ? (
               stats.tendenciaCobros.slice(-7).map((item: any, index: number) => {
                 const maxAmount = Math.max(...stats.tendenciaCobros.map((t: any) => t.monto), 1);
                 const heightPercent = (item.monto / maxAmount) * 100;
                 const day = item.dia.split("-")[2];
                 
                 return (
                   <Pressable 
                     key={index} 
                     style={styles.barGroup}
                     onPress={() => {
                       const formatted = formatCurrency(item.monto);
                       const dateStr = new Date(item.dia).toLocaleDateString("es-DO", { day: "numeric", month: "long" });
                       alert(`${dateStr}\nCobrado: ${formatted}`);
                     }}
                   >
                     <View style={[styles.barBase, { backgroundColor: colors.surfaceAlt, height: 80 }]}>
                       <View style={[styles.barFill, { 
                         backgroundColor: colors.success, 
                         height: `${heightPercent}%`,
                         borderTopLeftRadius: 4,
                         borderTopRightRadius: 4,
                       }]} />
                     </View>
                     <Text style={[styles.barLabel, { color: colors.textDim }]}>{day}</Text>
                   </Pressable>
                 );
               })
             ) : (
               <View style={{ flex: 1, justifyContent: "center", alignItems: "center", height: 100 }}>
                 <Text style={{ color: colors.textDim, fontSize: 12, fontStyle: "italic" }}>Sin cobros registrados este mes</Text>
               </View>
             )}
           </View>
        </View>

        {/* Recent Invoices Table */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableTitle, { color: colors.text }]}>Listado de Facturas</Text>
            <ChevronRight size={18} color={colors.textDim} />
          </View>

          <View style={styles.tableLabels}>
            <View style={{ flex: 2 }}><Text style={[styles.labelCell, { color: colors.textDim }]}>CLIENTE</Text></View>
            <View style={{ flex: 1, alignItems: "center" }}><Text style={[styles.labelCell, { color: colors.textDim }]}>ESTADO</Text></View>
            <View style={{ flex: 1.5, alignItems: "flex-end" }}><Text style={[styles.labelCell, { color: colors.textDim }]}>TOTAL</Text></View>
          </View>

          {invoices.map((item) => (
            <View key={item.id} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.cellText, { color: colors.text, fontWeight: "600" }]} numberOfLines={1}>{item.clienteNombre}</Text>
                <Text style={[styles.cellSub, { color: colors.textDim }]}>{item.numeroFactura}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.estado, colors) + "15" }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(item.estado, colors) }]}>{item.estado}</Text>
                </View>
              </View>
              <View style={{ flex: 1.5, alignItems: "flex-end" }}>
                <Text style={[styles.cellText, { color: colors.text, fontWeight: "800" }]}>
                  {formatCurrency(item.total)}
                </Text>
                {(() => {
                  const s = item.estado.toLowerCase();
                  const isPaid = s === "pagada" || s === "pagado";
                  const isVoid = s === "anulada" || s === "cancelada" || s === "anulado";
                  
                  if (!isPaid && !isVoid) {
                    return (
                      <Pressable 
                        onPress={() => {
                          setSelectedInvoice(item);
                          setPaymentAmount(String(item.pendiente || item.total));
                        }}
                        style={[styles.payBtn, { backgroundColor: colors.success }]}
                      >
                        <Text style={styles.payBtnText}>Pagar</Text>
                      </Pressable>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>
          ))}
          
          {invoices.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textDim }]}>No hay facturas que coincidan</Text>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={!!selectedInvoice}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar Pago</Text>
              <Pressable onPress={() => setSelectedInvoice(null)}>
                <X size={24} color={colors.textDim} />
              </Pressable>
            </View>
            
            {selectedInvoice && (
              <View style={styles.modalBody}>
                <Text style={[styles.modalInfo, { color: colors.textMuted }]}>
                  Factura: {selectedInvoice.numeroFactura}
                </Text>
                <Text style={[styles.modalInfo, { color: colors.textMuted, marginBottom: 20 }]}>
                  Pendiente: {formatCurrency(selectedInvoice.pendiente || selectedInvoice.total)}
                </Text>
                
                <Text style={[styles.inputLabel, { color: colors.text }]}>Monto a Pagar</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                />
                
                <Text style={[styles.inputLabel, { color: colors.text }]}>Método de Pago</Text>
                <View style={styles.methodRow}>
                  <Pressable 
                    onPress={() => setPaymentMethod("efectivo")}
                    style={[styles.methodBtn, { borderColor: colors.border }, paymentMethod === "efectivo" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.methodText, { color: paymentMethod === "efectivo" ? "#FFF" : colors.textMuted }]}>Efectivo</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setPaymentMethod("transferencia")}
                    style={[styles.methodBtn, { borderColor: colors.border }, paymentMethod === "transferencia" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.methodText, { color: paymentMethod === "transferencia" ? "#FFF" : colors.textMuted }]}>Banco</Text>
                  </Pressable>
                </View>

                {paymentMethod === "efectivo" && lookupData?.cajas && (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Seleccionar Caja</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountSelectors}>
                      {lookupData.cajas.map((caja) => (
                        <Pressable 
                          key={caja.id} 
                          onPress={() => setSelectedCajaId(caja.id)}
                          style={[
                            styles.accountChip, 
                            { borderColor: colors.border },
                            selectedCajaId === caja.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                        >
                          <Text style={[styles.accountChipText, { color: selectedCajaId === caja.id ? "#FFF" : colors.textMuted }]}>
                            {caja.nombre}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}

                {paymentMethod === "transferencia" && lookupData?.cuentasBancarias && (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Seleccionar Cuenta Bancaria</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountSelectors}>
                      {lookupData.cuentasBancarias.map((cuenta) => (
                        <Pressable 
                          key={cuenta.id} 
                          onPress={() => setSelectedBankAccountId(cuenta.id)}
                          style={[
                            styles.accountChip, 
                            { borderColor: colors.border },
                            selectedBankAccountId === cuenta.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                        >
                          <Text style={[styles.accountChipText, { color: selectedBankAccountId === cuenta.id ? "#FFF" : colors.textMuted }]}>
                            {cuenta.bankNombre} - {cuenta.numeroCuenta.slice(-4)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}
                
                {paymentError && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color={colors.danger} />
                    <Text style={[styles.errorText, { color: colors.danger }]}>{paymentError}</Text>
                  </View>
                )}
                
                <Pressable 
                  onPress={handlePayment} 
                  disabled={paymentLoading}
                  style={[styles.submitBtn, { backgroundColor: colors.success }, paymentLoading && { opacity: 0.7 }]}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirmar Pago</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value, icon, colors }: { label: string; value: string; icon: any; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statLabel, { color: colors.textDim }]} numberOfLines={1}>
          {label}
        </Text>
        <Text 
          style={[styles.statValue, { color: colors.text }]} 
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function getStatusColor(status: string, colors: any) {
  const s = status.toLowerCase();
  if (s.includes("pagada") || s.includes("pagado")) return colors.success;
  if (s.includes("pendiente")) return colors.warning;
  if (s.includes("anulada") || s.includes("cancelada")) return colors.danger;
  if (s.includes("parcial")) return colors.accent;
  if (s.includes("adelantado") || s.includes("adelantada")) return colors.info;
  return colors.primary;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: appSpacing.lg,
    paddingTop: appSpacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: appSpacing.md,
  },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  scrollContent: { padding: appSpacing.lg, gap: appSpacing.lg },
  cardGrid: { flexDirection: "row", gap: appSpacing.md },
  statCard: {
    flex: 1,
    padding: appSpacing.md,
    borderRadius: appRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...appShadows.soft,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  statValue: { 
    fontSize: 14, 
    fontWeight: "900", 
    marginTop: 1,
    flexShrink: 1,
  },
  
  chartCard: {
    padding: appSpacing.lg,
    borderRadius: appRadius.xl,
    borderWidth: 1,
    marginBottom: appSpacing.lg,
    ...appShadows.soft,
  },
  chartTitle: { fontSize: 14, fontWeight: "700", marginBottom: appSpacing.lg },
  barChartContainer: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    alignItems: "flex-end",
    height: 120,
    paddingTop: 10,
  },
  barGroup: { alignItems: "center", gap: 8 },
  barBase: { width: 40, height: 80, borderRadius: 8, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 8 },
  barLabel: { fontSize: 10, fontWeight: "700" },

  filterSection: {
    paddingHorizontal: appSpacing.lg,
    gap: appSpacing.sm,
    marginBottom: appSpacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: appSpacing.md,
    borderRadius: appRadius.lg,
    borderWidth: 1,
    height: 48,
    gap: 10,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statusFilters: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  payBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  payBtnText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  tableContainer: {
    borderRadius: appRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...appShadows.soft,
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: appSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tableTitle: { fontSize: 16, fontWeight: "800" },
  tableLabels: {
    flexDirection: "row",
    paddingHorizontal: appSpacing.md,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  labelCell: { fontSize: 10, fontWeight: "800" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: appSpacing.md,
    borderBottomWidth: 1,
  },
  cellText: { fontSize: 13 },
  cellSub: { fontSize: 10, marginTop: 2 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  emptyText: { textAlign: "center", padding: appSpacing.xxl, fontStyle: "italic" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: appSpacing.xl,
  },
  modalContent: {
    borderRadius: appRadius.xl,
    padding: appSpacing.lg,
    ...appShadows.soft,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: appSpacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  modalBody: {
    gap: 8,
  },
  modalInfo: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: appRadius.md,
    padding: appSpacing.md,
    fontSize: 18,
    fontWeight: "700",
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: appRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  methodText: {
    fontSize: 14,
    fontWeight: "700",
  },
  accountSelectors: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingBottom: 4,
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: appRadius.md,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  errorBanner: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#F43F5E",
    padding: 10,
    borderRadius: 8,
  },
  errorText: { color: "#FFF", fontSize: 12, textAlign: "center" },
});
