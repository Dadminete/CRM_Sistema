# Sistema Gestion Mobile

App React Native (Expo) que consume el backend de **Sistema de Gestion v3.0**.  
Completamente portable: puede copiarse fuera del folder del proyecto principal y seguirá funcionando.

## Requisitos

- Node.js 18+
- `npx expo` (incluido al hacer `npm install`)
- Android Studio / Emulador, o dispositivo físico con **Expo Go**

## Configuración

1. Copia `.env.example` como `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Edita la IP del backend:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000
   ```
   > En emulador Android usa `http://10.0.2.2:3000`.

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npm start        # QR para Expo Go
npm run android  # Emulador Android
npm run ios      # Simulador iOS
```

## Estructura

```
src/
├── config/env.ts               # Lee EXPO_PUBLIC_API_BASE_URL
├── context/AuthContext.tsx     # Estado de sesión global
├── screens/
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx          # Shell con tabs inferiores
│   ├── ClientesScreen.tsx      # Listado de clientes
│   ├── ClienteDetailScreen.tsx # Info + Suscripciones + Historial
│   ├── SuscripcionesScreen.tsx
│   └── ProfileScreen.tsx
├── services/
│   ├── http.ts        # axios + Bearer token automático
│   ├── auth.ts        # login / session
│   ├── clientes.ts
│   └── suscripciones.ts
├── storage/session.ts  # SecureStore (token + user)
├── types/api.ts        # Interfaces TypeScript
└── theme.ts            # Colores
```

## Autenticación

Usa `/api/auth/login` del backend. El JWT se guarda en SecureStore y se envía como  
`Authorization: Bearer <token>` en cada request. El backend acepta tanto cookies (web) como Bearer token (móvil).

## Portabilidad

Para mover la app fuera de este proyecto: copia la carpeta `mobile-app/`, crea `.env.local` con la URL del backend, ejecuta `npm install` y `npm start`.
- Lista de clientes activos + busqueda
- Detalle rapido de cliente
- Lista de suscripciones activas
- Perfil y cierre de sesion

## Portabilidad total (sacar del folder y seguir funcionando)

Esta carpeta no depende del resto del repo para compilar.
Puedes mover `mobile-app` a cualquier ubicacion y funcionara igual mientras apuntes a una API valida.

## Requisitos

- Node.js 20+
- npm 10+
- Expo Go en tu telefono (o emulador Android/iOS)
- Backend corriendo y accesible por red

## Configuracion

1. Copia `.env.example` a `.env`.
2. Ajusta `EXPO_PUBLIC_API_BASE_URL`.

Ejemplo en red local:

EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000

Notas:
- En Android emulator normalmente funciona `http://10.0.2.2:3000`.
- En iOS simulator normalmente funciona `http://127.0.0.1:3000`.

## Ejecutar

```bash
cd mobile-app
npm install
npm run start
```

Luego:

- Presiona `a` para Android emulator
- Presiona `i` para iOS simulator (macOS)
- Escanea QR con Expo Go para abrir en telefono

## Estructura

- App.tsx
- src/context/AuthContext.tsx
- src/services/*
- src/screens/*
- src/storage/session.ts
- src/config/env.ts

## Importante para tu backend

Se agrego compatibilidad movil en API:

- `Authorization: Bearer <token>` ahora es aceptado en autenticacion de rutas protegidas.
- Login devuelve `token` y `sessionId` en el payload de respuesta.

Asi, la app movil puede autenticar sin depender de cookies web.
