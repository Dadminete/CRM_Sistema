import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { appColors } from "@/theme";

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.name}>
            {user?.nombre || ""} {user?.apellido || ""}
          </Text>
          <Text style={styles.line}>Usuario: {user?.username || "-"}</Text>
          <Text style={styles.line}>Correo: {user?.email || "-"}</Text>
        </View>

        <Pressable style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appColors.bg },
  container: { flex: 1, padding: 16, gap: 14 },
  title: { color: appColors.text, fontSize: 24, fontWeight: "800" },
  card: {
    backgroundColor: appColors.card,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    padding: 12,
    gap: 5,
  },
  name: { color: appColors.text, fontWeight: "700", fontSize: 17 },
  line: { color: appColors.textMuted, fontSize: 13 },
  logoutButton: {
    backgroundColor: appColors.danger,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 6,
  },
  logoutText: { color: appColors.text, fontWeight: "700" },
});
