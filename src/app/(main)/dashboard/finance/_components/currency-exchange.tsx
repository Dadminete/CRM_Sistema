"use client";

import * as React from "react";

import { ArrowLeftRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

function CurrencySelector(props: { defaultValue: string }) {
  return (
    <Select defaultValue={props.defaultValue}>
      <SelectTrigger size="sm" className="border-none shadow-none outline-none focus-visible:ring-0">
        <SelectValue placeholder="Moneda" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="usd">USD</SelectItem>
        <SelectItem value="eur">EUR</SelectItem>
        <SelectItem value="gbp">GBP</SelectItem>
        <SelectItem value="aed">AED</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function CurrencyExchange() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cambio de Divisas</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <RefreshCw className="text-muted-foreground animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambio de Divisas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <div className="border-b px-4 py-2">
            <div className="flex justify-between">
              <div className="flex flex-1 justify-center">
                <CurrencySelector defaultValue="usd" />
              </div>
              <Separator orientation="vertical" className="!h-auto" />
              <div className="flex flex-1 items-center justify-center">
                <ArrowLeftRight className="text-muted-foreground size-4" />
              </div>
              <Separator orientation="vertical" className="!h-auto" />
              <div className="flex flex-1 justify-center">
                <CurrencySelector defaultValue="eur" />
              </div>
            </div>
          </div>
          <div className="space-y-2 py-6 text-center tabular-nums">
            <p className="text-4xl">{formatCurrency(100.0)}</p>
            <p className="text-muted-foreground text-xs font-medium">
              Disponible: <span className="text-foreground">{formatCurrency(13100.06)}</span>
            </p>
          </div>
          <div className="bg-muted border-t py-1 text-center text-xs tabular-nums">
            <span className="text-muted-foreground">1 USD = </span> 0.85 EUR
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span>Impuesto (2%)</span>
            <span className="font-medium tabular-nums">{formatCurrency(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Comisión de Cambio (1%)</span>
            <span className="font-medium tabular-nums">{formatCurrency(1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Monto Total</span>
            <span className="font-medium">{formatCurrency(82.77, { currency: "EUR" })}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full">
          <RefreshCw /> Cambiar
        </Button>
      </CardContent>
    </Card>
  );
}
