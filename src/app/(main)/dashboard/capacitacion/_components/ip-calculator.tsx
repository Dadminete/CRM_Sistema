"use client";

import { useState, useMemo } from "react";

import { Calculator } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// CIDR prefix → { mask, hosts, usableHosts }
const CIDR_TABLE: Record<number, { mask: string; hosts: number }> = {
  8: { mask: "255.0.0.0", hosts: 16777214 },
  16: { mask: "255.255.0.0", hosts: 65534 },
  24: { mask: "255.255.255.0", hosts: 254 },
  25: { mask: "255.255.255.128", hosts: 126 },
  26: { mask: "255.255.255.192", hosts: 62 },
  27: { mask: "255.255.255.224", hosts: 30 },
  28: { mask: "255.255.255.240", hosts: 14 },
  29: { mask: "255.255.255.248", hosts: 6 },
  30: { mask: "255.255.255.252", hosts: 2 },
  32: { mask: "255.255.255.255", hosts: 1 },
};

const POPULAR_CIDRS = [8, 16, 24, 25, 26, 27, 28, 29, 30, 32];

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return (nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3];
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

function maskFromCidr(cidr: number): number {
  return cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
}

export function IpCalculator() {
  const [ipInput, setIpInput] = useState("192.168.1.0");
  const [cidr, setCidr] = useState(24);

  const result = useMemo(() => {
    const ipInt = ipToInt(ipInput);
    if (ipInt === null) return null;

    const mask = maskFromCidr(cidr);
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const firstHost = cidr < 31 ? network + 1 : network;
    const lastHost = cidr < 31 ? broadcast - 1 : broadcast;
    const totalHosts = cidr >= 31 ? Math.pow(2, 32 - cidr) : Math.pow(2, 32 - cidr) - 2;
    const maskStr = CIDR_TABLE[cidr]?.mask || intToIp(mask);

    return {
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      mask: maskStr,
      firstHost: intToIp(firstHost),
      lastHost: intToIp(lastHost),
      totalHosts: Math.max(0, totalHosts),
      cidr,
    };
  }, [ipInput, cidr]);

  const rows = result
    ? [
        { label: "Dirección de Red", value: `${result.network}/${result.cidr}`, color: "text-blue-600" },
        { label: "Máscara", value: result.mask, color: "text-violet-600" },
        { label: "Primer Host", value: result.firstHost, color: "text-emerald-600" },
        { label: "Último Host", value: result.lastHost, color: "text-emerald-600" },
        { label: "Broadcast", value: result.broadcast, color: "text-rose-600" },
        { label: "Hosts Disponibles", value: result.totalHosts.toLocaleString(), color: "text-amber-600" },
      ]
    : [];

  return (
    <div className="bg-card space-y-4 rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-violet-500/10 p-2">
          <Calculator className="h-4 w-4 text-violet-600" />
        </div>
        <h4 className="text-sm font-semibold">Calculadora de Subnetting</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">Dirección IP</Label>
          <Input
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="192.168.1.0"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">Prefijo CIDR</Label>
          <Select value={String(cidr)} onValueChange={(v) => setCidr(Number(v))}>
            <SelectTrigger className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_CIDRS.map((c) => (
                <SelectItem key={c} value={String(c)} className="font-mono">
                  /{c} — {CIDR_TABLE[c]?.hosts.toLocaleString() ?? "?"} hosts
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {result ? (
        <div className="bg-muted/30 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="text-muted-foreground px-3 py-2 text-xs font-medium">{r.label}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${r.color}`}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-muted-foreground py-4 text-center text-sm">Ingresa una IP válida (ej: 192.168.1.0)</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Enlace PtP", ip: "10.0.0.0", cidr: 30 },
          { label: "Red de gestión", ip: "10.10.0.0", cidr: 24 },
          { label: "Clientes", ip: "192.168.1.0", cidr: 24 },
          { label: "AM pequeña", ip: "172.16.0.0", cidr: 28 },
        ].map((ex) => (
          <button
            key={ex.label}
            onClick={() => {
              setIpInput(ex.ip);
              setCidr(ex.cidr);
            }}
            className="bg-background hover:bg-muted rounded-full border px-2.5 py-1 text-xs transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
