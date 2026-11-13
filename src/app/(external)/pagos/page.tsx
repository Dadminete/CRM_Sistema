import type { Metadata } from "next";

import { Banknote, Building2, CircleCheck } from "lucide-react";

import { getPaymentReminder } from "@/lib/payment-reminder-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recordatorio de pago",
  description: "Información de cuentas bancarias para realizar pagos.",
};

export default async function PaymentReminderPage() {
  const reminder = await getPaymentReminder();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Banknote className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Recordatorio de pago</h1>
          <p className="mt-2 text-sm text-slate-500">Información de nuestras cuentas bancarias</p>
        </header>

        <section className="mb-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-3 text-xl font-semibold text-blue-950">{reminder.greeting}</h2>
          <p className="leading-7 text-slate-700">{reminder.message}</p>
          {reminder.instruction && <p className="mt-3 leading-7 text-slate-700">{reminder.instruction}</p>}
        </section>

        <section aria-labelledby="accounts-heading">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h2 id="accounts-heading" className="text-xl font-bold">
              Cuentas bancarias
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reminder.banks.map((bank) => (
              <article key={`${bank.name}-${bank.accountNumber}`} className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold">{bank.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{bank.accountType}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Número de cuenta</dt>
                    <dd className="font-semibold tracking-wide">{bank.accountNumber}</dd>
                  </div>
                  {bank.iban && (
                    <div>
                      <dt className="text-slate-500">IBAN</dt>
                      <dd className="font-semibold tracking-wide break-all">{bank.iban}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-500">A nombre de</dt>
                    <dd className="font-medium">{bank.owner}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Cédula</dt>
                    <dd className="font-medium">{bank.cedula}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
          <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Gracias por su atención.
        </footer>
      </div>
    </main>
  );
}
