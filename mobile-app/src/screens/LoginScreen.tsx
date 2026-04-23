import React, { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/http";
import { appColors } from "@/theme";

export function LoginScreen() {
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await signIn(username.trim(), password);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Sistema de Gestion</Text>
        <Text style={styles.subtitle}>Accede a clientes, suscripciones y facturas desde tu movil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Usuario</Text>
          <TextInput
            placeholder="Ingresa tu usuario"
            placeholderTextColor={appColors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            placeholder="Ingresa tu contrasena"
            placeholderTextColor={appColors.textMuted}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <ActivityIndicator color={appColors.text} /> : <Text style={styles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appColors.bg,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 14,
  },
  title: {
    color: appColors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: appColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  card: {
    backgroundColor: appColors.card,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  label: {
    color: appColors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: appColors.cardAlt,
    color: appColors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 6,
  },
  button: {
    backgroundColor: appColors.accent,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: appColors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    color: appColors.danger,
    fontSize: 12,
    marginBottom: 4,
  },
});
