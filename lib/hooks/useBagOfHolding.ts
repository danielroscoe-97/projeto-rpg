"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { PartyInventoryItem, InventoryRemovalRequest } from "@/lib/types/database";

export type BagItem = PartyInventoryItem & {
  pending_request?: InventoryRemovalRequest;
};

export function useBagOfHolding(campaignId: string, userId: string) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch items + pending requests
  useEffect(() => {
    const fetchItems = async () => {
      const [{ data: inventoryData }, { data: requestsData }] = await Promise.all([
        supabase
          .from("party_inventory_items")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("added_at", { ascending: false })
          .limit(500),
        supabase
          .from("inventory_removal_requests")
          .select("*")
          .eq("campaign_id", campaignId)
          .eq("status", "pending")
          .limit(100),
      ]);

      const requests = requestsData ?? [];
      const enriched: BagItem[] = (inventoryData ?? []).map((item: PartyInventoryItem) => ({
        ...item,
        pending_request: requests.find((r: InventoryRemovalRequest) => r.item_id === item.id),
      }));

      setItems(enriched);
      setLoading(false);
    };
    fetchItems();
  }, [campaignId, supabase]);

  // Realtime subscription for inventory changes
  useEffect(() => {
    const channel = supabase
      .channel(`bag-of-holding:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_inventory_items",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === "INSERT") {
            const newItem = payload.new as PartyInventoryItem;
            setItems((prev) => {
              // Skip if already in state (optimistic add)
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [{ ...newItem }, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as PartyInventoryItem;
            setItems((prev) =>
              prev.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setItems((prev) => prev.filter((item) => item.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, supabase]);

  // Add item (optimistic)
  const addItem = useCallback(
    async (input: { item_name: string; quantity: number; notes?: string }) => {
      const optimistic: BagItem = {
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        item_name: input.item_name,
        quantity: input.quantity,
        notes: input.notes ?? null,
        added_by: userId,
        added_at: new Date().toISOString(),
        status: "active",
        removed_by: null,
        removed_at: null,
        removal_approved_by: null,
      };

      // Instant UI feedback
      setItems((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("party_inventory_items")
        .insert({
          campaign_id: campaignId,
          item_name: input.item_name,
          quantity: input.quantity,
          notes: input.notes ?? null,
          added_by: userId,
        })
        .select()
        .single();

      if (error) {
        // Rollback optimistic
        setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
        toast.error("Failed to add item");
        return null;
      }

      // Replace optimistic with real data
      setItems((prev) =>
        prev.map((i) => (i.id === optimistic.id ? { ...data } : i)),
      );
      return data;
    },
    [campaignId, userId, supabase],
  );

  // C3 fix: Atomic request removal — check status first, then do both ops
  const requestRemoval = useCallback(
    async (itemId: string, reason?: string) => {
      // Guard: only request removal on active items
      const item = items.find((i) => i.id === itemId);
      if (!item || item.status !== "active") return;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, status: "pending_removal" as const } : i
        )
      );

      // Step 1: Update item status
      const { error: updateError } = await supabase
        .from("party_inventory_items")
        .update({ status: "pending_removal" })
        .eq("id", itemId)
        .eq("status", "active"); // Extra guard: only if still active

      if (updateError) {
        // Rollback optimistic
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: "active" as const } : i
          )
        );
        toast.error("Failed to request removal");
        return;
      }

      // Step 2: Create removal request
      const { error: insertError } = await supabase
        .from("inventory_removal_requests")
        .insert({
          item_id: itemId,
          campaign_id: campaignId,
          requested_by: userId,
          reason: reason ?? null,
        });

      if (insertError) {
        // Revert item status
        await supabase
          .from("party_inventory_items")
          .update({ status: "active" })
          .eq("id", itemId);
        // Rollback optimistic
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: "active" as const } : i
          )
        );
        toast.error("Failed to request removal");
      }
    },
    [campaignId, userId, items, supabase]
  );

  // Approve removal (DM)
  const approveRemoval = useCallback(
    async (requestId: string) => {
      const { error } = await supabase
        .from("inventory_removal_requests")
        .update({
          status: "approved",
          decided_by: userId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) toast.error("Failed to approve removal");
      // Trigger handles updating inventory item + creating notification
    },
    [userId, supabase]
  );

  // Deny removal (DM)
  const denyRemoval = useCallback(
    async (requestId: string) => {
      const { error } = await supabase
        .from("inventory_removal_requests")
        .update({
          status: "denied",
          decided_by: userId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) toast.error("Failed to deny removal");
      // Trigger handles reverting item status + creating notification
    },
    [userId, supabase]
  );

  // DM direct remove (no approval needed)
  const dmRemoveItem = useCallback(
    async (itemId: string) => {
      const prev = items;
      setItems((current) =>
        current.map((i) =>
          i.id === itemId ? { ...i, status: "removed" as const } : i
        )
      );
      const { error } = await supabase
        .from("party_inventory_items")
        .update({
          status: "removed",
          removed_by: userId,
          removed_at: new Date().toISOString(),
          removal_approved_by: userId,
        })
        .eq("id", itemId);

      if (error) {
        setItems(prev); // rollback
        toast.error("Failed to remove item");
      }
    },
    [userId, items, supabase]
  );

  // Derived state
  const activeItems = items.filter((i) => i.status === "active");
  const pendingItems = items.filter((i) => i.status === "pending_removal");
  const removedItems = items.filter((i) => i.status === "removed");
  const pendingCount = pendingItems.length;

  return {
    items,
    activeItems,
    pendingItems,
    removedItems,
    pendingCount,
    loading,
    addItem,
    requestRemoval,
    approveRemoval,
    denyRemoval,
    dmRemoveItem,
  };
}
