"use client";

import { useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Circle,
  ChevronRight,
  GraduationCap,
  Network,
  Wifi,
  Router,
  Terminal,
  Clock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { LessonViewer } from "../_components/lesson-viewer";
import { curriculum, getModuleBySlug } from "../_data/curriculum";

const ICONS: Record<string, React.ElementType> = {
  Network,
  Wifi,
  Router,
  Terminal,
};

export default function ModulePage() {
  const params = useParams();
  const slug = params?.modulo as string;
  const module = getModuleBySlug(slug);
  const [activeLesson, setActiveLesson] = useState(module?.lessons[0]?.id ?? "");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <GraduationCap className="text-muted-foreground h-12 w-12" />
        <h2 className="text-foreground text-xl font-bold">Módulo no encontrado</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard/capacitacion">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  const Icon = ICONS[module.icon] ?? BookOpen;
  const lesson = module.lessons.find((l) => l.id === activeLesson);
  const completedCount = module.lessons.filter((l) => completed.has(l.id)).length;
  const progress = Math.round((completedCount / module.lessons.length) * 100);

  const handleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Auto-advance to next lesson
    const idx = module.lessons.findIndex((l) => l.id === id);
    if (idx < module.lessons.length - 1) {
      setActiveLesson(module.lessons[idx + 1].id);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 duration-500">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/capacitacion">
            <ArrowLeft className="h-4 w-4" /> Módulos
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-lg p-1.5", module.bgColor)}>
              <Icon className={cn("h-4 w-4", module.color)} />
            </div>
            <h1 className="text-foreground truncate text-xl font-bold">{module.title}</h1>
            {completedCount === module.lessons.length && (
              <Badge className="gap-1 border-emerald-200 bg-emerald-500/15 text-xs text-emerald-700 shadow-none dark:text-emerald-300">
                <CheckCircle className="h-3 w-3" /> Completado
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      {completedCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full transition-all duration-500", module.color.replace("text-", "bg-"))}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {completedCount}/{module.lessons.length} lecciones
          </span>
        </div>
      )}

      {/* ─── Main layout: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Lesson sidebar */}
        <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          <h3 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">Lecciones</h3>
          {module.lessons.map((l, i) => {
            const isDone = completed.has(l.id);
            const isActive = l.id === activeLesson;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLesson(l.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  isActive
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "bg-card hover:bg-muted/50 hover:border-border border-transparent",
                )}
              >
                {isDone ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                      isActive
                        ? "border-primary bg-primary text-white"
                        : "border-muted-foreground/40 text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-tight font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {l.title}
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5 flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" /> {l.duration}
                  </p>
                </div>
                {isActive && <ChevronRight className="text-primary mt-0.5 h-4 w-4 shrink-0" />}
              </button>
            );
          })}

          {/* Module navigation */}
          <div className="space-y-1 border-t pt-4">
            <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">Otros Módulos</p>
            {curriculum
              .filter((m) => m.slug !== slug)
              .map((m) => {
                const MIcon = ICONS[m.icon] ?? BookOpen;
                return (
                  <Link
                    key={m.id}
                    href={`/dashboard/capacitacion/${m.slug}`}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
                  >
                    <MIcon className={cn("h-3.5 w-3.5", m.color)} />
                    {m.title}
                  </Link>
                );
              })}
          </div>
        </aside>

        {/* Lesson content */}
        <main>
          {lesson ? (
            <LessonViewer lesson={lesson} isCompleted={completed.has(lesson.id)} onComplete={handleComplete} />
          ) : (
            <div className="text-muted-foreground flex h-40 items-center justify-center">
              Selecciona una lección para comenzar
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
