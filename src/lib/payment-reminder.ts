import { z } from "zod";

export const paymentReminderSchema = z.object({
  greeting: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(2000),
  instruction: z.string().trim().max(1000),
  banks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        accountNumber: z.string().trim().min(1).max(100),
        accountType: z.string().trim().min(1).max(100),
        owner: z.string().trim().min(1).max(160),
        cedula: z.string().trim().min(1).max(40),
        iban: z.string().trim().max(100),
      }),
    )
    .min(1)
    .max(20),
});

export type PaymentReminder = z.infer<typeof paymentReminderSchema>;

export const DEFAULT_PAYMENT_REMINDER: PaymentReminder = {
  greeting: "Buenas y bendiciones a todos.",
  message:
    "Este es un recordatorio de pago. Si ya realizó su pago, por favor ignore este mensaje. De lo contrario, le invitamos a pasar por nuestra oficina o depositar en una de nuestras cuentas bancarias.",
  instruction: "",
  banks: [
    {
      name: "Banreservas",
      accountNumber: "9607579545",
      accountType: "Cuenta de ahorro",
      owner: "Daniel Beras Sanchez",
      cedula: "026-0097729-8",
      iban: "",
    },
    {
      name: "Popular",
      accountNumber: "846618437",
      accountType: "Cuenta de ahorro",
      owner: "Carmen Guerrero engracia",
      cedula: "026-0117303-8",
      iban: "",
    },
    {
      name: "BHD",
      accountNumber: "18922470023",
      accountType: "Cuenta de ahorro",
      owner: "Daniel Beras Sanchez",
      cedula: "026-0097729-8",
      iban: "",
    },
    {
      name: "Banco Qik",
      accountNumber: "1001099805",
      accountType: "Cuenta estándar",
      owner: "Daniel Beras Sanchez",
      cedula: "026-0097729-8",
      iban: "DO36QDDM1001099805",
    },
  ],
};
