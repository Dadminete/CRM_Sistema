import React from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { appColors } from "@/theme";
import { HomeScreen } from "@/screens/HomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";

function AppContent() {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: appColors.bg,
        }}
      >
        <ActivityIndicator size="large" color={appColors.accent} />
        <Text style={{ marginTop: 12, color: appColors.textMuted }}>Cargando sesión...</Text>
      </SafeAreaView>
    );
  }

  return token ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppContent />
    </AuthProvider>
  );
}
