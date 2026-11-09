"use client";

import { useEffect, useRef } from "react";

import { CheckCircle2, Loader2, Terminal, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SyncLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  status: "idle" | "syncing" | "success" | "error";
}

export function SyncLogModal({ isOpen, onClose, logs, status }: SyncLogModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== "syncing" && onClose()}>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-950 text-slate-50">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Terminal className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Consola de Sincronización</DialogTitle>
              <DialogDescription className="text-slate-400">Estado de conexión a Supabase PostgreSQL</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative mt-4 overflow-hidden rounded-lg border border-slate-800 bg-black/50">
          <ScrollArea ref={scrollRef} className="h-[400px] p-4 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">Esperando inicio de proceso...</div>
            ) : (
              logs.map((log, i) => {
                const isError = log.includes("[ERROR]") || log.includes("[CRITICAL]");
                const isSuccess = log.includes("[SUCCESS]");
                const isSystem = log.includes("[SISTEMA]");

                return (
                  <div key={i} className="mb-1 flex gap-2">
                    <span className="shrink-0 text-slate-600">
                      [{new Date().toLocaleTimeString([], { hour12: false })}]
                    </span>
                    <span
                      className={` ${isError ? "font-bold text-red-400" : ""} ${isSuccess ? "font-bold text-green-400" : ""} ${isSystem ? "text-blue-400 italic" : "text-slate-300"} `}
                    >
                      {log}
                    </span>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-between border-t border-slate-800 pt-4 sm:justify-between">
          <div className="flex items-center gap-2">
            {status === "syncing" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-sm text-slate-400">Sincronizando... no cierres esta ventana.</span>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Sincronización completada.</span>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-400">El proceso falló. Revisa los logs.</span>
              </>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={status === "syncing"}
            className="border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            {status === "syncing" ? "Procesando..." : "Cerrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
