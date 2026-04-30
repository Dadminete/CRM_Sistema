import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Lock, User } from "lucide-react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getApiErrorMessage } from "@/services/http";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";

export function LoginScreen() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"username" | "password" | null>(null);

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
    <View style={[styles.baseContainer, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoBadge}
              >
                <Lock color="#FFF" size={32} />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.text }]}>SISTEMA</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Gestión Inteligente v3.0</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={[styles.inputWrapper, { 
                  backgroundColor: colors.surface, 
                  borderColor: focusedField === "username" ? colors.primary : colors.border 
                }]}>
                  <User size={20} color={focusedField === "username" ? colors.primary : colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Usuario"
                    placeholderTextColor={colors.textDim}
                    style={[styles.input, { color: colors.text }]}
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={[styles.inputWrapper, { 
                  backgroundColor: colors.surface, 
                  borderColor: focusedField === "password" ? colors.primary : colors.border 
                }]}>
                  <Lock size={20} color={focusedField === "password" ? colors.primary : colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Contraseña"
                    placeholderTextColor={colors.textDim}
                    style={[styles.input, { color: colors.text }]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                    {showPassword 
                      ? <EyeOff size={20} color={colors.textDim} />
                      : <Eye size={20} color={colors.textDim} />
                    }
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.buttonWrapper,
                  (!canSubmit || submitting) && styles.buttonDisabled,
                  pressed && canSubmit && styles.buttonPressed,
                ]}
                onPress={handleLogin}
                disabled={!canSubmit || submitting}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Iniciar Sesión</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.forgotBtn}>
                <Text style={[styles.forgotText, { color: colors.textDim }]}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: appSpacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: appSpacing.xxl,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: appSpacing.lg,
    ...appShadows.glow,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: appSpacing.xs,
  },
  form: {
    gap: appSpacing.md,
  },
  inputContainer: {
    gap: appSpacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: appRadius.lg,
    borderWidth: 1,
    paddingHorizontal: appSpacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: appSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    outlineWidth: 0,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    padding: appSpacing.md,
    borderRadius: appRadius.md,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
  },
  errorText: {
    color: "#F43F5E",
    fontSize: 14,
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: appSpacing.lg,
    borderRadius: appRadius.lg,
    overflow: "hidden",
    ...appShadows.soft,
  },
  buttonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  forgotBtn: {
    alignItems: "center",
    marginTop: appSpacing.md,
  },
  forgotText: {
    fontSize: 14,
  },
});
