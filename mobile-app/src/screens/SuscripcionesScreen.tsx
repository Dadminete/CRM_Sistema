import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Search, CreditCard, Hash, Briefcase } from "lucide-react-native";

import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";
import { getApiErrorMessage } from "@/services/http";
import { getSuscripciones } from "@/services/suscripciones";
import { SuscripcionItem } from "@/types/api";
import { formatCurrency } from "@/utils/format";

export function SuscripcionesScreen() {
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SuscripcionItem[]>([]);

  async function loadData(query = search) {
    try {
      setError(null);
      const data = await getSuscripciones(query);
      setRows(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }

    init();
  }, []);

  const rowsVisible = useMemo(() => rows.filter((row) => row.estado === "activo"), [rows]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(search);
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Suscripciones</Text>
        <Text style={[styles.count, { color: colors.secondary }]}>{rowsVisible.length} Activas</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar cliente o contrato"
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onRefresh}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.secondary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando suscripciones...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={rowsVisible}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.secondary} 
              colors={[colors.secondary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CreditCard size={48} color={colors.surfaceAlt} />
              <Text style={[styles.emptyText, { color: colors.textDim }]}>No hay suscripciones activas.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const planOrService = item.plan_nombre || item.servicio_nombre || "Sin plan";
            const cliente = `${item.cliente_nombre || ""} ${item.cliente_apellidos || ""}`.trim() || "Cliente";
            const contrato = item.numero_contrato || item.numeroContrato || "-";
            const precio = item.precio_mensual || item.precioMensual || "0";

            return (
              <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{cliente}</Text>
                    <View style={styles.contractRow}>
                      <Hash size={12} color={colors.textDim} />
                      <Text style={[styles.itemSub, { color: colors.textDim }]}>{contrato}</Text>
                    </View>
                  </View>
                  <Text style={[styles.itemAmount, { color: colors.text }]}>{formatCurrency(precio)}</Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                
                <View style={styles.itemFooter}>
                  <View style={styles.serviceRow}>
                    <Briefcase size={14} color={colors.secondary} />
                    <Text style={[styles.serviceText, { color: colors.textMuted }]}>{planOrService}</Text>
                  </View>
                  <View style={[styles.activeBadge, { backgroundColor: theme === "dark" ? "rgba(16, 185, 129, 0.1)" : "rgba(5, 150, 105, 0.1)" }]}>
                    <Text style={[styles.activeText, { color: colors.success }]}>Activo</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: appSpacing.lg,
    paddingTop: appSpacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: appSpacing.md,
  },
  title: { fontSize: 28, fontWeight: "900" },
  count: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  searchContainer: {
    paddingHorizontal: appSpacing.lg,
    marginBottom: appSpacing.md,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: appRadius.md,
    borderWidth: 1,
    paddingHorizontal: appSpacing.md,
    height: 48,
  },
  searchIcon: { marginRight: appSpacing.sm },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: {
    paddingHorizontal: appSpacing.lg,
    paddingBottom: appSpacing.xl,
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    gap: appSpacing.md,
  },
  loadingText: { fontSize: 14 },
  item: {
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    marginBottom: appSpacing.sm,
    borderWidth: 1,
    ...appShadows.soft,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  clientInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "700" },
  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  itemSub: { 
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  itemAmount: { fontSize: 18, fontWeight: "800" },
  divider: {
    height: 1,
    marginVertical: appSpacing.md,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceText: { fontSize: 13, fontWeight: "500" },
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
  emptyContainer: {
    paddingTop: appSpacing.xxl,
    alignItems: "center",
    gap: appSpacing.md,
  },
  emptyText: { fontSize: 15, fontWeight: "500" },
  errorContainer: {
    padding: appSpacing.md,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    margin: appSpacing.lg,
    borderRadius: appRadius.md,
  },
  errorText: { fontSize: 13, textAlign: "center" },
});
