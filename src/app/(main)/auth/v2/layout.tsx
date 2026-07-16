import { ReactNode } from "react";

import Image from "next/image";

import { Command } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import styles from "./layout.module.css";

const carouselSlides = [
  {
    src: "/auth-carousel/fiber-network.svg",
    alt: "Infraestructura de fibra óptica e internet",
    title: "Fibra óptica",
    description: "Conectividad estable para redes modernas.",
  },
  {
    src: "/auth-carousel/telecom-tower.svg",
    alt: "Torre de telecomunicaciones con señal inalámbrica",
    title: "Telecomunicaciones",
    description: "Cobertura móvil y enlaces inalámbricos.",
  },
  {
    src: "/auth-carousel/global-network.svg",
    alt: "Red global de internet y centros conectados",
    title: "Red global",
    description: "Servicios digitales conectados en todo momento.",
  },
];

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
          <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
            <Command className="size-10" />
            <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
            <p className="text-sm">Design. Build. Launch. Repeat.</p>
          </div>

          <div className="absolute right-10 bottom-10 left-10">
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
              <div className="relative h-[440px] overflow-hidden rounded-2xl bg-slate-950">
                {carouselSlides.map((slide, index) => (
                  <figure
                    key={slide.title}
                    className={styles.carouselSlide}
                    style={{ animationDelay: `${index * 6}s` }}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <figcaption className="text-primary-foreground absolute right-0 bottom-0 left-0 p-5">
                      <p className="text-xs tracking-[0.28em] text-white/70 uppercase">{slide.title}</p>
                      <p className="mt-1 max-w-sm text-sm text-white/90">{slide.description}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
