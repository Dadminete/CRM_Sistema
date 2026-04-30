import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await SecureStore.getItemAsync("app_theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme as ThemeMode);
        } else {
          const systemTheme = Appearance.getColorScheme();
          setTheme(systemTheme === "light" ? "light" : "dark");
        }
      } catch (e) {
        setTheme("dark");
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      await SecureStore.setItemAsync("app_theme", newTheme);
    } catch (e) {
      // Ignore storage errors
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
}
