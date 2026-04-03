"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { PlayerNotification } from "@/lib/types/database";

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("player_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) toast.error("Failed to load notifications");

      const items = data ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read_at).length);
      setLoading(false);
    };
    fetchData();
  }, [userId, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as PlayerNotification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
          // I9 fix: only vibrate when tab is visible
          if (document.visibilityState === "visible") {
            navigator.vibrate?.([100, 50, 100]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // I2 + I5 fix: Mark all as read with rollback and stable state
  const markAllRead = useCallback(async () => {
    if (!userId) return;

    // Use functional update to avoid stale closure
    let prevNotifications: PlayerNotification[] = [];
    let prevUnread = 0;

    setNotifications((prev) => {
      prevNotifications = prev;
      prevUnread = prev.filter((n) => !n.read_at).length;
      if (prevUnread === 0) return prev;
      const now = new Date().toISOString();
      return prev.map((n) => (n.read_at ? n : { ...n, read_at: now }));
    });
    setUnreadCount(0);

    if (prevUnread === 0) return;

    const { error } = await supabase
      .from("player_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      // Rollback
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      toast.error("Failed to mark notifications as read");
    }
  }, [userId, supabase]);

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
  };
}
