import React from "react";
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View, Platform, Image, ScrollView } from "react-native";
import { LogOut, User, Mail, Shield, ChevronRight, Sun, Moon } from "lucide-react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  return (
    <View style={[styles.baseContainer, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.text }]}>Mi Perfil</Text>
          
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.avatarWrapper, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <User size={32} color={colors.primary} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.text }]}>
                {user?.nombre || "Usuario"} {user?.apellido || ""}
              </Text>
              <Text style={[styles.username, { color: colors.primary }]}>@{user?.username || "usuario"}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Preferencias</Text>
            <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={toggleTheme} style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: colors.surfaceAlt }]}>
                  {theme === "dark" ? <Sun size={18} color={colors.warning} /> : <Moon size={18} color={colors.primary} />}
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuLabel, { color: colors.textDim }]}>Tema Visual</Text>
                  <Text style={[styles.menuValue, { color: colors.text }]}>
                    Modo {theme === "dark" ? "Oscuro" : "Claro"}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.border} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Cuenta</Text>
            
            <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MenuItem 
                icon={<Mail size={18} color={colors.textDim} />} 
                label="Email" 
                value={user?.email || "-"} 
                colors={colors}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <MenuItem 
                icon={<Shield size={18} color={colors.textDim} />} 
                label="Rol" 
                value="Administrador" 
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable 
              style={({ pressed }) => [
                styles.logoutButton,
                { backgroundColor: colors.danger },
                pressed && styles.logoutButtonPressed
              ]} 
              onPress={signOut}
            >
              <LogOut size={20} color="#FFF" style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </Pressable>
            
            <Text style={[styles.version, { color: colors.textDim }]}>v3.0.1 Quantum Edition</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MenuItem({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={styles.menuItem}>
      <View style={[styles.menuIcon, { backgroundColor: colors.surfaceAlt }]}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: colors.textDim }]}>{label}</Text>
        <Text style={[styles.menuValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      </View>
      <ChevronRight size={16} color={colors.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContainer: { padding: appSpacing.lg, gap: appSpacing.xl, paddingBottom: 40 },
  title: { 
    fontSize: 28, 
    fontWeight: "900",
    marginTop: appSpacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: appSpacing.lg,
    borderRadius: appRadius.xl,
    borderWidth: 1,
    ...appShadows.soft,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: appSpacing.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
  },
  name: { 
    fontWeight: "800", 
    fontSize: 20 
  },
  username: { 
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  section: {
    gap: appSpacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: appSpacing.xs,
  },
  menu: {
    borderRadius: appRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: appSpacing.md,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: appSpacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 11,
    marginBottom: 1,
  },
  menuValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginHorizontal: appSpacing.md,
  },
  footer: {
    marginTop: appSpacing.lg,
    gap: appSpacing.md,
  },
  logoutButton: {
    borderRadius: appRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    ...appShadows.soft,
  },
  logoutButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: { 
    color: "#FFF", 
    fontWeight: "800", 
    fontSize: 16,
  },
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: appSpacing.md,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
