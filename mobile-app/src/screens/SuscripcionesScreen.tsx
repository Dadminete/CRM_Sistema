import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/services/http";
import { getSuscripciones } from "@/services/suscripciones";
import { SuscripcionItem } from "@/types/api";
import { appColors } from "@/theme";

export function SuscripcionesScreen() {
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Suscripciones</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente o contrato"
          placeholderTextColor={appColors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onRefresh}
          returnKeyType="search"
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={appColors.accent} />
          </View>
        ) : (
          <FlatList
            data={rowsVisible}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appColors.text} />}
            ListEmptyComponent={<Text style={styles.muted}>No hay suscripciones activas.</Text>}
            renderItem={({ item }) => {
              const planOrService = item.plan_nombre || item.servicio_nombre || "Sin plan";
              const cliente = `${item.cliente_nombre || ""} ${item.cliente_apellidos || ""}`.trim() || "Cliente";
              const contrato = item.numero_contrato || item.numeroContrato || "-";
              const precio = item.precio_mensual || item.precioMensual || "0";

              return (
                <View style={styles.item}>
                  <Text style={styles.itemTitle}>{cliente}</Text>
                  <Text style={styles.itemSub}>Contrato: {contrato}</Text>
                  <Text style={styles.itemSub}>Servicio: {planOrService}</Text>
                  <Text style={styles.itemAmount}>RD$ {precio}</Text>
                </View>
              );
            }}
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
  searchInput: {
    backgroundColor: appColors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    color: appColors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  item: {
    backgroundColor: appColors.card,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  itemTitle: { color: appColors.text, fontSize: 15, fontWeight: "700" },
  itemSub: { color: appColors.textMuted, fontSize: 12 },
  itemAmount: { color: appColors.success, fontSize: 14, fontWeight: "700", marginTop: 3 },
  error: { color: appColors.danger, fontSize: 12 },
});
