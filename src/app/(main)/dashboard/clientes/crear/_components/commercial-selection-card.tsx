import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PlanOption = {
  id: string;
  nombre: string;
  precio: string | number | null;
  moneda: string;
  bajadaMbps: number;
};

export type ServiceOption = {
  id: string;
  nombre: string;
  descripcionCorta: string | null;
  precioBase: string | number | null;
  moneda: string;
};

type CommercialSelectionCardProps = {
  plans: PlanOption[];
  services: ServiceOption[];
  selectedPlanId: string;
  selectedServiceIds: string[];
  isLoading: boolean;
  onPlanChange: (planId: string) => void;
  onToggleService: (serviceId: string, checked: boolean) => void;
  onClear: () => void;
};

export function CommercialSelectionCard({
  plans,
  services,
  selectedPlanId,
  selectedServiceIds,
  isLoading,
  onPlanChange,
  onToggleService,
  onClear,
}: CommercialSelectionCardProps) {
  return (
    <Card className="ring-border/60 overflow-hidden border-none shadow-md ring-1">
      <CardHeader className="bg-muted/5 border-b">
        <CardTitle className="text-xl">Plan y servicios adicionales</CardTitle>
        <CardDescription>Selecciona internet principal y addons como CCTV o streaming.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan de internet</Label>
            <Select
              value={selectedPlanId || "none"}
              onValueChange={(value) => onPlanChange(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin plan inicial</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.nombre} - {plan.precio ?? "0"} {plan.moneda} ({plan.bajadaMbps} Mbps)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Servicios adicionales</Label>
            <div className="border-border/60 max-h-48 space-y-3 overflow-auto rounded-md border p-3">
              {services.length === 0 && !isLoading && (
                <p className="text-muted-foreground text-sm">No hay servicios adicionales disponibles.</p>
              )}
              {services.map((service) => {
                const isChecked = selectedServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className="hover:bg-muted/40 flex cursor-pointer items-start gap-2 rounded p-1"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => onToggleService(service.id, checked === true)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{service.nombre}</span>
                      <span className="text-muted-foreground text-xs">
                        {`${service.descripcionCorta ?? "Servicio adicional"} - ${service.precioBase ?? "0"} ${service.moneda}`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-muted-foreground">
            Seleccion actual: {selectedPlanId ? "1 plan" : "sin plan"} y {selectedServiceIds.length} servicios.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!selectedPlanId && selectedServiceIds.length === 0}
          >
            Limpiar seleccion comercial
          </Button>
        </div>
        {isLoading && <p className="text-muted-foreground text-sm">Cargando planes y servicios...</p>}
      </CardContent>
    </Card>
  );
}
