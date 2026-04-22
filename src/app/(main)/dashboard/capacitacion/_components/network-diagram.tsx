"use client";

// ─────────────────────────────────────────────────────────────
//  Interactive Network Diagrams — SVG-based, animated
// ─────────────────────────────────────────────────────────────

import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── OSI Model Diagram ─────────────────────────────────────
const OSI_LAYERS = [
  {
    num: 7,
    name: "Aplicación",
    desc: "HTTP, DNS, FTP, SMTP",
    color: "bg-rose-500",
    textColor: "text-rose-700",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    tag: "App",
  },
  {
    num: 6,
    name: "Presentación",
    desc: "SSL/TLS, Cifrado",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    tag: "App",
  },
  {
    num: 5,
    name: "Sesión",
    desc: "NetBIOS, PPTP",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    tag: "App",
  },
  {
    num: 4,
    name: "Transporte",
    desc: "TCP, UDP — Puertos",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800",
    tag: "Host",
  },
  {
    num: 3,
    name: "Red",
    desc: "IP, OSPF, BGP — Routing",
    color: "bg-lime-500",
    textColor: "text-lime-700",
    bg: "bg-lime-50 dark:bg-lime-950/30",
    border: "border-lime-200 dark:border-lime-800",
    tag: "Host",
  },
  {
    num: 2,
    name: "Enlace de Datos",
    desc: "Ethernet, WiFi, PPPoE, MACs",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    tag: "Media",
  },
  {
    num: 1,
    name: "Física",
    desc: "Cables, radio, fibra, señal",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    tag: "Media",
  },
];

export function OsiDiagram() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">Haz clic en cada capa para ver más detalles.</p>
      <div className="space-y-1.5">
        {OSI_LAYERS.map((layer) => (
          <div
            key={layer.num}
            onClick={() => setActive(active === layer.num ? null : layer.num)}
            className={cn(
              "cursor-pointer rounded-lg border p-3 transition-all duration-200",
              layer.bg,
              layer.border,
              active === layer.num ? "scale-[1.01] shadow-md" : "hover:scale-[1.005] hover:shadow-sm",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white",
                  layer.color,
                )}
              >
                {layer.num}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", layer.textColor)}>{layer.name}</span>
                  <span className="text-muted-foreground rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase dark:bg-white/10">
                    {layer.tag}
                  </span>
                </div>
                {active === layer.num && <p className="text-muted-foreground mt-1 text-xs">{layer.desc}</p>}
              </div>
              {active !== layer.num && (
                <span className="text-muted-foreground hidden text-xs sm:block">{layer.desc}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground flex items-center gap-4 pt-1 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> Capas de Aplicación
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Capas de Host
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Capas de Medio
        </span>
      </div>
    </div>
  );
}

// ─── Network Topologies Diagram ───────────────────────────
export function TopologiesDiagram() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* LAN */}
      <div className="bg-card space-y-3 rounded-xl border p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Red LAN (Casa del cliente)
        </h4>
        <svg viewBox="0 0 200 130" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Router */}
          <rect x="75" y="10" width="50" height="30" rx="6" fill="#3b82f6" opacity="0.9" />
          <text x="100" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
            Router
          </text>
          {/* Switch */}
          <rect x="75" y="60" width="50" height="25" rx="5" fill="#8b5cf6" opacity="0.9" />
          <text x="100" y="76" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
            Switch
          </text>
          {/* Line router to switch */}
          <line x1="100" y1="40" x2="100" y2="60" stroke="#64748b" strokeWidth="2" />
          {/* Devices */}
          <circle cx="40" cy="110" r="12" fill="#10b981" opacity="0.85" />
          <text x="40" y="114" textAnchor="middle" fill="white" fontSize="7">
            PC
          </text>
          <circle cx="100" cy="110" r="12" fill="#10b981" opacity="0.85" />
          <text x="100" y="114" textAnchor="middle" fill="white" fontSize="7">
            Cel
          </text>
          <circle cx="160" cy="110" r="12" fill="#10b981" opacity="0.85" />
          <text x="160" y="114" textAnchor="middle" fill="white" fontSize="7">
            TV
          </text>
          {/* Lines switch to devices */}
          <line x1="85" y1="85" x2="52" y2="98" stroke="#64748b" strokeWidth="1.5" />
          <line x1="100" y1="85" x2="100" y2="98" stroke="#64748b" strokeWidth="1.5" />
          <line x1="115" y1="85" x2="148" y2="98" stroke="#64748b" strokeWidth="1.5" />
        </svg>
        <p className="text-muted-foreground text-xs">
          Red local. El router conecta todos los dispositivos del cliente.
        </p>
      </div>

      {/* ISP Network */}
      <div className="bg-card space-y-3 rounded-xl border p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Red ISP (Nuestra infraestructura)
        </h4>
        <svg viewBox="0 0 200 130" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Internet */}
          <ellipse cx="100" cy="15" rx="35" ry="12" fill="#f59e0b" opacity="0.9" />
          <text x="100" y="19" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            INTERNET
          </text>
          {/* NOC */}
          <rect x="70" y="38" width="60" height="22" rx="5" fill="#3b82f6" opacity="0.9" />
          <text x="100" y="53" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            NOC / RB760
          </text>
          {/* Line internet to NOC */}
          <line x1="100" y1="27" x2="100" y2="38" stroke="#64748b" strokeWidth="2" />
          {/* Towers */}
          <rect x="20" y="75" width="50" height="20" rx="4" fill="#8b5cf6" opacity="0.85" />
          <text x="45" y="88" textAnchor="middle" fill="white" fontSize="7">
            Torre Norte
          </text>
          <rect x="130" y="75" width="50" height="20" rx="4" fill="#8b5cf6" opacity="0.85" />
          <text x="155" y="88" textAnchor="middle" fill="white" fontSize="7">
            Torre Sur
          </text>
          {/* Lines NOC to towers */}
          <line x1="90" y1="60" x2="55" y2="75" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="110" y1="60" x2="145" y2="75" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Clients */}
          <circle cx="25" cy="118" r="8" fill="#10b981" opacity="0.8" />
          <circle cx="45" cy="118" r="8" fill="#10b981" opacity="0.8" />
          <circle cx="135" cy="118" r="8" fill="#10b981" opacity="0.8" />
          <circle cx="155" cy="118" r="8" fill="#10b981" opacity="0.8" />
          <circle cx="175" cy="118" r="8" fill="#10b981" opacity="0.8" />
          <line x1="35" y1="95" x2="25" y2="110" stroke="#64748b" strokeWidth="1.2" />
          <line x1="45" y1="95" x2="45" y2="110" stroke="#64748b" strokeWidth="1.2" />
          <line x1="145" y1="95" x2="135" y2="110" stroke="#64748b" strokeWidth="1.2" />
          <line x1="155" y1="95" x2="155" y2="110" stroke="#64748b" strokeWidth="1.2" />
          <line x1="165" y1="95" x2="175" y2="110" stroke="#64748b" strokeWidth="1.2" />
        </svg>
        <p className="text-muted-foreground text-xs">Nuestra red: Internet → NOC → Torres → Clientes.</p>
      </div>
    </div>
  );
}

// ─── PtP / PtMP Diagram ───────────────────────────────────
export function PtpDiagram() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* PtP */}
      <div className="bg-card space-y-3 rounded-xl border p-4">
        <h4 className="text-sm font-semibold text-blue-600">Punto a Punto (PtP)</h4>
        <svg viewBox="0 0 220 100" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Tower A */}
          <rect x="10" y="30" width="55" height="40" rx="6" fill="#3b82f6" opacity="0.9" />
          <text x="37" y="53" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            Torre NOC
          </text>
          <text x="37" y="65" textAnchor="middle" fill="white" fontSize="7">
            LHG
          </text>
          {/* Beam */}
          <line x1="65" y1="50" x2="155" y2="50" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
          {/* Signal waves */}
          <text x="110" y="44" textAnchor="middle" fill="#f59e0b" fontSize="10">
            ⟶
          </text>
          <text x="110" y="60" textAnchor="middle" fill="#f59e0b" fontSize="9" fontStyle="italic">
            5 GHz
          </text>
          {/* Tower B */}
          <rect x="155" y="30" width="55" height="40" rx="6" fill="#8b5cf6" opacity="0.9" />
          <text x="182" y="53" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            Torre B
          </text>
          <text x="182" y="65" textAnchor="middle" fill="white" fontSize="7">
            LHG
          </text>
          {/* Distance */}
          <text x="110" y="90" textAnchor="middle" fill="#64748b" fontSize="8">
            Distancia: 1 – 20 km
          </text>
        </svg>
        <p className="text-muted-foreground text-xs">
          Dos equipos comunicados directamente. Todo el ancho de banda es para ese enlace.
        </p>
      </div>
      {/* PtMP */}
      <div className="bg-card space-y-3 rounded-xl border p-4">
        <h4 className="text-sm font-semibold text-emerald-600">Punto a Multipunto (PtMP)</h4>
        <svg viewBox="0 0 220 110" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Central AP */}
          <rect x="80" y="5" width="60" height="35" rx="6" fill="#10b981" opacity="0.9" />
          <text x="110" y="24" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            SXTsq AP
          </text>
          <text x="110" y="34" textAnchor="middle" fill="white" fontSize="7">
            (90° sector)
          </text>
          {/* Beams to clients */}
          <line x1="90" y1="40" x2="30" y2="80" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="100" y1="40" x2="80" y2="82" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="110" y1="40" x2="110" y2="82" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="120" y1="40" x2="140" y2="82" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="130" y1="40" x2="190" y2="80" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Clients */}
          {[30, 80, 110, 140, 190].map((cx, i) => (
            <g key={i}>
              <circle cx={cx} cy={i === 0 || i === 4 ? 88 : 90} r="10" fill="#3b82f6" opacity="0.85" />
              <text x={cx} y={i === 0 || i === 4 ? 92 : 94} textAnchor="middle" fill="white" fontSize="7">
                C{i + 1}
              </text>
            </g>
          ))}
          <text x="110" y="108" textAnchor="middle" fill="#64748b" fontSize="8">
            BW compartido entre clientes
          </text>
        </svg>
        <p className="text-muted-foreground text-xs">
          Un AP atiende a múltiples clientes. El ancho de banda se divide entre todos.
        </p>
      </div>
    </div>
  );
}

// ─── DHCP / NAT Flow Diagram ──────────────────────────────
export function DhcpDiagram() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: "1. Cliente pide IP", color: "bg-blue-500" },
    { label: "2. DHCP responde", color: "bg-emerald-500" },
    { label: "3. Cliente tiene IP", color: "bg-violet-500" },
    { label: "4. NAT al salir a Internet", color: "bg-amber-500" },
  ];
  return (
    <div className="space-y-4">
      {/* Step selector */}
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              step === i ? `${s.color} text-white shadow-sm` : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Visualization */}
      <div className="bg-card rounded-xl border p-4">
        <svg viewBox="0 0 320 100" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Client */}
          <rect x="5" y="30" width="55" height="40" rx="6" fill={step >= 0 ? "#3b82f6" : "#94a3b8"} opacity="0.9" />
          <text x="32" y="53" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            Cliente
          </text>
          <text x="32" y="63" textAnchor="middle" fill="white" fontSize="7">
            {step >= 2 ? "192.168.1.50" : "Sin IP"}
          </text>
          {/* Arrow to DHCP */}
          {step === 0 && (
            <line x1="60" y1="50" x2="100" y2="50" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
          )}
          {step === 1 && <line x1="100" y1="55" x2="60" y2="55" stroke="#10b981" strokeWidth="2" />}
          {/* DHCP Server */}
          <rect x="100" y="30" width="60" height="40" rx="6" fill={step >= 1 ? "#10b981" : "#94a3b8"} opacity="0.9" />
          <text x="130" y="48" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            DHCP
          </text>
          <text x="130" y="60" textAnchor="middle" fill="white" fontSize="7">
            RB760iGS
          </text>
          {/* Arrow to NAT */}
          {step === 3 && <line x1="160" y1="50" x2="200" y2="50" stroke="#f59e0b" strokeWidth="2" />}
          {/* NAT */}
          <rect x="200" y="30" width="55" height="40" rx="6" fill={step >= 3 ? "#f59e0b" : "#94a3b8"} opacity="0.9" />
          <text x="227" y="48" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            NAT
          </text>
          <text x="227" y="60" textAnchor="middle" fill="white" fontSize="7">
            Masquerade
          </text>
          {/* Internet */}
          {step === 3 && <line x1="255" y1="50" x2="295" y2="50" stroke="#f59e0b" strokeWidth="2" />}
          <ellipse cx="310" cy="50" rx="20" ry="14" fill={step === 3 ? "#ef4444" : "#94a3b8"} opacity="0.85" />
          <text x="310" y="54" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
            NET
          </text>
          {/* Step description */}
          <text x="160" y="95" textAnchor="middle" fill="#64748b" fontSize="8">
            {steps[step].label}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── IP Subnet Visual ─────────────────────────────────────
export function IpDiagram() {
  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <h4 className="text-sm font-semibold">Anatomía de una dirección IP</h4>
      <div className="text-foreground bg-muted rounded-lg py-3 text-center font-mono text-lg font-bold tracking-wider">
        <span className="text-blue-600">192.168</span>
        <span className="text-foreground">.</span>
        <span className="text-emerald-600">1</span>
        <span className="text-foreground">.</span>
        <span className="text-violet-600">100</span>
        <span className="text-muted-foreground"> /24</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="font-bold text-blue-700 dark:text-blue-300">192.168</div>
          <div className="text-muted-foreground">Red principal</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="font-bold text-emerald-700 dark:text-emerald-300">1</div>
          <div className="text-muted-foreground">Subred</div>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-2 dark:border-violet-800 dark:bg-violet-950/30">
          <div className="font-bold text-violet-700 dark:text-violet-300">100</div>
          <div className="text-muted-foreground">Host (dispositivo)</div>
        </div>
      </div>
      <div className="text-muted-foreground text-center text-xs">
        /24 = 254 hosts disponibles · Gateway: 192.168.1.1 · Broadcast: 192.168.1.255
      </div>
    </div>
  );
}

// ─── MikroTik Network Diagram ──────────────────────────────
export function MikrotikNetworkDiagram() {
  return (
    <div className="bg-card rounded-xl border p-4">
      <h4 className="mb-3 text-sm font-semibold">Arquitectura típica de torre MikroTik</h4>
      <svg viewBox="0 0 320 180" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Fiber/Internet */}
        <ellipse cx="160" cy="15" rx="50" ry="12" fill="#f59e0b" opacity="0.9" />
        <text x="160" y="19" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
          Fibra / Internet
        </text>
        <line x1="160" y1="27" x2="160" y2="48" stroke="#64748b" strokeWidth="2" />
        <text x="175" y="40" fill="#64748b" fontSize="7">
          SFP
        </text>

        {/* RB760iGS */}
        <rect x="100" y="48" width="120" height="32" rx="7" fill="#6366f1" opacity="0.95" />
        <text x="160" y="62" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
          RB760iGS
        </text>
        <text x="160" y="74" textAnchor="middle" fill="white" fontSize="7">
          Router de Torre
        </text>

        {/* Lines to radios */}
        <line x1="130" y1="80" x2="50" y2="115" stroke="#64748b" strokeWidth="1.8" />
        <line x1="145" y1="80" x2="115" y2="115" stroke="#64748b" strokeWidth="1.8" />
        <line x1="160" y1="80" x2="160" y2="115" stroke="#64748b" strokeWidth="1.8" />
        <line x1="175" y1="80" x2="205" y2="115" stroke="#64748b" strokeWidth="1.8" />
        <line x1="190" y1="80" x2="270" y2="115" stroke="#64748b" strokeWidth="1.8" />

        {/* LHG backhaul */}
        <rect x="10" y="115" width="80" height="28" rx="5" fill="#3b82f6" opacity="0.9" />
        <text x="50" y="127" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          LHG
        </text>
        <text x="50" y="137" textAnchor="middle" fill="white" fontSize="7">
          Backhaul PtP
        </text>

        {/* SXTsq sectors */}
        <rect x="95" y="115" width="65" height="28" rx="5" fill="#10b981" opacity="0.9" />
        <text x="127" y="127" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          SXTsq
        </text>
        <text x="127" y="137" textAnchor="middle" fill="white" fontSize="7">
          Sector Norte
        </text>

        <rect x="130" y="115" width="60" height="28" rx="5" fill="#10b981" opacity="0.9" />
        <text x="160" y="127" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          SXTsq
        </text>
        <text x="160" y="137" textAnchor="middle" fill="white" fontSize="7">
          Sector Este
        </text>

        <rect x="165" y="115" width="65" height="28" rx="5" fill="#10b981" opacity="0.9" />
        <text x="197" y="127" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          SXTsq
        </text>
        <text x="197" y="137" textAnchor="middle" fill="white" fontSize="7">
          Sector Sur
        </text>

        <rect x="235" y="115" width="75" height="28" rx="5" fill="#10b981" opacity="0.9" />
        <text x="272" y="127" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
          SXTsq
        </text>
        <text x="272" y="137" textAnchor="middle" fill="white" fontSize="7">
          Sector Oeste
        </text>

        {/* Clients */}
        <text x="50" y="165" textAnchor="middle" fill="#64748b" fontSize="7">
          → Otra torre
        </text>
        <text x="160" y="165" textAnchor="middle" fill="#64748b" fontSize="7">
          → Clientes del sector
        </text>
        <text x="272" y="165" textAnchor="middle" fill="#64748b" fontSize="7">
          → Clientes
        </text>
      </svg>
    </div>
  );
}

// ─── Exported selector ────────────────────────────────────
export function NetworkDiagram({ type }: { type: string }) {
  switch (type) {
    case "osi":
      return <OsiDiagram />;
    case "topologies":
      return <TopologiesDiagram />;
    case "ptp":
      return <PtpDiagram />;
    case "dhcp":
      return <DhcpDiagram />;
    case "ip":
      return <IpDiagram />;
    case "mikrotik-network":
      return <MikrotikNetworkDiagram />;
    default:
      return null;
  }
}
