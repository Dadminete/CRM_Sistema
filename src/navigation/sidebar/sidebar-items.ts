import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { banks, cuentasBancarias } from "@/lib/db/schema";
import { toBankPathSegment } from "@/lib/utils";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: string;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: string;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItemsBase: NavGroup[] = [
  {
    id: 1,
    label: "Menu Principal",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/crm",
        icon: "LayoutDashboard",
      },
      {
        title: "Averias",
        url: "/dashboard/averias",
        icon: "Wrench",
        subItems: [
          {
            title: "Crear Averia",
            url: "/dashboard/averias/crear",
            icon: "Plus",
          },
          {
            title: "Listado Averias",
            url: "/dashboard/averias/listado",
            icon: "List",
          },
          {
            title: "Cerrar Averias",
            url: "/dashboard/averias/cerrar",
            icon: "CheckCircle",
          },
        ],
      },
      {
        title: "Banco",
        url: "/dashboard/banco",
        icon: "Landmark",
        subItems: [
          {
            title: "Dashboard Bancos",
            url: "/dashboard/banco/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Gestion de Banco",
            url: "/dashboard/banco/gestion",
            icon: "Landmark",
          },
        ],
      },
      {
        title: "Cajas Chicas",
        url: "/dashboard/cajas-chicas",
        icon: "Wallet",
        subItems: [
          {
            title: "Dashboard Cajas",
            url: "/dashboard/cajas-chicas/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Apertura & Cierre",
            url: "/dashboard/cajas-chicas/apertura-cierre",
            icon: "DoorOpen",
          },
          {
            title: "Listado Cajas",
            url: "/dashboard/cajas-chicas/listado",
            icon: "List",
          },
          {
            title: "Resolución Discrepancias",
            url: "/dashboard/cajas-chicas/discrepancias",
            icon: "FileCheck",
          },
          {
            title: "Reporte de Ingresos",
            url: "/dashboard/listados/ingresos",
            icon: "TrendingUp",
          },
          {
            title: "Reporte de Gastos",
            url: "/dashboard/listados/gastos",
            icon: "TrendingDown",
          },
        ],
      },
      {
        title: "Clientes",
        url: "/dashboard/clientes",
        icon: "Users",
        subItems: [
          {
            title: "Dashboard Clientes",
            url: "/dashboard/clientes/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Crear Clientes",
            url: "/dashboard/clientes/crear",
            icon: "UserPlus",
          },
          {
            title: "Equipos & Servicios",
            url: "/dashboard/clientes/equipos-servicios",
            icon: "Settings",
          },
          {
            title: "Listado Clientes",
            url: "/dashboard/clientes/listado",
            icon: "List",
          },
          {
            title: "Listado Inactivos",
            url: "/dashboard/clientes/inactivos",
            icon: "UserX",
          },
          {
            title: "Suscripciones",
            url: "/dashboard/clientes/suscripciones",
            icon: "CreditCard",
          },
        ],
      },
      {
        title: "Contabilidad",
        url: "/dashboard/contabilidad",
        icon: "Calculator",
        subItems: [
          {
            title: "Dashboard Contabilidad",
            url: "/dashboard/contabilidad/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Categorias Cuentas",
            url: "/dashboard/contabilidad/categorias-cuentas",
            icon: "FolderTree",
          },
          {
            title: "Cuentas Contables",
            url: "/dashboard/contabilidad/cuentas-contables",
            icon: "BookOpen",
          },
          {
            title: "Cuentas por Cobrar",
            url: "/dashboard/contabilidad/cuentas-por-cobrar",
            icon: "Receipt",
          },
          {
            title: "Ingresos & Gastos",
            url: "/dashboard/contabilidad/ingresos-gastos",
            icon: "TrendingUp",
          },
          {
            title: "Pagos X Mes",
            url: "/dashboard/contabilidad/pagos-mes",
            icon: "CalendarCheck",
          },
          {
            title: "Traspasos",
            url: "/dashboard/contabilidad/traspasos",
            icon: "ArrowLeftRight",
          },
          {
            title: "Listado de Ingresos",
            url: "/dashboard/listados/ingresos",
            icon: "ArrowUpCircle",
          },
        ],
      },
      {
        title: "Facturas",
        url: "/dashboard/facturas",
        icon: "FileText",
        subItems: [
          {
            title: "Dashboard Facturas",
            url: "/dashboard/facturas/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Crear Facturas",
            url: "/dashboard/facturas/crear",
            icon: "FilePlus",
          },
          {
            title: "Pagar Facturas",
            url: "/dashboard/facturas/pagar",
            icon: "CreditCard",
          },
          {
            title: "Facturas Anuladas",
            url: "/dashboard/facturas/anuladas",
            icon: "FileX",
          },
          {
            title: "Facturas Pendientes",
            url: "/dashboard/facturas/pendientes",
            icon: "Clock",
          },
          {
            title: "Facturas Pagas",
            url: "/dashboard/facturas/pagas",
            icon: "FileCheck",
          },
          {
            title: "Pagos Parciales",
            url: "/dashboard/facturas/pagos-parciales",
            icon: "Split",
          },
          {
            title: "Pagos x Mes",
            url: "/dashboard/facturas/pagos-mes",
            icon: "CalendarCheck",
          },
        ],
      },
      {
        title: "Listados",
        url: "/dashboard/listados",
        icon: "ClipboardList",
        subItems: [
          {
            title: "Lista Ingresos",
            url: "/dashboard/listados/ingresos",
            icon: "ArrowUpCircle",
          },
          {
            title: "Lista Gastos",
            url: "/dashboard/listados/gastos",
            icon: "ArrowDownCircle",
          },
        ],
      },
      {
        title: "Papeleria",
        url: "/dashboard/papeleria",
        icon: "ShoppingCart",
        subItems: [
          {
            title: "Dashboard Papeleria",
            url: "/dashboard/papeleria/dashboard",
            icon: "LayoutDashboard",
          },
          {
            title: "Ventas",
            url: "/dashboard/papeleria/ventas",
            icon: "ShoppingCart",
          },
          {
            title: "Categorias",
            url: "/dashboard/papeleria/categorias",
            icon: "FolderTree",
          },
          {
            title: "Productos",
            url: "/dashboard/papeleria/productos",
            icon: "Package",
          },
          {
            title: "Listado Papeleria",
            url: "/dashboard/papeleria/listado-papeleria",
            icon: "List",
          },
          {
            title: "Listado de Ventas",
            url: "/dashboard/papeleria/listado-ventas",
            icon: "ClipboardCheck",
          },
        ],
      },
      {
        title: "Default",
        url: "/dashboard/default",
        icon: "LayoutDashboard",
      },
    ],
  },
  {
    id: 2,
    label: "Herramientas",
    items: [
      {
        title: "Base De Datos",
        url: "/dashboard/database",
        icon: "Database",
      },
      {
        title: "Chat",
        url: "/chat",
        icon: "MessageSquare",
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: "Calendar",
      },
      {
        title: "Permisos",
        url: "/dashboard/permissions",
        icon: "Shield",
      },
      {
        title: "Servicios",
        url: "/servicios",
        icon: "ServerCog",
        subItems: [
          {
            title: "Categorias",
            url: "/servicios/categorias",
            icon: "FolderTree",
          },
          {
            title: "Servicios",
            url: "/servicios/listado",
            icon: "Settings",
          },
          {
            title: "Planes",
            url: "/dashboard/servicios/planes",
            icon: "Layers",
          },
        ],
      },
      {
        title: "RR.HH.",
        url: "/rrhh",
        icon: "Briefcase",
        subItems: [
          {
            title: "Empleados",
            url: "/rrhh/empleados",
            icon: "UserCheck",
          },
          {
            title: "Nómina",
            url: "/rrhh/nomina",
            icon: "DollarSign",
          },
          {
            title: "Préstamos",
            url: "/rrhh/prestamos",
            icon: "HandCoins",
          },
          {
            title: "Comisiones",
            url: "/rrhh/comisiones",
            icon: "TrendingUpDown",
          },
        ],
      },
      {
        title: "Roles",
        url: "/dashboard/roles",
        icon: "Lock",
      },
      {
        title: "Usuarios",
        url: "/dashboard/users",
        icon: "Users",
      },
      {
        title: "Authentication",
        url: "/auth",
        icon: "Fingerprint",
        subItems: [
          { title: "Login v1", url: "/auth/v1/login", newTab: true },
          { title: "Login v2", url: "/auth/v2/login", newTab: true },
          { title: "Register v1", url: "/auth/v1/register", newTab: true },
          { title: "Register v2", url: "/auth/v2/register", newTab: true },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Capacitación",
    items: [
      {
        title: "ISP Academy",
        url: "/dashboard/capacitacion",
        icon: "GraduationCap",
        isNew: true,
        subItems: [
          {
            title: "Fundamentos de Redes",
            url: "/dashboard/capacitacion/fundamentos-redes",
            icon: "Network",
          },
          {
            title: "Redes Inalámbricas",
            url: "/dashboard/capacitacion/redes-inalambricas",
            icon: "Wifi",
          },
          {
            title: "Equipos MikroTik",
            url: "/dashboard/capacitacion/equipos-mikrotik",
            icon: "Router",
          },
          {
            title: "Operaciones Básicas",
            url: "/dashboard/capacitacion/operaciones-basicas",
            icon: "Terminal",
          },
        ],
      },
    ],
  },
];

// Utility moved to @/lib/utils

export async function getSidebarItems(): Promise<NavGroup[]> {
  const bancosConCuentas = await db.query.banks.findMany({
    where: eq(banks.activo, true),
    with: {
      cuentasBancarias: {
        where: eq(cuentasBancarias.activo, true),
      },
    },
    orderBy: [asc(banks.nombre)],
  });

  return sidebarItemsBase.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.title !== "Banco") {
        return item;
      }

      const staticSubItems = item.subItems ?? [];
      const existingUrls = new Set(staticSubItems.map((subItem) => subItem.url));

      // Generar sub-items dinámicos para bancos y sus cuentas
      const dynamicBankSubItems: NavSubItem[] = [];

      bancosConCuentas.forEach((bank) => {
        // Añadir el banco si no existe
        const bankUrl = `/dashboard/banco/${toBankPathSegment(bank.nombre)}`;
        if (!existingUrls.has(bankUrl)) {
          dynamicBankSubItems.push({
            title: bank.nombre,
            url: bankUrl,
            icon: "Landmark",
          });
        }
      });

      return {
        ...item,
        subItems: [...staticSubItems, ...dynamicBankSubItems],
      };
    }),
  }));
}

export const sidebarItems = sidebarItemsBase;
