# Sistema de Gestión v3.0

Sistema integral de gestión empresarial desarrollado con Next.js 15, TypeScript y PostgreSQL. Incluye CRM, gestión de inventario, facturación, contabilidad y administración de usuarios con control de roles y permisos granular.

## 🚀 Características Principales

### Seguridad
-  Autenticación JWT con sesiones persistentes
-  Hash de contraseñas con bcrypt
-  Control de roles y permisos granular
-  Rate limiting en endpoints críticos
-  Validación de entrada con Zod
-  Protección contra ataques comunes (XSS, SQL Injection, CSRF)
-  Sistema de auditoría completo (bitácora)
-  Recuperación de contraseña con tokens seguros

### Funcionalidades de Negocio
-  **CRM**: Gestión completa de clientes y relaciones
-  **Facturación**: Creación, edición y seguimiento de facturas
-  **Inventario**: Control de productos de papelería con alertas de stock
-  **Contabilidad**: Gestión de ingresos, gastos y cajas
-  **Reportes**: Exportación a Excel, estadísticas en tiempo real
-  **Notificaciones**: Sistema de alertas en tiempo real con polling

### Performance
-  Paginación optimizada en todas las listas
-  Índices de base de datos estratégicos
-  Connection pooling con Neon Serverless
-  Optimización de imágenes con Next.js Image
-  Lazy loading y code splitting

### Testing
-  46 tests unitarios (auth, audit, export, notifications)
-  13 tests de integración (API flows, permissions)
-  Configuración con Vitest y Testing Library
-  Coverage reportingÚltima actualización: Febrero 2026

## 📦 Tecnologías

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework** | Next.js | 15.4.5 |
| **Lenguaje** | TypeScript | 5.8.3 |
| **Base de Datos** | PostgreSQL (Neon) | - |
| **ORM** | Drizzle ORM | 0.45.1 |
| **UI** | shadcn/ui + Tailwind CSS | 4.1.5 |
| **Autenticación** | JWT + bcrypt | - |
| **Testing** | Vitest + Testing Library | 4.0.18 |
| **Validación** | Zod | 3.25.76 |
| **State Management** | Zustand | 5.0.6 |

## 📁 Estructura del Proyecto

```
Sistema_de_Gestion_v3.0/
├── src/
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── (external)/         # Rutas públicas (login, reset-password)
│   │   ├── (main)/             # Rutas protegidas (dashboard)
│   │   │   ├── dashboard/      # Módulos principales
│   │   │   │   ├── clientes/
│   │   │   │   ├── facturas/
│   │   │   │   ├── productos/
│   │   │   │   ├── usuarios/
│   │   │   │   ├── auditoria/
│   │   │   │   └── profile/
│   │   │   └── auth/           # Callback OAuth
│   │   └── api/                # API Routes
│   │       ├── auth/           # Login, logout, forgot-password, reset-password
│   │       ├── users/          # CRUD usuarios
│   │       ├── clientes/       # CRUD clientes
│   │       ├── facturas/       # CRUD facturas
│   │       ├── productos/      # CRUD productos
│   │       ├── gastos/         # Gestión de gastos
│   │       ├── ingresos/       # Gestión de ingresos
│   │       ├── cajas/          # Control de cajas
│   │       ├── export/         # Exportación Excel (users, clientes, facturas, productos)
│   │       ├── notifications/  # Sistema de notificaciones
│   │       ├── profile/        # Perfil de usuario
│   │       └── auditoria/      # Consulta de bitácora
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── data-table/         # Componentes de tabla reutilizables
│   │   └── logout-button.tsx
│   ├── lib/
│   │   ├── auth.ts             # Funciones de autenticación
│   │   ├── api-auth.ts         # Middleware withAuth
│   │   ├── api-response.ts     # Helpers de respuesta API
│   │   ├── audit.ts            # Sistema de auditoría
│   │   ├── notifications.ts    # Sistema de notificaciones
│   │   ├── db/                 # Configuración Drizzle ORM
│   │   │   ├── index.ts        # Cliente Neon
│   │   │   └── schema.ts       # Esquemas de tablas
│   │   └── export/
│   │       └── excel.ts        # Utilidades de exportación
│   ├── middleware/
│   │   └── auth-middleware.ts  # Middleware Next.js
│   ├── scripts/                # Scripts de utilidad
│   └── tests/
│       ├── setup.ts            # Configuración de tests
│       ├── lib/                # Tests unitarios
│       ├── integration/        # Tests de integración
│       └── utils/              # Helpers para testing
├── migrations/                 # SQL migrations (ejecutar manualmente)
├── public/                     # Assets estáticos
├── vitest.config.ts            # Configuración de testing
├── drizzle.config.ts           # Configuración de Drizzle
├── eslint.config.mjs           # ESLint estricto
└── tsconfig.json               # TypeScript config
```

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Dadminete/Sistema_de_Gestion_v3.0.git
cd Sistema_de_Gestion_v3.0
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=verify-full"

# JWT Secret (CAMBIAR EN PRODUCCIÓN - mínimo 32 caracteres)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"
JWT_EXPIRES_IN="30d"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutos
RATE_LIMIT_MAX_REQUESTS="100"
```

### 4. Ejecutar Migraciones de Base de Datos

**IMPORTANTE:** Ejecuta estos archivos SQL manualmente en tu base de datos PostgreSQL/Neon:

```sql
-- 1. Migración de notificaciones
migrations/create_notificaciones_table.sql

-- 2. Migración de tokens de recuperación de contraseña
migrations/create_password_reset_tokens_table.sql
```

### 5. Seed de Usuario Inicial (Opcional)

```bash
npm run create-test-user
```

Esto creará un usuario inicial para acceder al sistema.

### 6. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Para acceso en red local (LAN):

```bash
npm run dev:lan
```

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run dev:lan` | Inicia servidor accesible en red local (0.0.0.0:3000) |
| `npm run build` | Construye la aplicación para producción |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run format` | Formatea código con Prettier |
| `npm run format:check` | Verifica formato sin modificar |
| `npm test` | Ejecuta tests en modo watch |
| `npm run test:run` | Ejecuta tests una vez |
| `npm run test:ui` | Abre UI de Vitest |
| `npm run test:coverage` | Genera reporte de cobertura |

## 🧪testing

### Ejecutar Tests

```bash
# Tests en modo watch
npm test

# Ejecutar una vez
npm run test:run

# Ver cobertura
npm run test:coverage

# UI interactiva
npm run test:ui
```

### Estructura de Tests

- **Unit Tests** (`src/tests/lib/`): 46 tests
  - `auth.test.ts`: Hash de contraseñas, JWT, sesiones
  - `audit.test.ts`: Sistema de auditoría
  - `export-excel.test.ts`: Exportación y formateo Excel
  - `notifications.test.ts`: Creación de notificaciones

- **Integration Tests** (`src/tests/integration/`): 13 tests
  - `api.test.ts`: Flujos completos de autenticación, permisos, validación

### Cobertura Actual

```
 Test Files  5 passed (5)
      Tests  59 passed (59)
```

## 🔐 Seguridad

### Características de Seguridad Implementadas

1. **Autenticación y Autorización**
   - JWT con expiración configurable
   - Control granular de permisos (rol → permisos → recursos)
   - Sesiones con tracking de IP y User-Agent

2. **Protección de Contraseñas**
   - Hash con bcrypt (salt rounds: 10)
   - Recuperación segura con tokens de un solo uso
   - Tokens expiran en 1 hora
   - Prevención de enumeración de emails

3. **Rate Limiting**
   - Endpoints de login: 5 intentos/15 min
   - Endpoints de auth general: 10 intentos/15 min
   - API general: 100 requests/15 min

4. **Validación**
   - Validación de entrada con Zod en todos los endpoints
   - Sanitización SQL vía Drizzle ORM (previene SQL injection)
   - Validación de permisos en cada operación

5. **Auditoría**
   - Log de todas las acciones críticas
   - Tracking de cambios (before/after)
   - IP, User-Agent, duración de operaciones

### Reportar Vulnerabilidades

Ver [SECURITY.md](SECURITY.md) para la política de reporte de vulnerabilidades.

## 🚀 Despliegue en Producción

### Vercel (Recomendado)

1. **Conecta el Repositorio**
   - Crea proyecto en [vercel.com](https://vercel.com)
   - Importa desde GitHub

2. **Configura Variables de Entorno**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=<strong-secret-min-32-chars>
   JWT_EXPIRES_IN=30d
   NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
   ```

3. **Configura Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: (dejar vacío)

4. **Deploy**
   - Click "Deploy"
   - Vercel detectará automáticamente Next.js y optimizará el build

### Otras Plataformas (Docker, VPS)

```bash
# Build para producción
npm run build

# Iniciar en modo producción
npm run start
```

**Requisitos del servidor:**
- Node.js 18+
- Variables de entorno configuradas
- PostgreSQL accesible
- Puerto 3000 abierto (o configurar PORT en env)

## 📊 Base de Datos

### Esquema Principal

#### Tablas de Usuarios y Autenticación
- `usuarios`: Datos de usuarios
- `roles`: Roles del sistema (Admin, Gerente, Cajero, etc.)
- `permisos`: Permisos granulares (usuarios:crear, facturas:leer, etc.)
- `usuarios_roles`: Relación many-to-many usuarios-roles
- `roles_permisos`: Relación many-to-many roles-permisos
- `sesiones_usuario`: Sesiones activas con tracking
- `password_reset_tokens`: Tokens de recuperación de contraseña
- `bitacora`: Registro de auditoría

#### Tablas de Negocio
- `clientes`: Información de clientes
- `facturas`: Facturas emitidas
- `detalles_factura`: Líneas de factura
- `productos_papeleria`: Inventario de productos
- `ingresos`: Registro de ingresos
- `gastos`: Registro de gastos
- `cajas`: Control de cajas
- `movimientos_caja`: Movimientos de efectivo
- `notificaciones`: Notificaciones del sistema

### Migraciones Pendientes

Ejecuta manualmente en tu base de datos:

```bash
migrations/create_notificaciones_table.sql
migrations/create_password_reset_tokens_table.sql
```

## 🤝 Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de contribución, convenciones de código y proceso de pull requests.

## 📝 Licencia

Ver [LICENSE](LICENSE) para más información.

## 📧 Contacto

- **Repositorio**: [GitHub](https://github.com/Dadminete/Sistema_de_Gestion_v3.0)
- **Issues**: [GitHub Issues](https://github.com/Dadminete/Sistema_de_Gestion_v3.0/issues)

## 🎯 Roadmap

### Completado ✅
- [x] Fase 1: Seguridad (8 tareas)
- [x] Fase 2: Performance (6 tareas)
- [x] Fase 3: Funcionalidades Esenciales (8/9 tareas)
- [x] Fase 4: Tests y Calidad (5/7 tareas)

### En Progreso 🔄
- [ ] Tests E2E con Playwright
- [ ] Refactorización de componentes grandes

### Futuro 📅
- [ ] Reportes PDF (pendiente por error de instalación jspdf)
- [ ] Integración de email (nodemailer)
- [ ] Dashboard de analíticas avanzadas
- [ ] Módulo de proyectos
- [ ] API REST pública con documentación OpenAPI

---

Desarrollado con ❤️ usando Next.js 15 y TypeScript
