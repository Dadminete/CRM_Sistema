import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
} from "react-native";
import { ChevronLeft, Info, CreditCard, History, User, MapPin, Phone, Mail, Hash, LayoutDashboard } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { getClienteById } from "@/services/clientes";
import { getApiErrorMessage } from "@/services/http";
import { ClienteDetail } from "@/types/api";
import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";
import { formatCurrency } from "@/utils/format";

type Tab = "info" | "suscripciones" | "facturas" | "historial";

interface Props {
  clienteId: string;
  onBack: () => void;
}

interface HistorialEntry {
  id?: string;
  campo?: string;
  tipoCambio?: string;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
  fecha?: string;
  usuario?: string;
}

interface SuscripcionEntry {
  id: string;
  plan_nombre?: string;
  servicio_nombre?: string;
  precio_mensual?: string;
  estado?: string;
  numero_contrato?: string;
}

export function ClienteDetailScreen({ clienteId, onBack }: Props) {
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cliente, setCliente] = useState<ClienteDetail | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [suscripciones, setSuscripciones] = useState<SuscripcionEntry[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getClienteById(clienteId);
        setCliente(data.client);
        setHistorial((data.history as HistorialEntry[]) || []);
        setSuscripciones((data.subscriptions as SuscripcionEntry[]) || []);
        setInvoices(data.invoices || []);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clienteId]);

  return (
    <View style={[styles.baseContainer, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Perfil del Cliente
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Top Profile Card */}
            <View style={styles.profileSummary}>
              <View style={[
                styles.avatarLarge,
                { backgroundColor: colors.surface, borderColor: colors.border },
                cliente?.categoriaCliente === "VIP" && { borderColor: "#F59E0B", borderWidth: 3 }
              ]}>
                {cliente?.fotoUrl ? (
                  <Image 
                    source={{ uri: cliente.fotoUrl.startsWith("http") ? cliente.fotoUrl : `${process.env.EXPO_PUBLIC_API_BASE_URL}${cliente.fotoUrl}` }} 
                    style={styles.avatarImg} 
                  />
                ) : (
                  <User size={32} color={cliente?.categoriaCliente === "VIP" ? "#F59E0B" : colors.primary} />
                )}
              </View>
              <Text style={[styles.profileName, { color: colors.text }]}>{cliente?.nombre} {cliente?.apellidos}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[styles.profileBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.profileBadgeText, { color: colors.primary }]}>#{cliente?.codigoCliente}</Text>
                </View>
                {cliente?.categoriaCliente && (
                  <View style={[styles.profileBadge, { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.3)" }]}>
                    <Text style={[styles.profileBadgeText, { color: "#F59E0B" }]}>{cliente?.categoriaCliente}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Modern Tab Bar */}
            <View style={styles.tabContainer}>
              <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TabBtn 
                  icon={<Info size={16} color={tab === "info" ? "#FFF" : colors.textDim} />}
                  label="Info" 
                  active={tab === "info"} 
                  onPress={() => setTab("info")} 
                  colors={colors}
                />
                <TabBtn 
                  icon={<CreditCard size={16} color={tab === "suscripciones" ? "#FFF" : colors.textDim} />}
                  label="Planes" 
                  active={tab === "suscripciones"} 
                  onPress={() => setTab("suscripciones")} 
                  colors={colors}
                />
                <TabBtn 
                  icon={<History size={16} color={tab === "facturas" ? "#FFF" : colors.textDim} />}
                  label="Facturas" 
                  active={tab === "facturas"} 
                  onPress={() => setTab("facturas")} 
                  colors={colors}
                />
                <TabBtn 
                  icon={<History size={16} color={tab === "historial" ? "#FFF" : colors.textDim} />}
                  label="Cambios" 
                  active={tab === "historial"} 
                  onPress={() => setTab("historial")} 
                  colors={colors}
                />
              </View>
            </View>

            <View style={styles.tabContent}>
              {tab === "info" && cliente && <InfoTab cliente={cliente} colors={colors} />}
              {tab === "suscripciones" && <SuscripcionesTab rows={suscripciones} colors={colors} />}
              {tab === "facturas" && <FacturasTab rows={invoices} colors={colors} />}
              {tab === "historial" && <HistorialTab rows={historial} colors={colors} />}
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

function InfoTab({ cliente, colors }: { cliente: ClienteDetail; colors: any }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Datos Personales</Text>
        <DetailItem icon={<User size={16} color={colors.primary} />} label="Nombre Completo" value={`${cliente.nombre} ${cliente.apellidos}`} colors={colors} />
        <DetailItem icon={<CreditCard size={16} color={colors.primary} />} label="Cédula" value={cliente.cedula || "No registrada"} colors={colors} />
        <DetailItem icon={<LayoutDashboard size={16} color={colors.primary} />} label="Tipo Cliente" value={cliente.tipoCliente || "Residencial"} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Contacto</Text>
        <DetailItem icon={<Phone size={16} color={colors.primary} />} label="Teléfono" value={cliente.telefono || "-"} colors={colors} />
        <DetailItem icon={<Phone size={16} color={colors.primary} />} label="Celular" value={cliente.telefonoSecundario || "-"} colors={colors} />
        <DetailItem icon={<Mail size={16} color={colors.primary} />} label="Correo" value={cliente.email || "-"} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Ubicación</Text>
        <DetailItem icon={<MapPin size={16} color={colors.accent} />} label="Ciudad/Prov" value={`${cliente.ciudad || ""}, ${cliente.provincia || ""}`} colors={colors} />
        <DetailItem icon={<MapPin size={16} color={colors.accent} />} label="Dirección" value={cliente.direccion || "-"} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Finanzas</Text>
        <LinearGradient
          colors={["rgba(99, 102, 241, 0.1)", "rgba(99, 102, 241, 0.05)"]}
          style={[styles.amountCard, { borderColor: "rgba(99, 102, 241, 0.2)" }]}
        >
          <Text style={[styles.amountLabel, { color: colors.primary }]}>Monto Mensual</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            {formatCurrency(cliente.montoMensual)}
          </Text>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

function DetailItem({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailItem}>
      <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>{icon}</View>
      <View>
        <Text style={[styles.detailLabel, { color: colors.textDim }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function SuscripcionesTab({ rows, colors }: { rows: SuscripcionEntry[]; colors: any }) {
  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <CreditCard size={48} color={colors.surfaceAlt} />
        <Text style={[styles.muted, { color: colors.textDim }]}>No hay suscripciones registradas.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listPadding}
      renderItem={({ item }) => {
        const planOrService = item.plan_nombre || item.servicio_nombre || "Sin plan";
        const precio = item.precio_mensual || "0";
        return (
          <View style={[styles.modernCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{planOrService}</Text>
              <View style={[styles.activeBadge, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                <Text style={[styles.activeText, { color: colors.success }]}>Activo</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Hash size={12} color={colors.textDim} />
                <Text style={[styles.cardSub, { color: colors.textDim }]}>Contrato: {item.numero_contrato || "-"}</Text>
              </View>
              <Text style={[styles.cardPrice, { color: colors.text }]}>{formatCurrency(precio)}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

function FacturasTab({ rows, colors }: { rows: any[]; colors: any }) {
  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <CreditCard size={48} color={colors.surfaceAlt} />
        <Text style={[styles.muted, { color: colors.textDim }]}>No hay facturas registradas.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listPadding}
      renderItem={({ item }) => {
        const s = item.estado.toLowerCase();
        const isPaid = s === "pagada" || s === "pagado";
        const isVoid = s === "anulada" || s === "cancelada" || s === "anulado";
        
        return (
          <View style={[styles.modernCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.numeroFactura}</Text>
                <Text style={[styles.cardSub, { color: colors.textDim }]}>{new Date(item.fechaFactura).toLocaleDateString("es-DO")}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(s, colors) + "15" }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(s, colors) }]}>{item.estado}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View>
                <Text style={[styles.detailLabel, { color: colors.textDim }]}>Pendiente</Text>
                <Text style={[styles.cardPrice, { color: isPaid ? colors.success : colors.warning }]}>
                  {formatCurrency(item.montoPendiente || 0)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.detailLabel, { color: colors.textDim }]}>Total Factura</Text>
                <Text style={[styles.cardPrice, { color: colors.text, fontSize: 14 }]}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            </View>
          </View>
        );
      }}
    />
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

function HistorialTab({ rows, colors }: { rows: HistorialEntry[]; colors: any }) {
  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <History size={48} color={colors.surfaceAlt} />
        <Text style={[styles.muted, { color: colors.textDim }]}>Sin historial de cambios.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, idx) => item.id || String(idx)}
      contentContainerStyle={styles.listPadding}
      renderItem={({ item }) => {
        const campo = item.tipoCambio || item.campo || "Cambio";
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString("es-DO") : "-";

        return (
          <View style={[styles.histItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.histHeader}>
              <Text style={[styles.histTitle, { color: colors.text }]}>{campo}</Text>
              <Text style={[styles.histDate, { color: colors.textDim }]}>{fecha}</Text>
            </View>
            {item.valorAnterior != null || item.valorNuevo != null ? (
              <View style={styles.histDiff}>
                <View style={[styles.diffBox, { backgroundColor: "rgba(244, 63, 94, 0.05)" }]}>
                  <Text style={[styles.diffLabel, { color: colors.textDim }]}>Antes</Text>
                  <Text style={[styles.diffValue, { color: colors.danger }]}>{item.valorAnterior ?? "-"}</Text>
                </View>
                <View style={[styles.diffBox, { backgroundColor: "rgba(16, 185, 129, 0.05)" }]}>
                  <Text style={[styles.diffLabel, { color: colors.textDim }]}>Ahora</Text>
                  <Text style={[styles.diffValue, { color: colors.success }]}>{item.valorNuevo ?? "-"}</Text>
                </View>
              </View>
            ) : null}
            <Text style={[styles.histUser, { color: colors.textDim }]}>Modificado por {item.usuario || "Sistema"}</Text>
          </View>
        );
      }}
    />
  );
}

function TabBtn({ icon, label, active, onPress, colors }: { icon: any; label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <View style={[styles.tabBtnContent, active && { backgroundColor: colors.primary }]}>
        {icon}
        <Text style={[styles.tabBtnText, { color: colors.textDim }, active && { color: "#FFF", fontWeight: "700" }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseContainer: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { textAlign: "center" },
  muted: { fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: appSpacing.md,
    height: 56,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },

  profileSummary: {
    alignItems: "center",
    paddingVertical: appSpacing.lg,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: appSpacing.md,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "900",
  },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: appRadius.full,
    marginTop: 6,
    borderWidth: 1,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  tabContainer: {
    paddingHorizontal: appSpacing.lg,
    marginBottom: appSpacing.md,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: appRadius.lg,
    padding: 4,
    borderWidth: 1,
  },
  tabBtn: { flex: 1 },
  tabBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: appRadius.md,
  },
  tabBtnText: { fontSize: 12, fontWeight: "600" },

  tabContent: { flex: 1 },
  scrollContent: { padding: appSpacing.lg, gap: appSpacing.lg },
  section: { gap: appSpacing.md },
  sectionLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  
  detailItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  detailLabel: { fontSize: 11, marginBottom: 1 },
  detailValue: { fontSize: 15, fontWeight: "600" },

  amountCard: {
    padding: appSpacing.lg,
    borderRadius: appRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  amountLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  amountValue: { fontSize: 32, fontWeight: "900", marginTop: 4 },

  listPadding: { padding: appSpacing.lg, gap: appSpacing.md },
  modernCard: {
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    borderWidth: 1,
    ...appShadows.soft,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: appSpacing.sm },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardSub: { fontSize: 12 },
  cardPrice: { fontSize: 18, fontWeight: "800" },

  histItem: {
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    borderWidth: 1,
    gap: appSpacing.md,
  },
  histHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  histTitle: { fontSize: 14, fontWeight: "700" },
  histDate: { fontSize: 11 },
  histDiff: { flexDirection: "row", gap: appSpacing.sm },
  diffBox: { flex: 1, padding: 8, borderRadius: 8 },
  diffLabel: { fontSize: 9, textTransform: "uppercase", marginBottom: 2 },
  diffValue: { fontSize: 13, fontWeight: "600" },
  histUser: { fontSize: 11, fontStyle: "italic" },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
