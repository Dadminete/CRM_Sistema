"use client";

import { useEffect, useState } from "react";

import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PAYMENT_REMINDER, type PaymentReminder, paymentReminderSchema } from "@/lib/payment-reminder";

export default function PaymentReminderEditor() {
  const [reminder, setReminder] = useState<PaymentReminder>(DEFAULT_PAYMENT_REMINDER);
  const [bankIds, setBankIds] = useState(() => DEFAULT_PAYMENT_REMINDER.banks.map((_, index) => `bank-${index}`));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadReminder = async () => {
      try {
        const response = await fetch("/api/recordatorio-pago", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "No se pudo cargar el recordatorio.");
        }
        setReminder(result.data);
        setBankIds(result.data.banks.map((_: PaymentReminder["banks"][number], index: number) => `bank-${index}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al cargar los datos.";
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadReminder();
  }, []);

  const updateReminder = <K extends keyof PaymentReminder>(key: K, value: PaymentReminder[K]) => {
    setReminder((current) => ({ ...current, [key]: value }));
  };

  const updateBank = (index: number, field: keyof PaymentReminder["banks"][number], value: string) => {
    setReminder((current) => ({
      ...current,
      banks: current.banks.map((bank, bankIndex) => {
        if (bankIndex !== index) return bank;

        return {
          ...bank,
          name: field === "name" ? value : bank.name,
          accountNumber: field === "accountNumber" ? value : bank.accountNumber,
          accountType: field === "accountType" ? value : bank.accountType,
          owner: field === "owner" ? value : bank.owner,
          cedula: field === "cedula" ? value : bank.cedula,
          iban: field === "iban" ? value : bank.iban,
        };
      }),
    }));
  };

  const saveReminder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = paymentReminderSchema.safeParse(reminder);
    if (!parsed.success) {
      toast.error("Completa los campos obligatorios y verifica que haya al menos una cuenta.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/recordatorio-pago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "No se pudieron guardar los cambios.");
      }
      setReminder(result.data);
      toast.success("Recordatorio actualizado correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-6 text-center">Cargando información de pago...</div>;
  }

  if (loadError) {
    return (
      <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-4 p-6 text-center">
        <p className="text-destructive">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Intentar nuevamente
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={saveReminder} className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recordatorio de pago</h1>
          <p className="text-muted-foreground mt-1">Edita el texto y las cuentas que aparecen en la página pública.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <a href="/pagos" target="_blank" rel="noreferrer">
              Ver página pública
            </a>
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Mensaje para los clientes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="greeting">Saludo</Label>
            <Input
              id="greeting"
              maxLength={160}
              value={reminder.greeting}
              onChange={(event) => updateReminder("greeting", event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Recordatorio</Label>
            <Textarea
              id="message"
              maxLength={2000}
              rows={4}
              value={reminder.message}
              onChange={(event) => updateReminder("message", event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instruction">Instrucción adicional</Label>
            <Textarea
              id="instruction"
              maxLength={1000}
              rows={3}
              value={reminder.instruction}
              onChange={(event) => updateReminder("instruction", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Cuentas bancarias</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              updateReminder("banks", [
                ...reminder.banks,
                { name: "", accountNumber: "", accountType: "", owner: "", cedula: "", iban: "" },
              ]);
              setBankIds((current) => [...current, crypto.randomUUID()]);
            }}
            disabled={reminder.banks.length >= 20}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Agregar cuenta
          </Button>
        </div>

        {reminder.banks.map((bank, index) => {
          const bankId = bankIds.at(index);
          if (!bankId) return null;

          return (
            <Card key={bankId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{bank.name || `Cuenta ${index + 1}`}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar cuenta ${bank.name || index + 1}`}
                  onClick={() => {
                    updateReminder(
                      "banks",
                      reminder.banks.filter((_, bankIndex) => bankIndex !== index),
                    );
                    setBankIds((current) => current.filter((_, keyIndex) => keyIndex !== index));
                  }}
                  disabled={reminder.banks.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`bank-name-${index}`}>Banco</Label>
                  <Input
                    id={`bank-name-${index}`}
                    maxLength={100}
                    value={bank.name}
                    onChange={(event) => updateBank(index, "name", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`bank-account-${index}`}>Número de cuenta</Label>
                  <Input
                    id={`bank-account-${index}`}
                    maxLength={100}
                    value={bank.accountNumber}
                    onChange={(event) => updateBank(index, "accountNumber", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`bank-type-${index}`}>Tipo de cuenta</Label>
                  <Input
                    id={`bank-type-${index}`}
                    maxLength={100}
                    value={bank.accountType}
                    onChange={(event) => updateBank(index, "accountType", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`bank-owner-${index}`}>Titular</Label>
                  <Input
                    id={`bank-owner-${index}`}
                    maxLength={160}
                    value={bank.owner}
                    onChange={(event) => updateBank(index, "owner", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`bank-cedula-${index}`}>Cédula del titular</Label>
                  <Input
                    id={`bank-cedula-${index}`}
                    maxLength={40}
                    value={bank.cedula}
                    onChange={(event) => updateBank(index, "cedula", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`bank-iban-${index}`}>IBAN (opcional)</Label>
                  <Input
                    id={`bank-iban-${index}`}
                    maxLength={100}
                    value={bank.iban}
                    onChange={(event) => updateBank(index, "iban", event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
