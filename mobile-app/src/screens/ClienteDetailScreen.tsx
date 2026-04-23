import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getClienteById } from "@/services/clientes";
import { getApiErrorMessage } from "@/services/http";
import { ClienteDetail } from "@/types/api";
import { appColors } from "@/theme";

type Tab = "info" | "suscripciones" | "historial";

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
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cliente, setCliente] = useState<ClienteDetail | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [suscripciones, setSuscripciones] = useState<SuscripcionEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getClienteById(clienteId);
        setCliente(data.client);
        setHistorial((data.history as HistorialEntry[]) || []);
        setSuscripciones((data.subscriptions as SuscripcionEntry[]) || []);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clienteId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {loading ? "Cargando..." : cliente ? `${cliente.nombre} ${cliente.apellidos}` : "Detalle"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={appColors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            <TabBtn label="Información" active={tab === "info"} onPress={() => setTab("info")} />
            <TabBtn
              label={`Suscripciones (${suscripciones.length})`}
              active={tab === "suscripciones"}
              onPress={() => setTab("suscripciones")}
            />
            <TabBtn
              label={`Historial (${historial.length})`}
              active={tab === "historial"}
              onPress={() => setTab("historial")}
            />
          </View>

          {tab === "info" && cliente && <InfoTab cliente={cliente} />}
          {tab === "suscripciones" && <SuscripcionesTab rows={suscripciones} />}
          {tab === "historial" && <HistorialTab rows={historial} />}
        </>
      )}
    </SafeAreaView>
  );
}

function InfoTab({ cliente }: { cliente: ClienteDetail }) {
  return (
    <ScrollView contentContainerStyle={styles.infoContent}>
      <InfoCard label="Nombre completo" value={`${cliente.nombre} ${cliente.apellidos}`} />
      <InfoCard label="Código de cliente" value={cliente.codigoCliente} />
      <InfoCard label="Teléfono" value={cliente.telefono || "-"} />
      <InfoCard label="Correo" value={cliente.email || "-"} />
      <InfoCard label="Estado" value={cliente.estado} highlight={cliente.estado === "activo"} />
      <InfoCard label="Ciudad" value={cliente.ciudad || "-"} />
      <InfoCard label="Provincia" value={cliente.provincia || "-"} />
      <InfoCard label="Dirección" value={cliente.direccion || "-"} />
      <InfoCard
        label="Monto Mensual"
        value={`RD$ ${Number(cliente.montoMensual || "0").toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
        accent
      />
    </ScrollView>
  );
}

function InfoCard({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          highlight && { color: appColors.success },
          accent && { color: appColors.accent, fontWeight: "700", fontSize: 16 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function SuscripcionesTab({ rows }: { rows: SuscripcionEntry[] }) {
  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No hay suscripciones registradas.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      renderItem={({ item }) => {
        const planOrService = item.plan_nombre || item.servicio_nombre || "Sin plan/servicio";
        const precio = item.precio_mensual || "0";
        const estadoColor = item.estado === "activo" ? appColors.success : appColors.textMuted;

        return (
          <View style={styles.suscrCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.suscrPlan}>{planOrService}</Text>
              {item.numero_contrato ? (
                <Text style={styles.suscrSub}>Contrato: {item.numero_contrato}</Text>
              ) : null}
              <Text style={[styles.suscrSub, { color: estadoColor }]}>Estado: {item.estado || "?"}</Text>
            </View>
            <Text style={styles.suscrPrecio}>
              RD${" "}
              {Number(precio).toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        );
      }}
    />
  );
}

function HistorialTab({ rows }: { rows: HistorialEntry[] }) {
  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No hay historial de cambios.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, idx) => item.id || String(idx)}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      renderItem={({ item }) => {
        const campo = item.tipoCambio || item.campo || "Cambio";
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString("es-DO") : "-";

        return (
          <View style={styles.histCard}>
            <View style={styles.histRow}>
              <Text style={styles.histCampo}>{campo}</Text>
              <Text style={styles.histFecha}>{fecha}</Text>
            </View>
            {item.valorAnterior != null || item.valorNuevo != null ? (
              <View style={styles.histChanges}>
                <Text style={styles.histOld}>Antes: {item.valorAnterior ?? "-"}</Text>
                <Text style={styles.histNew}>Ahora: {item.valorNuevo ?? "-"}</Text>
              </View>
            ) : null}
            {item.usuario ? <Text style={styles.histUser}>Por: {item.usuario}</Text> : null}
          </View>
        );
      }}
    />
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appColors.bg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: appColors.danger, textAlign: "center" },
  muted: { color: appColors.textMuted },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    gap: 10,
  },
  backButton: { paddingVertical: 4, paddingRight: 8 },
  backText: { color: appColors.accent, fontSize: 15 },
  headerTitle: { flex: 1, color: appColors.text, fontSize: 16, fontWeight: "700" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: appColors.accent },
  tabBtnText: { color: appColors.textMuted, fontSize: 12 },
  tabBtnTextActive: { color: appColors.accent, fontWeight: "700" },

  infoContent: { padding: 14, gap: 10 },
  infoCard: {
    backgroundColor: appColors.card,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoLabel: { color: appColors.textMuted, fontSize: 11, textTransform: "uppercase", marginBottom: 2 },
  infoValue: { color: appColors.text, fontSize: 14 },

  suscrCard: {
    backgroundColor: appColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  suscrPlan: { color: appColors.text, fontWeight: "600", fontSize: 14 },
  suscrSub: { color: appColors.textMuted, fontSize: 12, marginTop: 2 },
  suscrPrecio: { color: appColors.accent, fontWeight: "700", fontSize: 14 },

  histCard: {
    backgroundColor: appColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 12,
    gap: 6,
  },
  histRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  histCampo: { color: appColors.text, fontWeight: "600", fontSize: 13 },
  histFecha: { color: appColors.textMuted, fontSize: 11 },
  histChanges: { flexDirection: "row", gap: 12 },
  histOld: { color: appColors.danger, fontSize: 12 },
  histNew: { color: appColors.success, fontSize: 12 },
  histUser: { color: appColors.textMuted, fontSize: 11 },
});
