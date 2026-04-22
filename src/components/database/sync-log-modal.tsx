"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Terminal, CheckCircle2, AlertCircle, Loader2, XCircle } from "lucide-react";

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
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== "syncing" && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-950 text-slate-50 border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Terminal className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Consola de Sincronización</DialogTitle>
              <DialogDescription className="text-slate-400">
                Transfiriendo datos locales a Neon Cloud (Mirroring)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative mt-4 bg-black/50 rounded-lg border border-slate-800 overflow-hidden">
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
                    <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={`
                      ${isError ? "text-red-400 font-bold" : ""}
                      ${isSuccess ? "text-green-400 font-bold" : ""}
                      ${isSystem ? "text-blue-400 italic" : "text-slate-300"}
                    `}>
                      {log}
                    </span>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-800 pt-4 mt-2">
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
