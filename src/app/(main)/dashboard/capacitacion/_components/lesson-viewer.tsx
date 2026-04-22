"use client";

import { useState } from "react";

import { CheckCircle, Circle, Clock, ChevronDown, ChevronUp, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Lesson } from "../_data/curriculum";

import { IpCalculator } from "./ip-calculator";
import { NetworkDiagram } from "./network-diagram";

interface LessonViewerProps {
  lesson: Lesson;
  isCompleted: boolean;
  onComplete: (id: string) => void;
}

// Simple markdown-like renderer for lesson content
function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(
        <p key={i} className="text-foreground mt-3 mb-1 font-bold">
          {line.slice(2, -2)}
        </p>,
      );
    } else if (line.startsWith("**") && line.includes("**")) {
      // Inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={i} className="text-muted-foreground leading-relaxed">
          {parts.map((p, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-foreground font-semibold">
                {p}
              </strong>
            ) : (
              p
            ),
          )}
        </p>,
      );
    } else if (line.startsWith("- ")) {
      // Bullet list
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5">
          {items.map((item, j) => {
            const parts = item.split(/\*\*(.*?)\*\*/g);
            return (
              <li key={j} className="text-muted-foreground flex items-start gap-2 text-sm">
                <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>
                  {parts.map((p, k) =>
                    k % 2 === 1 ? (
                      <strong key={k} className="text-foreground font-semibold">
                        {p}
                      </strong>
                    ) : (
                      p
                    ),
                  )}
                </span>
              </li>
            );
          })}
        </ul>,
      );
      continue;
    } else if (line.startsWith("| ")) {
      // Table
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const rows = tableLines.slice(2).map((l) =>
        l
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim()),
      );
      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((h, j) => (
                  <th key={j} className="text-foreground px-3 py-2 text-left text-xs font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-t">
                  {row.map((cell, k) => {
                    const parts = cell.split(/\*\*(.*?)\*\*/g);
                    return (
                      <td key={k} className="text-muted-foreground px-3 py-2 text-xs">
                        {parts.map((p, m) =>
                          m % 2 === 1 ? (
                            <strong key={m} className="text-foreground">
                              {p}
                            </strong>
                          ) : (
                            p
                          ),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    } else if (line.startsWith("```")) {
      // Code block
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={`code-${i}`}
          className="bg-muted/60 text-foreground my-3 overflow-x-auto rounded-lg border p-3 font-mono text-xs leading-relaxed"
        >
          {codeLines.join("\n")}
        </pre>,
      );
    } else if (line.startsWith("#")) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#+\s/, "");
      elements.push(
        <p key={i} className={cn("text-foreground mt-4 mb-2 font-bold", level === 3 ? "text-base" : "text-sm")}>
          {text}
        </p>,
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-border my-4" />);
    } else if (line.trim()) {
      // Inline formatting
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const hasBold = parts.some((_, j) => j % 2 === 1);
      const parts2 = line.split(/`(.*?)`/g);
      const hasCode = parts2.some((_, j) => j % 2 === 1);

      if (hasCode) {
        elements.push(
          <p key={i} className="text-muted-foreground text-sm leading-relaxed">
            {parts2.map((p, j) =>
              j % 2 === 1 ? (
                <code key={j} className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  {p}
                </code>
              ) : (
                (() => {
                  const bp = p.split(/\*\*(.*?)\*\*/g);
                  return bp.map((b, k) =>
                    k % 2 === 1 ? (
                      <strong key={k} className="text-foreground font-semibold">
                        {b}
                      </strong>
                    ) : (
                      b
                    ),
                  );
                })()
              ),
            )}
          </p>,
        );
      } else if (hasBold) {
        elements.push(
          <p key={i} className="text-muted-foreground text-sm leading-relaxed">
            {parts.map((p, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="text-foreground font-semibold">
                  {p}
                </strong>
              ) : (
                p
              ),
            )}
          </p>,
        );
      } else {
        elements.push(
          <p key={i} className="text-muted-foreground text-sm leading-relaxed">
            {line}
          </p>,
        );
      }
    } else {
      elements.push(<div key={i} className="h-2" />);
    }
    i++;
  }
  return elements;
}

export function LessonViewer({ lesson, isCompleted, onComplete }: LessonViewerProps) {
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {lesson.duration}
            </Badge>
            {isCompleted && (
              <Badge className="gap-1 border-emerald-200 bg-emerald-500/15 text-xs text-emerald-700 shadow-none dark:text-emerald-300">
                <CheckCircle className="h-3 w-3" />
                Completada
              </Badge>
            )}
          </div>
          <h2 className="text-foreground text-xl font-bold">{lesson.title}</h2>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="prose-sm space-y-1 pt-5">{renderContent(lesson.content)}</CardContent>
      </Card>

      {/* Diagram */}
      {lesson.diagram && (
        <div>
          <h3 className="text-muted-foreground mb-3 text-sm font-bold tracking-wider uppercase">
            Diagrama Interactivo
          </h3>
          <NetworkDiagram type={lesson.diagram} />
        </div>
      )}

      {/* IP Calculator */}
      {lesson.hasCalculator && (
        <div>
          <h3 className="text-muted-foreground mb-3 text-sm font-bold tracking-wider uppercase">
            Herramienta Práctica
          </h3>
          <IpCalculator />
        </div>
      )}

      {/* Video */}
      {lesson.videoUrl && (
        <div>
          <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
            <PlayCircle className="h-4 w-4" /> Video de Apoyo
          </h3>
          <div className="aspect-video overflow-hidden rounded-xl border bg-black">
            <iframe
              src={lesson.videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        </div>
      )}

      {/* Key Points */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <button onClick={() => setShowKeyPoints(!showKeyPoints)} className="flex w-full items-center justify-between">
            <CardTitle className="text-primary flex items-center gap-2 text-sm">
              ✅ Puntos Clave de esta Lección
            </CardTitle>
            {showKeyPoints ? (
              <ChevronUp className="text-primary h-4 w-4" />
            ) : (
              <ChevronDown className="text-primary h-4 w-4" />
            )}
          </button>
        </CardHeader>
        {showKeyPoints && (
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {lesson.keyPoints.map((point, i) => (
                <li key={i} className="text-foreground flex items-start gap-2 text-sm">
                  <CheckCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      {/* Complete Button */}
      {!isCompleted && (
        <Button
          onClick={() => onComplete(lesson.id)}
          className="w-full gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          size="lg"
        >
          <CheckCircle className="h-5 w-5" />
          Marcar como Completada
        </Button>
      )}
    </div>
  );
}
