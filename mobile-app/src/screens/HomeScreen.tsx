import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { 
  Activity, CreditCard, LayoutDashboard, UserCircle, Users, 
  TrendingUp, Settings, Sun, Moon, Wallet, Landmark, BarChart3 
} from "lucide-react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { darkTheme, lightTheme, appRadius, appShadows, appSpacing } from "@/theme";
import { ClientesScreen } from "@/screens/ClientesScreen";
import { FacturasScreen } from "@/screens/FacturasScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { getDashboardData, DashboardStats } from "@/services/dashboard";
import { formatCurrency } from "@/utils/format";

type TabKey = "dashboard" | "clientes" | "facturas" | "perfil";

export function HomeScreen() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const colors = theme === "dark" ? darkTheme : lightTheme;

  const [tab, setTab] = useState<TabKey>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "dashboard") {
      fetchStats();
    }
  }, [tab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const greeting = useMemo(() => {
    const name = user?.nombre || user?.username || "Usuario";
    return `¡Hola, ${name}!`;
  }, [user]);

  return (
    <View style={[styles.baseContainer, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {tab === "dashboard" ? (
            <View style={styles.dashboardContainer}>
              <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[styles.avatarHeader, { borderColor: colors.border }]}>
                    {user?.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                    ) : (
                      <UserCircle size={32} color={colors.textDim} />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Dashboard Financiero</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={fetchStats} style={[styles.toolIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                     <Activity size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={toggleTheme} style={[styles.toolIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {theme === "dark" ? <Sun size={20} color={colors.warning} /> : <Moon size={20} color={colors.primary} />}
                  </Pressable>
                </View>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {/* Total Balance Card */}
                <LinearGradient
                  colors={theme === "dark" ? [colors.surfaceAlt, colors.surface] : ["#6366F1", "#4F46E5"]}
                  style={[styles.mainCard, { borderColor: colors.border }]}
                >
                  <View style={styles.mainCardRow}>
                    <View>
                      <Text style={[styles.cardLabel, { color: theme === "dark" ? colors.textMuted : "rgba(255,255,255,0.8)" }]}>Efectivo Total</Text>
                      <Text style={[styles.cardValue, { color: theme === "dark" ? colors.text : "#FFF" }]}>
                        {formatCurrency(stats?.finance.saldoTotalEfectivo)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: theme === "dark" ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.2)" }]}>
                      <Wallet size={16} color={theme === "dark" ? colors.success : "#FFF"} />
                      <Text style={[styles.statusText, { color: theme === "dark" ? colors.success : "#FFF" }]}>Caja</Text>
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme === "dark" ? colors.border : "rgba(255,255,255,0.1)" }]} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[styles.apiInfo, { color: theme === "dark" ? colors.textDim : "rgba(255,255,255,0.6)" }]}>Balance Consolidado</Text>
                    <TrendingUp size={16} color={theme === "dark" ? colors.success : "#FFF"} />
                  </View>
                </LinearGradient>

                {/* Sub-balances Grid */}
                <View style={[styles.grid, { marginTop: appSpacing.lg }]}>
                  <ModuleCard 
                    title="Caja Principal" 
                    icon={<Landmark color={colors.primary} size={22} />} 
                    count={formatCurrency(stats?.finance.cajaPrincipal)}
                    onPress={() => {}}
                    theme={theme}
                  />
                  <ModuleCard 
                    title="Caja Papelería" 
                    icon={<CreditCard color={colors.secondary} size={22} />} 
                    count={formatCurrency(stats?.finance.cajaPapeleria)}
                    onPress={() => {}}
                    theme={theme}
                  />
                </View>

                {/* Chart Section - PREMIUM LINEAR VERSION */}
                <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.chartHeader}>
                    <TrendingUp size={18} color={colors.primary} />
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Reporte de Movimientos</Text>
                  </View>
                  
                  <View style={styles.chartArea}>
                    {/* Y-Axis Labels */}
                    <View style={styles.yAxis}>
                      <Text style={[styles.axisLabel, { color: colors.textDim }]}>500</Text>
                      <Text style={[styles.axisLabel, { color: colors.textDim }]}>250</Text>
                      <Text style={[styles.axisLabel, { color: colors.textDim }]}>0</Text>
                    </View>

                    {/* Grid Lines */}
                    <View style={styles.gridLines}>
                      <View style={[styles.gridLine, { borderColor: colors.border, opacity: 0.2 }]} />
                      <View style={[styles.gridLine, { borderColor: colors.border, opacity: 0.2 }]} />
                      <View style={[styles.gridLine, { borderColor: colors.border, borderBottomWidth: 1 }]} />
                    </View>

                    <View style={styles.lineChartWrapper}>
                      {stats?.finance.history.map((item, idx, arr) => {
                        const max = 500000; // Normalized max for the scale
                        const hRatioI = (item.ingresos / max) * 100;
                        const hRatioG = (item.gastos / max) * 100;
                        
                        return (
                          <View key={idx} style={styles.chartPointGroup}>
                            <View style={styles.lineVertical}>
                               <View style={[styles.lineDot, { bottom: hRatioI, backgroundColor: colors.success, zIndex: 2 }]} />
                               <View style={[styles.lineDot, { bottom: hRatioG, backgroundColor: colors.danger, zIndex: 1 }]} />
                            </View>
                            <Text style={[styles.barLabel, { color: colors.textDim }]}>{item.mes}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.legendText, { color: colors.textMuted }]}>Ingresos</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                      <Text style={[styles.legendText, { color: colors.textMuted }]}>Gastos</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: appSpacing.lg }]}>Actividad Reciente</Text>
                
                <View style={styles.activityList}>
                  {stats?.recentMovements.slice(0, 5).map((move) => (
                    <View key={move.id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.activityIcon, { backgroundColor: move.tipo === "INGRESO" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)" }]}>
                        <Activity size={16} color={move.tipo === "INGRESO" ? colors.success : colors.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{move.descripcion || move.categoria}</Text>
                        <Text style={[styles.activityDate, { color: colors.textDim }]}>{new Date(move.fecha).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.activityAmount, { color: move.tipo === "INGRESO" ? colors.success : colors.danger }]}>
                        {move.tipo === "INGRESO" ? "+" : "-"}{formatCurrency(move.monto)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {tab === "clientes" ? <ClientesScreen /> : null}
          {tab === "facturas" ? <FacturasScreen /> : null}
          {tab === "perfil" ? <ProfileScreen /> : null}
        </View>

        <View style={[styles.navBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <NavButton 
            active={tab === "dashboard"} 
            icon={<LayoutDashboard size={22} color={tab === "dashboard" ? colors.primary : colors.textDim} />}
            label="Inicio" 
            onPress={() => setTab("dashboard")} 
            theme={theme}
          />
          <NavButton 
            active={tab === "clientes"} 
            icon={<Users size={22} color={tab === "clientes" ? colors.primary : colors.textDim} />}
            label="Clientes" 
            onPress={() => setTab("clientes")} 
            theme={theme}
          />
          <NavButton 
            active={tab === "facturas"} 
            icon={<CreditCard size={22} color={tab === "facturas" ? colors.primary : colors.textDim} />}
            label="Facturas" 
            onPress={() => setTab("facturas")} 
            theme={theme}
          />
          <NavButton 
            active={tab === "perfil"} 
            icon={<UserCircle size={22} color={tab === "perfil" ? colors.primary : colors.textDim} />}
            label="Perfil" 
            onPress={() => setTab("perfil")} 
            theme={theme}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ModuleCard({ title, icon, count, onPress, theme }: { title: string; icon: any; count: string; onPress: () => void; theme: string }) {
  const colors = theme === "dark" ? darkTheme : lightTheme;
  return (
    <Pressable style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}>
      <View style={[styles.moduleIconContainer, { backgroundColor: theme === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(79, 70, 229, 0.05)" }]}>{icon}</View>
      <Text style={[styles.moduleTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.moduleCount, { color: colors.textDim }]}>{count}</Text>
    </Pressable>
  );
}

function NavButton({ active, icon, label, onPress, theme }: { active: boolean; icon: any; label: string; onPress: () => void; theme: string }) {
  const colors = theme === "dark" ? darkTheme : lightTheme;
  return (
    <Pressable style={styles.navButton} onPress={onPress}>
      <View style={[styles.navIconWrapper, active && { backgroundColor: theme === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(79, 70, 229, 0.1)" }]}>
        {icon}
      </View>
      <Text style={[styles.navLabel, { color: active ? colors.primary : colors.textDim }, active && { fontWeight: "700" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: appSpacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: appSpacing.lg,
    paddingTop: Platform.OS === "ios" ? 0 : appSpacing.md,
  },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarHeader: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  mainCard: {
    borderRadius: appRadius.xl,
    padding: appSpacing.lg,
    borderWidth: 1,
    ...appShadows.soft,
  },
  mainCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appRadius.full,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    marginVertical: appSpacing.md,
  },
  apiInfo: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: appSpacing.md,
  },
  grid: {
    flexDirection: "row",
    gap: appSpacing.md,
  },
  moduleCard: {
    flex: 1,
    borderRadius: appRadius.lg,
    padding: appSpacing.md,
    borderWidth: 1,
    ...appShadows.soft,
  },
  moduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: appSpacing.sm,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  moduleCount: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  chartContainer: {
    marginTop: appSpacing.lg,
    padding: appSpacing.lg,
    borderRadius: appRadius.xl,
    borderWidth: 1,
    ...appShadows.soft,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: appSpacing.xl,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartArea: {
    height: 140,
    position: "relative",
    marginBottom: appSpacing.lg,
    paddingLeft: 30,
  },
  yAxis: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 20,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
    zIndex: 1,
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: "700",
  },
  gridLines: {
    position: "absolute",
    left: 30,
    right: 0,
    top: 0,
    bottom: 20,
    justifyContent: "space-between",
  },
  gridLine: {
    width: "100%",
    borderBottomWidth: 1,
  },
  lineChartWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: "100%",
  },
  chartPointGroup: {
    alignItems: "center",
    flex: 1,
  },
  lineVertical: {
    height: 100,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    position: "relative",
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    left: -4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  connector: {
    position: "absolute",
    height: 2,
    width: 60,
    left: 2,
  },
  chartBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    marginBottom: appSpacing.md,
  },
  chartGroup: {
    alignItems: "center",
    gap: 8,
  },
  barPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: "100%",
    width: 30,
    justifyContent: "center",
  },
  bar: {
    width: 10,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: appSpacing.xl,
    marginTop: appSpacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activityList: {
    gap: appSpacing.sm,
    marginBottom: appSpacing.xl,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: appSpacing.md,
    borderRadius: appRadius.md,
    borderWidth: 1,
    gap: appSpacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityDate: {
    fontSize: 11,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  navBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingTop: 12,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
  },
  navIconWrapper: {
    width: 44,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
