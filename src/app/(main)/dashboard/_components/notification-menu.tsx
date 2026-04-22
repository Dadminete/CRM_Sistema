"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  fecha_creacion: string;
}

export function NotificationMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [didWarnUnreadFetchFailure, setDidWarnUnreadFetchFailure] = useState(false);

  // Fetch notifications when menu opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fetch unread count on mount and then via SSE (fallback to polling)
  useEffect(() => {
    fetchUnreadCount();

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let source: EventSource | null = null;

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(fetchUnreadCount, 10000); // Fallback: poll every 10s
    };

    if (typeof window !== "undefined" && "EventSource" in window) {
      source = new EventSource("/api/notifications/stream");
      source.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data);
          const newCount = Number(data.count);

          if (Number.isNaN(newCount)) return;

          setUnreadCount((prev) => {
            if (newCount > prev) {
              fetchNotifications();
              toast("Nueva notificación recibida", {
                icon: <Bell className="h-4 w-4 text-primary" />,
              });
            }
            return newCount;
          });
        } catch {
          // Ignore invalid SSE payloads
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        startPolling();
      };
    } else {
      startPolling();
    }

    return () => {
      if (source) source.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) return; // User not authenticated, fail silently
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) return; // User not authenticated, fail silently
        throw new Error(`Failed to fetch unread count: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        if (didWarnUnreadFetchFailure) {
          setDidWarnUnreadFetchFailure(false);
        }
        const newCount = data.data.count;
        if (newCount > unreadCount) {
          // If count increased, show a subtle toast or refresh list
          fetchNotifications();
          toast("Nueva notificación recibida", {
            icon: <Bell className="h-4 w-4 text-primary" />,
          });
        }
        setUnreadCount(newCount);
      }
    } catch (error) {
      if (!didWarnUnreadFetchFailure) {
        console.warn("Unread notifications endpoint not reachable, polling will retry.", error);
        setDidWarnUnreadFetchFailure(true);
      }
    }
  };


  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) return;
      const data = await response.json();

      if (data.success) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, leida: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        toast.error("Error al marcar notificaciones");
        return;
      }
      const data = await response.json();

      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
        setUnreadCount(0);
        toast.success("Todas las notificaciones marcadas como leídas");
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Error al marcar notificaciones");
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "FACTURA":
        return "📄";
      case "APROBACION":
        return "✅";
      case "STOCK":
        return "📦";
      case "AVERIA":
        return "🔧";
      case "WARNING":
        return "⚠️";
      case "ERROR":
        return "❌";
      case "SUCCESS":
        return "✓";
      default:
        return "ℹ️";
    }
  };


  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="text-muted-foreground/50 mb-2 h-12 w-12" />
              <p className="text-muted-foreground text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 p-3",
                  !notification.leida && "bg-muted/50",
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!notification.leida) {
                    markAsRead(notification.id);
                  }
                  if (notification.enlace) {
                    window.location.href = notification.enlace;
                  }
                }}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex flex-1 items-start gap-2">
                    <span className="text-lg">{getNotificationIcon(notification.tipo)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{notification.titulo}</p>
                        {!notification.leida && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{notification.mensaje}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{formatDate(notification.fecha_creacion)}</p>
                    </div>
                  </div>
                  {!notification.leida && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-muted-foreground justify-center text-sm"
              onSelect={() => {
                window.location.href = "/dashboard/notifications";
              }}
            >
              Ver todas las notificaciones
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
