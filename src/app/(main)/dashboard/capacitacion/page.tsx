"use client";

import Link from "next/link";

import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  Circle,
  Clock,
  Network,
  Wifi,
  Router,
  Terminal,
  ArrowRight,
  Award,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { curriculum, totalLessons } from "./_data/curriculum";

const ICONS: Record<string, React.ElementType> = {
  Network,
  Wifi,
  Router,
  Terminal,
};

export default function CapacitacionPage() {
  return (
    <div className="animate-in fade-in flex flex-col gap-8 duration-500">
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-indigo-700 p-8 text-white shadow-xl">
        <div className="bg-grid-white/10 absolute inset-0 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <Badge className="border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                ISP Academy
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Capacitación</h1>
            <p className="mt-1 max-w-lg text-blue-100">
              Aprende los fundamentos de redes y el manejo de equipos MikroTik para operar nuestra infraestructura ISP.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{curriculum.length}</div>
              <div className="text-xs tracking-wider text-blue-200 uppercase">Módulos</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-3xl font-bold">{totalLessons}</div>
              <div className="text-xs tracking-wider text-blue-200 uppercase">Lecciones</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modules Grid ─── */}
      <div>
        <h2 className="text-foreground mb-4 text-xl font-bold">Módulos de Aprendizaje</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {curriculum.map((module, idx) => {
            const Icon = ICONS[module.icon] ?? BookOpen;
            return (
              <Card
                key={module.id}
                className="group border-border/60 hover:shadow-primary/10 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Accent bar */}
                <div
                  className={cn("absolute inset-x-0 top-0 h-1 transition-all group-hover:h-1.5", {
                    "bg-blue-500": idx === 0,
                    "bg-emerald-500": idx === 1,
                    "bg-violet-500": idx === 2,
                    "bg-amber-500": idx === 3,
                  })}
                />
                <CardHeader className="pt-5 pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn("rounded-xl p-2.5", module.bgColor)}>
                      <Icon className={cn("h-5 w-5", module.color)} />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Módulo {idx + 1}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-base">{module.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{module.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Lessons list preview */}
                  <div className="space-y-1.5">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Circle className="text-muted-foreground/50 h-3 w-3 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                    ))}
                  </div>
                  {/* Stats */}
                  <div className="text-muted-foreground flex items-center justify-between border-t pt-2.5 text-xs">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {module.lessons.length} lecciones
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />~{module.lessons.reduce((acc, l) => acc + parseInt(l.duration), 0)}{" "}
                      min
                    </span>
                  </div>
                  <Button
                    asChild
                    className={cn("w-full gap-2 text-white", {
                      "bg-blue-600 hover:bg-blue-700": idx === 0,
                      "bg-emerald-600 hover:bg-emerald-700": idx === 1,
                      "bg-violet-600 hover:bg-violet-700": idx === 2,
                      "bg-amber-600 hover:bg-amber-700": idx === 3,
                    })}
                  >
                    <Link href={`/dashboard/capacitacion/${module.slug}`}>
                      Comenzar <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Info Banner ─── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">¿Cómo usar este módulo?</h3>
            <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
              Selecciona un módulo de arriba y estudia cada lección en orden. Los diagramas son interactivos — haz clic
              en ellos para explorar. La calculadora de subnetting te ayudará a practicar IPs en tiempo real. Completa
              cada lección para marcarla como terminada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
