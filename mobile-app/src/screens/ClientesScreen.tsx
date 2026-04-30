import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Image,
} from "react-native";
import { Search, User, ChevronRight } from "lucide-react-native";

import { getClientes } from "@/services/clientes";
import { getApiErrorMessage } from "@/services/http";
import { ClienteListItem } from "@/types/api";
import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";
import { ClienteDetailScreen } from "@/screens/ClienteDetailScreen";
import { formatCurrency } from "@/utils/format";

export function ClientesScreen() {
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteListItem[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  async function loadClientes(query = search) {
    try {
      setError(null);
      const data = await getClientes(query);
      setClientes(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadClientes();
      setLoading(false);
    }

    init();
  }, []);

  const activeClientes = useMemo(() => clientes.filter((item) => item.estado === "activo"), [clientes]);

  const handleSearch = async () => {
    setRefreshing(true);
    await loadClientes(search);
    setRefreshing(false);
  };

  if (selectedClienteId) {
    return (
      <ClienteDetailScreen
        clienteId={selectedClienteId}
        onBack={() => setSelectedClienteId(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Clientes</Text>
        <Text style={[styles.count, { color: colors.primary }]}>{activeClientes.length} Activos</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nombre o código"
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando clientes...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleSearch} 
              tintColor={colors.primary} 
              colors={[colors.primary]}
            />
          }
          data={activeClientes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={48} color={colors.surfaceAlt} />
              <Text style={[styles.emptyText, { color: colors.textDim }]}>No hay clientes activos.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const categoryColors: Record<string, string> = {
              VIP: "#F59E0B",
              NUEVO: "#10B981",
              VIEJO: "#3B82F6",
              INACTIVO: "#F43F5E",
            };
            const categoryColor = item.categoriaCliente ? categoryColors[item.categoriaCliente] : colors.primary;

            return (
              <Pressable 
                style={({ pressed }) => [
                  styles.item,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { backgroundColor: colors.surfaceAlt }
                ]} 
                onPress={() => setSelectedClienteId(item.id)}
              >
                <View style={styles.itemMain}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.nombre} {item.apellidos}
                    </Text>
                    {item.categoriaCliente && (
                      <View style={[styles.miniBadge, { backgroundColor: categoryColor }]}>
                        <Text style={styles.miniBadgeText}>{item.categoriaCliente}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemCode, { color: colors.textDim }]}>#{item.codigoCliente} • {item.tipoCliente || "residencial"}</Text>
                </View>

                <View style={[styles.avatarContainer, { backgroundColor: theme === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(79, 70, 229, 0.05)" }, item.categoriaCliente === "VIP" && { borderColor: "#F59E0B", borderWidth: 2 }]}>
                  {item.fotoUrl ? (
                    <Image 
                      source={{ uri: item.fotoUrl.startsWith("http") ? item.fotoUrl : `${process.env.EXPO_PUBLIC_API_BASE_URL}${item.fotoUrl}` }} 
                      style={styles.avatarImg} 
                    />
                  ) : (
                    <User size={20} color={categoryColor} />
                  )}
                </View>
                
                <View style={styles.itemRight}>
                  <Text style={[styles.itemAmount, { color: colors.text }]}>
                    {formatCurrency(item.montoMensual)}
                  </Text>
                  <View style={[styles.activeBadge, { backgroundColor: theme === "dark" ? "rgba(16, 185, 129, 0.1)" : "rgba(5, 150, 105, 0.1)" }]}>
                    <Text style={[styles.activeText, { color: colors.success }]}>{item.estado}</Text>
                  </View>
                </View>
                
                <ChevronRight size={16} color={colors.textDim} style={styles.chevron} />
              </Pressable>
            );
          }}
        />
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: appSpacing.sm,
    borderWidth: 1,
    ...appShadows.soft,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: appSpacing.md,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  itemMain: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700" },
  itemCode: { 
    fontSize: 12, 
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  itemRight: { alignItems: "flex-end", marginRight: appSpacing.xs },
  itemAmount: { fontSize: 16, fontWeight: "800" },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  activeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  chevron: { marginLeft: 4 },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: { color: "#FFF", fontSize: 8, fontWeight: "900" },
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
  error: { fontSize: 13, textAlign: "center" },
});
