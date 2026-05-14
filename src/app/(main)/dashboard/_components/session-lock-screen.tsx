"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IDLE_TIMEOUT_MS = 45_000;
const ACTIVITY_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
];

type LockReason = "manual" | "idle";

export function SessionLockScreen({ children }: Readonly<{ children: ReactNode }>) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>("manual");
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lockSession = useCallback((reason: LockReason) => {
    clearTimer();
    setLockReason(reason);
    setPassword("");
    setUnlockError(null);
    setIsUnlocking(false);
    setIsLocked(true);
  }, [clearTimer]);

  const resetIdleTimer = useCallback(() => {
    if (isLocked) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      lockSession("idle");
    }, IDLE_TIMEOUT_MS);
  }, [clearTimer, isLocked, lockSession]);

  const unlockSession = useCallback(async () => {
    if (!password.trim()) {
      setUnlockError("Ingresa tu clave para desbloquear");
      passwordInputRef.current?.focus();
      return;
    }

    try {
      setIsUnlocking(true);
      setUnlockError(null);

      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        setUnlockError(result.error || "No se pudo desbloquear la sesion");
        return;
      }

      setPassword("");
      setUnlockError(null);
      setIsLocked(false);
    } catch {
      setUnlockError("Error de red al validar la clave");
    } finally {
      setIsUnlocking(false);
    }
  }, [password]);

  useEffect(() => {
    if (!isLocked) {
      resetIdleTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [clearTimer, isLocked, resetIdleTimer]);

  useEffect(() => {
    const onActivity = () => {
      resetIdleTimer();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetIdleTimer();
      }
    };

    const onLockRequest = () => {
      lockSession("manual");
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("app-lock-request", onLockRequest);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("app-lock-request", onLockRequest);
    };
  }, [lockSession, resetIdleTimer]);

  useEffect(() => {
    if (isLocked) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 0);
    }
  }, [isLocked]);

  return (
    <>
      {children}

      {isLocked && (
        <div className="bg-background/85 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card mx-4 w-full max-w-md rounded-2xl border p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-primary/10 text-primary rounded-full p-2">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sesion bloqueada</h2>
                <p className="text-muted-foreground text-sm">
                  {lockReason === "idle"
                    ? "La app se bloqueo por inactividad (45 segundos)."
                    : "Bloqueaste la sesion manualmente."}
                </p>
              </div>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void unlockSession();
              }}
            >
              <Input
                ref={passwordInputRef}
                type="password"
                value={password}
                autoComplete="current-password"
                placeholder="Ingresa tu clave"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (unlockError) setUnlockError(null);
                }}
                disabled={isUnlocking}
              />

              {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}

              <Button className="w-full" type="submit" disabled={isUnlocking}>
                <Unlock className="mr-2 h-4 w-4" />
                {isUnlocking ? "Validando..." : "Desbloquear"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
