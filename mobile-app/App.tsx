import React, { useEffect, useRef } from "react";
import { ActivityIndicator, SafeAreaView, Text, View, PanResponder } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme } from "@/theme";
import { HomeScreen } from "@/screens/HomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";

function SessionTimeout({ children }: { children: React.ReactNode }) {
  const { signOut, token } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 20000; // 20 seconds

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (token) {
      timerRef.current = setTimeout(() => {
        signOut();
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

function AppContent() {
  const { loading, token } = useAuth();
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textDim }}>Cargando sesión...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SessionTimeout>
      {token ? <HomeScreen /> : <LoginScreen />}
    </SessionTimeout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
