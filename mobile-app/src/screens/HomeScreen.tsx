import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/config/env";
import { appColors } from "@/theme";
import { ClientesScreen } from "@/screens/ClientesScreen";
import { SuscripcionesScreen } from "@/screens/SuscripcionesScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";

type TabKey = "dashboard" | "clientes" | "suscripciones" | "perfil";

export function HomeScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("dashboard");

  const greeting = useMemo(() => {
    const name = user?.nombre || user?.username || "Usuario";
    return `Hola, ${name}`;
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {tab === "dashboard" ? (
        <View style={styles.dashboardContainer}>
          <Text style={styles.title}>{greeting}</Text>
          <Text style={styles.subtitle}>App movil conectada al backend actual de Sistema de Gestion</Text>

          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Estado</Text>
            <Text style={styles.statValue}>Online</Text>
            <Text style={styles.statSub}>API: {API_BASE_URL}</Text>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Modulo</Text>
              <Text style={styles.kpiValue}>Clientes</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Modulo</Text>
              <Text style={styles.kpiValue}>Suscripciones</Text>
            </View>
          </View>
        </View>
      ) : null}

      {tab === "clientes" ? <ClientesScreen /> : null}
      {tab === "suscripciones" ? <SuscripcionesScreen /> : null}
      {tab === "perfil" ? <ProfileScreen /> : null}

      <View style={styles.navBar}>
        <NavButton active={tab === "dashboard"} label="Inicio" onPress={() => setTab("dashboard")} />
        <NavButton active={tab === "clientes"} label="Clientes" onPress={() => setTab("clientes")} />
        <NavButton active={tab === "suscripciones"} label="Suscrip." onPress={() => setTab("suscripciones")} />
        <NavButton active={tab === "perfil"} label="Perfil" onPress={() => setTab("perfil")} />
      </View>
    </SafeAreaView>
  );
}

function NavButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.navButton, active && styles.navButtonActive]} onPress={onPress}>
      <Text style={[styles.navButtonText, active && styles.navButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.bg,
  },
  dashboardContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    color: appColors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: appColors.textMuted,
    lineHeight: 20,
  },
  statCard: {
    backgroundColor: appColors.card,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statTitle: {
    color: appColors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    color: appColors.success,
    fontSize: 22,
    fontWeight: "800",
  },
  statSub: {
    color: appColors.text,
    fontSize: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: appColors.cardAlt,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  kpiLabel: {
    color: appColors.textMuted,
    fontSize: 12,
  },
  kpiValue: {
    color: appColors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  navBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    backgroundColor: appColors.card,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
  },
  navButtonActive: {
    backgroundColor: appColors.accent,
  },
  navButtonText: {
    color: appColors.textMuted,
    fontWeight: "600",
    fontSize: 12,
  },
  navButtonTextActive: {
    color: appColors.text,
    fontWeight: "700",
  },
});
