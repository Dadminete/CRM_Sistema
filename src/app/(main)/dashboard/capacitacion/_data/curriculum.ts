// ─────────────────────────────────────────────────────────────
//  ISP Training Curriculum — Static content (no DB required)
// ─────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  duration: string; // e.g. "5 min"
  content: string; // HTML/markdown-like text
  keyPoints: string[];
  videoUrl?: string; // YouTube embed URL
  diagram?: "osi" | "topologies" | "ptp" | "ptmp" | "dhcp" | "ip" | "mikrotik-network";
  hasCalculator?: boolean;
}

export interface TrainingModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  lessons: Lesson[];
}

export const curriculum: TrainingModule[] = [
  // ─────────────────────────────────────────────────────────────
  // MODULE 1 — Fundamentos de Redes
  // ─────────────────────────────────────────────────────────────
  {
    id: "mod-1",
    slug: "fundamentos-redes",
    title: "Fundamentos de Redes",
    subtitle: "Conceptos esenciales para entender cómo funciona Internet",
    icon: "Network",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    lessons: [
      {
        id: "l1-1",
        title: "¿Qué es una red informática?",
        duration: "5 min",
        content: `Una **red informática** es un conjunto de dispositivos (computadoras, routers, switches, teléfonos) interconectados para compartir datos y recursos.

Como ISP, nuestro trabajo es conectar a nuestros clientes a la red más grande del mundo: **Internet**.

**Tipos de redes:**
- **LAN** (Red de Área Local): Red dentro de un edificio o casa. Ejemplo: la red WiFi de un cliente en su hogar.
- **WAN** (Red de Área Amplia): Red que cubre grandes distancias. Internet es la WAN más grande del mundo.
- **MAN** (Red de Área Metropolitana): Redes que cubren ciudades. Nuestras redes de distribución son MAN.

**¿Cómo llegamos al cliente?**
El trayecto del Internet es: **Data Center → Backbone → Nuestro NOC → Torres → Cliente**`,
        keyPoints: [
          "LAN = red local (casa/oficina del cliente)",
          "WAN = Internet y enlaces de larga distancia",
          "Somos el enlace entre el backbone y el cliente",
          "Cada equipo en la red tiene una dirección única (IP)",
        ],
        diagram: "topologies",
      },
      {
        id: "l1-2",
        title: "El Modelo OSI — Las 7 capas",
        duration: "8 min",
        content: `El **Modelo OSI** (Open Systems Interconnection) divide la comunicación en red en **7 capas**. Cada capa tiene una función específica.

Como técnico de ISP, trabajarás principalmente con las capas 1, 2 y 3:

**Capa 1 — Física:** El cable, la fibra, la señal de radio. Cuando hay "no hay señal", el problema es aquí.

**Capa 2 — Enlace de Datos:** Maneja las direcciones MAC y el acceso al medio. Los switches trabajan aquí. El protocolo PPPoE que usan muchos ISP vive en esta capa.

**Capa 3 — Red:** Maneja las direcciones IP y el enrutamiento. Los routers (como el RB760iGS) trabajan aquí.

**Capas 4-7:** Transporte, Sesión, Presentación y Aplicación — son las que le importan a las apps del usuario (Netflix, WhatsApp, etc.).

**Regla práctica para diagnóstico:**
Siempre empieza desde la capa 1 (¿hay señal? ¿está encendido?) y sube hacia la 7.`,
        keyPoints: [
          "Capa 1 (Física): señal de radio, cables, potencia",
          "Capa 2 (Enlace): MACs, switches, PPPoE",
          "Capa 3 (Red): IPs, routing, nuestro RB760iGS",
          "Diagnosticar siempre de abajo (Capa 1) hacia arriba",
        ],
        diagram: "osi",
      },
      {
        id: "l1-3",
        title: "Direcciones IP y Subnetting Básico",
        duration: "10 min",
        content: `Una **dirección IP** (IPv4) es el identificador único de cada dispositivo en una red. Tiene el formato: \`192.168.1.100\`

Está compuesta por **4 octetos** (grupos de 8 bits), separados por puntos. Cada octeto puede valer del 0 al 255.

**Partes de una IP:**
- **Red:** Identifica la red a la que pertenece el dispositivo
- **Host:** Identifica el dispositivo específico dentro de esa red

La **máscara de subred** define cuántos bits son red y cuántos son host:
- \`/24\` = 255.255.255.0 → 254 hosts disponibles
- \`/28\` = 255.255.255.240 → 14 hosts disponibles
- \`/30\` = 255.255.255.252 → 2 hosts (usada en enlaces PtP)

**IPs privadas comunes en ISP:**
- \`10.0.0.0/8\` — Para gestión de equipos
- \`172.16.0.0/12\` — Para distribución
- \`192.168.x.x/24\` — Para redes de clientes

**IP Pública vs IP Privada:**
Los clientes reciben IPs privadas de tu red. Cuando salen a Internet, el router hace **NAT** para convertir esa IP privada en tu IP pública.`,
        keyPoints: [
          "IP = 4 octetos (0-255), ej: 192.168.1.1",
          "/24 = 254 hosts | /30 = 2 hosts (enlaces PtP)",
          "IPs privadas: 10.x, 172.16.x, 192.168.x",
          "NAT convierte IP privada → IP pública para Internet",
        ],
        diagram: "ip",
        hasCalculator: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 2 — Redes Inalámbricas
  // ─────────────────────────────────────────────────────────────
  {
    id: "mod-2",
    slug: "redes-inalambricas",
    title: "Redes Inalámbricas",
    subtitle: "Frecuencias, señal y tipos de enlace para ISP",
    icon: "Wifi",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    lessons: [
      {
        id: "l2-1",
        title: "Frecuencias: 2.4 GHz vs 5 GHz",
        duration: "6 min",
        content: `Las redes inalámbricas transmiten datos usando **ondas de radio**. Las dos frecuencias más comunes son **2.4 GHz** y **5 GHz**.

**2.4 GHz:**
- Mayor alcance (la señal llega más lejos)
- Más interferencias (usada por microondas, vecinos, etc.)
- Menor velocidad máxima
- Mejor para atravesar obstáculos (paredes, árboles)
- Usada comúnmente en equipos de largo alcance

**5 GHz:**
- Mayor velocidad de datos
- Menos interferencias (más canales disponibles)
- Menor alcance
- Mejor en línea de visión directa (LOS)
- Usada en nuestros equipos SXTsq 5 y LHG 5

**¿Cuándo usar cada una?**
- **5 GHz** → enlaces punto a punto, distribución urbana con LOS claro
- **2.4 GHz** → clientes con obstáculos, largas distancias rurales

**Interferencia:**
Los canales en 2.4 GHz que NO se solapan son el **1, 6 y 11**. Siempre usa estos para evitar interferencia entre tus torres.`,
        keyPoints: [
          "2.4 GHz = más alcance, más interferencias",
          "5 GHz = más velocidad, menos interferencias, menos alcance",
          "Canales sin solapamiento en 2.4: 1, 6 y 11",
          "LHG y SXTsq de Mikrotik operan en 5 GHz",
        ],
      },
      {
        id: "l2-2",
        title: "PtP y PtMP — Tipos de Enlace",
        duration: "7 min",
        content: `Existen dos topologías principales en redes inalámbricas ISP:

**Punto a Punto (PtP — Point to Point):**
- Conecta exactamente **2 equipos** entre sí
- Se usa para **backhaul**: conectar una torre con otra, o la torre con el NOC
- Requiere alta ganancia y dirección precisa
- Equipo típico: **MikroTik LHG** (hasta 20+ km con LOS)
- El ancho de banda es compartido solo entre esos 2 puntos

**Punto a Multipunto (PtMP — Point to MultiPoint):**
- Un equipo central (**AP / Access Point**) conecta a **muchos clientes**
- Cada torre de distribución funciona así: 1 AP → N clientes
- Equipo típico: **MikroTik SXTsq** (sectorial 90° para cubrir un sector)
- El ancho de banda se divide entre todos los clientes conectados

**Diseño típico de red ISP:**

\`\`\`
NOC/Internet
    │
    │ (enlace de fibra o PtP backhaul)
    │
 Torre Principal
   /     \\
  PtP   PtP      ← enlaces backhaul con LHG
 /         \\
Torre     Torre   ← torres de distribución
sectorial sectorial
│  │  │   │  │  │
C  C  C   C  C  C  ← clientes finales (SXTsq o LHG CPE)
\`\`\``,
        keyPoints: [
          "PtP = 2 puntos, backhaul entre torres (LHG)",
          "PtMP = 1 AP → muchos clientes (SXTsq sectorial)",
          "El BW en PtMP se divide entre todos los clientes",
          "Siempre necesitas LOS (línea de visión) para 5 GHz",
        ],
        diagram: "ptp",
      },
      {
        id: "l2-3",
        title: "Señal: RSSI, CCQ y Calidad de Enlace",
        duration: "6 min",
        content: `Cuando trabajas con equipos inalámbricos, debes interpretar los indicadores de calidad de la señal.

**RSSI (Received Signal Strength Indicator) — Potencia de señal:**
Se mide en **dBm** (números negativos). Mientras más cercano a 0, mejor.

| RSSI | Calidad |
|------|---------|
| -50 a -60 dBm | Excelente |
| -60 a -70 dBm | Buena |
| -70 a -80 dBm | Aceptable |
| < -80 dBm | Mala |

**CCQ (Client Connection Quality) — Eficiencia:**
- Porcentaje del 0 al 100%
- Indica qué tan eficiente es la transmisión
- Por debajo del 80% empieza a haber problemas
- Por debajo del 60% el enlace está en mal estado

**Noise Floor — Ruido de fondo:**
- También en dBm, normalmente entre -90 y -95 dBm
- Si el ruido sube (se acerca a 0), hay interferencia
- La diferencia entre señal y ruido se llama **SNR (Signal-to-Noise Ratio)**
- Un buen SNR es mayor a 20 dB

**Reglas prácticas:**
- RSSI > -70 dBm y CCQ > 85% = enlace saludable ✅
- RSSI < -80 dBm o CCQ < 70% = revisar alineación o interferencia ⚠️`,
        keyPoints: [
          "RSSI: potencia en dBm, mejor cercano a 0 (-55 ideal)",
          "CCQ >85% = enlace sano, <70% = problema",
          "Noise Floor bajo (ej: -95) = sin interferencias",
          "SNR = señal - ruido, debe ser >20 dB",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 3 — Equipos MikroTik
  // ─────────────────────────────────────────────────────────────
  {
    id: "mod-3",
    slug: "equipos-mikrotik",
    title: "Equipos MikroTik",
    subtitle: "Fichas técnicas y usos de nuestros equipos principales",
    icon: "Router",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    lessons: [
      {
        id: "l3-1",
        title: "MikroTik LHG — Enlace de Largo Alcance",
        duration: "7 min",
        content: `El **MikroTik LHG** (Litebeam High Gain) es un dispositivo de radio compacto con antena parabólica integrada diseñado para un propósito específico: **enlaces punto a punto de largo alcance**.

**Características principales:**
- **Frecuencia:** 5 GHz (banda 802.11ac/a/n)
- **Ganancia de antena:** 24.5 dBi (muy alto)
- **Alcance:** hasta 20 km en condiciones ideales de LOS
- **Potencia de transmisión:** hasta 27 dBm
- **CPU:** QCA9531, 650 MHz
- **RAM:** 64 MB
- **Puertos:** 1x Ethernet 10/100 Mbps
- **PoE:** Pasivo 24V

**¿Para qué lo usamos?**
1. **Backhaul:** Conectar una torre de distribución a nuestra torre principal
2. **CPE de largo alcance:** Cliente alejado con LOS claro (8+ km)

**Instalación:**
El LHG debe apuntar **directamente** hacia su contraparte. Un error de 1° a esa distancia puede ser la diferencia entre -55 dBm y -75 dBm.

**Configuración básica:**
- Se configura en **RouterOS** (mismo sistema que todos los MikroTik)
- Acceso por WebFig (navegador) o Winbox (app escritorio)
- En modo **Bridge** para CPE o **Router** para backhaul

**Truco:** Usa la app **MikroTik** en tu celular para ver el nivel de señal en tiempo real mientras alineas sin necesitar una laptop.`,
        keyPoints: [
          "LHG = 5 GHz, 24.5 dBi, hasta 20 km PtP",
          "Uso: backhaul entre torres o CPE de largo alcance",
          "Requiere alineación precisa (LOS obligatorio)",
          "Alimentación PoE pasivo 24V",
        ],
      },
      {
        id: "l3-2",
        title: "MikroTik SXTsq — Distribución Sectorial",
        duration: "7 min",
        content: `El **MikroTik SXTsq** (SXT Squarish) es un dispositivo diseñado para distribución **punto a multipunto**. Su forma cuadrada y su ángulo de 90° lo convierte en el AP sectorial ideal para ISP de pequeño y mediano tamaño.

**Características principales:**
- **Frecuencia:** 5 GHz (802.11ac)
- **Ganancia:** 17 dBi (sectorial 90°)
- **Tecnología:** Antena MIMO (2×2)
- **CPU:** QCA9531, 650 MHz
- **RAM:** 64 MB
- **Puertos:** 1x Ethernet 10/100 Mbps + PoE in
- **PoE:** Pasivo 24V
- **Potencia TX:** hasta 27 dBm

**¿Para qué lo usamos?**
1. **AP de torre:** Cubrir un sector de 90° desde una torre
2. **CPE en el cliente:** Algunos los usan como receptor en casas

**Configuración como AP (Access Point):**
- Modo: **AP Bridge**
- Protocolo: Nstreme o 802.11
- SSID: nombre del sector (ej: TORRE3-NORTE)
- Seguridad: WPA2-PSK o lista de MACs permitidas

**Configuración como CPE (cliente):**
- Modo: **Station Bridge** o **Station**
- Se conecta al SSID del AP del sector correspondiente

**4 SXTsq por torre = 360° de cobertura:**
Con 4 SXTsq (cada uno cubriendo 90°), puedes dar cobertura completa alrededor de una torre.`,
        keyPoints: [
          "SXTsq = 5 GHz, 90° de apertura, PtMP",
          "4 unidades = cobertura total de 360° en una torre",
          "Modo AP Bridge = distribución, Station = cliente",
          "Protocolo Nstreme de MikroTik mejora performance en PtMP",
        ],
      },
      {
        id: "l3-3",
        title: "MikroTik RB760iGS — El Cerebro de la Torre",
        duration: "8 min",
        content: `El **MikroTik RouterBOARD 760iGS** es el router de nivel profesional que usamos como **núcleo de nuestras torres**. A diferencia de los LHG y SXTsq (que son solo radio), el RB760iGS es un router completo con múltiples puertos.

**Características principales:**
- **CPU:** IPQ-5010, 4 núcleos, 716 MHz
- **RAM:** 256 MB DDR3
- **Puertos:** 5x Gigabit Ethernet (RJ45)
- **Puerto SFP:** 1x SFP (para fibra óptica)
- **Potencia:** 12-57V PoE-in en puerto 1, o adaptador DC

**El puerto SFP es clave:**
Permite conectar **fibra óptica** al router. Así se conecta a la red troncal (backbone) de forma más eficiente y estable que el cobre.

**¿Para qué lo usamos en la torre?**

\`\`\`
Fibra Óptica (SFP)
        ↓
   RB760iGS
   /  |  |  \\
 LHG SXTsq SXTsq SXTsq
(backhaul)(sector1)(sector2)(sector3)
\`\`\`

**Funciones que configura en el RB760iGS:**
1. **Routing:** Dirige el tráfico entre el backbone y los radios
2. **DHCP Server:** Asigna IPs a los equipos de la torre
3. **Firewall:** Protege la red
4. **QoS / Queue Trees:** Control de ancho de banda por cliente
5. **OSPF / BGP:** Protocolos de routing avanzados (nivel avanzado)

**Acceso:**
- WebFig: \`http://[IP-del-router]\` desde el navegador
- Winbox: usando la app de escritorio (descarga en mikrotik.com)
- SSH: por terminal si es necesario`,
        keyPoints: [
          "RB760iGS = router de torre, 5 Giga + 1 SFP fibra",
          "256 MB RAM, CPU quad-core, maneja mucho tráfico",
          "Centro de la torre: conecta fibra con todos los radios",
          "Funciones: DHCP, Firewall, QoS, Routing",
        ],
        diagram: "mikrotik-network",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // MODULE 4 — Operaciones Básicas
  // ─────────────────────────────────────────────────────────────
  {
    id: "mod-4",
    slug: "operaciones-basicas",
    title: "Operaciones Básicas",
    subtitle: "Acceso a equipos, conceptos clave y diagnóstico de fallas",
    icon: "Terminal",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    lessons: [
      {
        id: "l4-1",
        title: "Acceder a Equipos: Winbox y WebFig",
        duration: "8 min",
        content: `Todos los equipos MikroTik corren **RouterOS**, un sistema operativo de red muy potente. Para configurarlos tienes varias herramientas:

**1. Winbox (Recomendado)**
Aplicación de escritorio para Windows (también funciona en Linux/Mac con Wine).

**Ventajas de Winbox:**
- Descubre equipos automáticamente en la red
- Más rápido que WebFig
- Muestra equipos por dirección MAC (útil si no sabes la IP)
- Soporte completo de todas las funciones de RouterOS

**Cómo conectar:**
1. Abre Winbox → clic en "..." (browse) → espera que aparezcan equipos
2. Haz clic en la dirección MAC del equipo → **Connect**
3. Usuario por default: \`admin\` | Contraseña: *(vacía o la que pusiste)*

**2. WebFig (Navegador)**
Acceso desde cualquier navegador sin instalar nada.

**Cómo conectar:**
1. Conecta tu PC a la red del equipo
2. Abre: \`http://192.168.88.1\` (IP por defecto de MikroTik)
3. Usuario: \`admin\` | Contraseña: (vacía)

**Interfaces importantes en RouterOS:**
| Sección | Para qué sirve |
|---------|--------------|
| **Quick Set** | Configuración básica rápida |
| **Wireless** | Ver y configurar radios |
| **IP > DHCP Server** | Asignación automática de IPs |
| **IP > Addresses** | Ver/agregar IPs a interfaces |
| **Tools > Ping** | Probar conectividad |
| **Tools > Spectrum Scan** | Ver interferencias en el medio |

**IP por defecto MikroTik:** \`192.168.88.1\`
**Credenciales por defecto:** admin / (sin contraseña)
> ⚠️ Siempre cambia la contraseña al instalar un equipo nuevo.`,
        keyPoints: [
          "Winbox = app escritorio, descubre por MAC, más completo",
          "WebFig = navegador, http://192.168.88.1",
          "Credenciales default: admin / (vacío)",
          "¡Cambia siempre la contraseña al instalar!",
        ],
        videoUrl: "https://www.youtube.com/embed/hpGjfnNxFJM",
      },
      {
        id: "l4-2",
        title: "DHCP y NAT — Cómo fluye el Internet",
        duration: "7 min",
        content: `**DHCP (Dynamic Host Configuration Protocol)**
Protocolo que asigna automáticamente una IP a cada dispositivo que se conecta a una red.

**¿Cómo funciona?**
1. El cliente se conecta y dice: "¡Hola! Necesito una IP"
2. El servidor DHCP responde: "Tu IP es 192.168.1.50, tu gateway es 192.168.1.1, tu DNS es 8.8.8.8"
3. El cliente usa esa IP hasta que expira el lease (tiempo de alquiler)

**En nuestras torres:**
El RB760iGS actúa como servidor DHCP para los equipos de la torre. Los clientes finales reciben IP del pool que asignamos para ese sector.

---

**NAT (Network Address Translation)**
Mecanismo que permite que múltiples dispositivos con IPs privadas salgan a Internet usando una sola IP pública.

**¿Por qué lo necesitamos?**
Las IPs públicas son limitadas y caras. Con NAT, un cliente con IP privada \`10.10.1.50\` puede navegar usando tu IP pública \`200.55.60.70\`.

**Masquerade en MikroTik:**
Es el tipo de NAT más común en RouterOS:
\`\`\`
IP → Firewall → NAT → Action: masquerade
Out interface: [interfaz WAN/fibra]
\`\`\`
Esto hace que todo el tráfico saliente use la IP pública de la interfaz WAN.

**Flujo completo:**
\`\`\`
Celular del cliente (192.168.1.50)
    → Router cliente (NAT local)
    → Tu red (10.10.x.x)
    → RB760iGS de torre (NAT o routing)
    → Tu NOC / backbone
    → Internet (IP Pública)
\`\`\``,
        keyPoints: [
          "DHCP asigna IPs automáticamente a clientes",
          "NAT permite que IPs privadas salgan a Internet",
          "En MikroTik: IP > Firewall > NAT > Masquerade",
          "Lease = tiempo que el cliente conserva su IP asignada",
        ],
        diagram: "dhcp",
      },
      {
        id: "l4-3",
        title: "Diagnóstico de Fallas — Paso a Paso",
        duration: "10 min",
        content: `Cuando un cliente reporta que no tiene Internet, sigue este proceso sistemático:

**Paso 1 — Verificar la señal (Capa 1 y 2)**
- Conéctate al equipo del cliente via Winbox/WebFig
- Ve a **Wireless → Registration Table**
- Verifica: RSSI > -75 dBm, CCQ > 80%
- Si la señal está mal: **revisar alineación**, obstáculos nuevos (árbol creció, construcción), o el equipo se movió

**Paso 2 — Verificar la IP (Capa 3)**
- En el equipo del cliente: **IP → Addresses**
- ¿Tiene dirección IP asignada? Si no: problema de DHCP
- Desde el equipo: **Tools → Ping → 8.8.8.8**
- ¿Hace ping? → el problema puede ser DNS
- Prueba con IP directa: \`ping 8.8.8.8\` y luego \`ping google.com\`

**Paso 3 — Verificar en el AP de la Torre**
- Conéctate al SXTsq (AP del sector)
- Ve a **Wireless → Registration**: ¿aparece el cliente?
- Si no aparece: el cliente no está asociado al AP
- Si aparece pero sin tráfico: revisar puentes (bridge) y firewall

**Paso 4 — Verificar el RB760iGS**
- Ping desde el router hacia el cliente y hacia el uplink/fibra
- Ver tablas de routing: **IP → Routes**
- Ver si hay logs de errores: **Log**

**Paso 5 — El uplink/backbone**
Si todo los pasos anteriores están bien, el problema es aguas arriba:
- ¿Está caída la fibra?
- ¿Tiene el RB760iGS conectividad hacia arriba?
- Comunicarse con el NOC principal

**Tabla de diagnóstico rápido:**
| Síntoma | Causa probable | Acción |
|---------|---------------|--------|
| Sin señal (RSSI 0) | Equipo apagado o alineación | Verificar físicamente |
| Señal baja (<-80) | Obstáculo o equipo movido | Realinear |
| Señal OK, sin IP | DHCP no funciona | Revisar DHCP server |
| IP OK, sin ping | Firewall o NAT | Revisar reglas |
| Ping OK, sin web | DNS | Cambiar DNS a 8.8.8.8 |`,
        keyPoints: [
          "Siempre empieza por la señal (RSSI y CCQ)",
          "Luego verifica la IP → ping a 8.8.8.8 → ping a google.com",
          "Sin señal = problema físico (alineación, obstáculo, energía)",
          "Sin IP = problema DHCP | Sin web = posible DNS",
        ],
      },
    ],
  },
];

export function getModuleBySlug(slug: string): TrainingModule | undefined {
  return curriculum.find((m) => m.slug === slug);
}

export function getLessonById(moduleSlug: string, lessonId: string): Lesson | undefined {
  const module = getModuleBySlug(moduleSlug);
  return module?.lessons.find((l) => l.id === lessonId);
}

export const totalLessons = curriculum.reduce((acc, m) => acc + m.lessons.length, 0);
