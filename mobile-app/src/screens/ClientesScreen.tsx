import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getClientes } from "@/services/clientes";
import { getApiErrorMessage } from "@/services/http";
import { ClienteListItem } from "@/types/api";
import { appColors } from "@/theme";
import { ClienteDetailScreen } from "@/screens/ClienteDetailScreen";

export function ClientesScreen() {
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Clientes</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o codigo"
            placeholderTextColor={appColors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Buscar</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={appColors.accent} />
          </View>
        ) : (
          <FlatList
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleSearch} tintColor={appColors.text} />}
            data={activeClientes}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.muted}>No hay clientes activos.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.item} onPress={() => setSelectedClienteId(item.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {item.nombre} {item.apellidos}
                  </Text>
                  <Text style={styles.itemSub}>Codigo: {item.codigoCliente}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.itemAmount}>
                    RD${" "}
                    {Number(item.montoMensual || "0").toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.itemSub}>{item.estado}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appColors.bg },
  container: { flex: 1, padding: 16, gap: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: appColors.text, fontSize: 24, fontWeight: "800" },
  muted: { color: appColors.textMuted, fontSize: 13 },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: appColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    color: appColors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchButton: {
    backgroundColor: appColors.accent,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  searchButtonText: { color: appColors.text, fontWeight: "700" },
  item: {
    backgroundColor: appColors.card,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemName: { color: appColors.text, fontSize: 15, fontWeight: "700" },
  itemSub: { color: appColors.textMuted, fontSize: 12, marginTop: 2 },
  itemAmount: { color: appColors.success, fontSize: 14, fontWeight: "700" },
  error: { color: appColors.danger, fontSize: 12 },
});
