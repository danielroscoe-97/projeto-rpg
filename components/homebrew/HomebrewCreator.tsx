"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Sword, Sparkles, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProGate } from "@/components/billing/ProGate";
import { HomebrewBadge } from "./HomebrewBadge";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type HomebrewTab = "monster" | "spell" | "item";

interface HomebrewEntry {
  id: string;
  name: string;
  data: Record<string, unknown>;
  ruleset_version?: string;
  created_at: string;
  updated_at: string;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: HomebrewTab; icon: typeof Sword; table: string }[] = [
  { key: "monster", icon: Sword, table: "homebrew_monsters" },
  { key: "spell", icon: Sparkles, table: "homebrew_spells" },
  { key: "item", icon: Package, table: "homebrew_items" },
];

// ── Monster form fields ───────────────────────────────────────────────────────

function MonsterForm({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const t = useTranslations("homebrew");
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t("monster_cr")} value={String(data.cr ?? "")} onChange={(v) => set("cr", v)} placeholder="ex: 5" />
      <Field label={t("monster_type")} value={String(data.type ?? "")} onChange={(v) => set("type", v)} placeholder="ex: dragon" />
      <Field label={t("monster_size")} value={String(data.size ?? "")} onChange={(v) => set("size", v)} placeholder="ex: Large" />
      <Field label={t("monster_hp")} value={String(data.hit_points ?? "")} onChange={(v) => set("hit_points", parseInt(v) || 0)} type="number" />
      <Field label={t("monster_ac")} value={String(data.armor_class ?? "")} onChange={(v) => set("armor_class", parseInt(v) || 0)} type="number" />
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground">{t("monster_abilities")}</label>
        <textarea
          value={String(data.abilities ?? "")}
          onChange={(e) => set("abilities", e.target.value)}
          rows={3}
          className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={t("monster_abilities_placeholder")}
        />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground">{t("monster_actions")}</label>
        <textarea
          value={String(data.actions ?? "")}
          onChange={(e) => set("actions", e.target.value)}
          rows={3}
          className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={t("monster_actions_placeholder")}
        />
      </div>
    </div>
  );
}

// ── Spell form fields ─────────────────────────────────────────────────────────

function SpellForm({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const t = useTranslations("homebrew");
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t("spell_level")} value={String(data.level ?? "")} onChange={(v) => set("level", parseInt(v) || 0)} type="number" />
      <Field label={t("spell_school")} value={String(data.school ?? "")} onChange={(v) => set("school", v)} placeholder="ex: Evocation" />
      <Field label={t("spell_casting_time")} value={String(data.casting_time ?? "")} onChange={(v) => set("casting_time", v)} placeholder="1 action" />
      <Field label={t("spell_range")} value={String(data.range ?? "")} onChange={(v) => set("range", v)} placeholder="120 feet" />
      <Field label={t("spell_components")} value={String(data.components ?? "")} onChange={(v) => set("components", v)} placeholder="V, S, M" />
      <Field label={t("spell_duration")} value={String(data.duration ?? "")} onChange={(v) => set("duration", v)} placeholder="Instantaneous" />
      <Field label={t("spell_classes")} value={String(data.classes ?? "")} onChange={(v) => set("classes", v)} placeholder="Wizard, Sorcerer" className="col-span-2" />
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground">{t("spell_description")}</label>
        <textarea
          value={String(data.description ?? "")}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

// ── Item form fields ──────────────────────────────────────────────────────────

function ItemForm({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const t = useTranslations("homebrew");
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t("item_type")} value={String(data.type ?? "")} onChange={(v) => set("type", v)} placeholder="ex: Weapon" />
      <Field label={t("item_rarity")} value={String(data.rarity ?? "")} onChange={(v) => set("rarity", v)} placeholder="ex: Rare" />
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground">{t("item_description")}</label>
        <textarea
          value={String(data.description ?? "")}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <Field label={t("item_properties")} value={String(data.properties ?? "")} onChange={(v) => set("properties", v)} placeholder="ex: Finesse, Light" className="col-span-2" />
      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(data.requires_attunement)}
          onChange={(e) => set("requires_attunement", e.target.checked)}
          id="attunement"
          className="rounded border-border"
        />
        <label htmlFor="attunement" className="text-xs text-muted-foreground">{t("item_attunement")}</label>
      </div>
    </div>
  );
}

// ── Reusable field ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function HomebrewCreatorInner() {
  const t = useTranslations("homebrew");
  const tc = useTranslations("common");

  const [tab, setTab] = useState<HomebrewTab>("monster");
  const [name, setName] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [entries, setEntries] = useState<HomebrewEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<HomebrewTab | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentTable = TABS.find((t) => t.key === tab)!.table;

  const loadEntries = useCallback(async (tabKey: HomebrewTab) => {
    const table = TABS.find((t) => t.key === tabKey)!.table;
    const supabase = createClient();
    const { data: rows } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((rows as HomebrewEntry[]) ?? []);
    setLoaded(tabKey);
  }, []);

  const handleTabChange = useCallback((newTab: HomebrewTab) => {
    setTab(newTab);
    setName("");
    setData({});
    setEditingId(null);
    setConfirmDeleteId(null);
    loadEntries(newTab);
  }, [loadEntries]);

  // Load on first render
  if (loaded === null) {
    loadEntries(tab);
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("error_name_required"));
      return;
    }
    setLoading(true);
    const supabase = createClient();

    try {
      if (editingId) {
        const { error } = await supabase
          .from(currentTable)
          .update({ name: name.trim(), data })
          .eq("id", editingId);
        if (error) throw error;
        toast.success(t("saved"));
      } else {
        const { error } = await supabase
          .from(currentTable)
          .insert({ name: name.trim(), data });
        if (error) throw error;
        toast.success(t("created"));
      }
      setName("");
      setData({});
      setEditingId(null);
      await loadEntries(tab);
    } catch (_err) {
      toast.error(tc("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: HomebrewEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setData(entry.data);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from(currentTable).delete().eq("id", id);
    if (error) {
      toast.error(tc("error_generic"));
      return;
    }
    toast.success(t("deleted"));
    setConfirmDeleteId(null);
    await loadEntries(tab);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setData({});
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-[#D4A853] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`homebrew-tab-${key}`}
          >
            <Icon className="w-4 h-4" />
            {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      {/* Create/Edit form */}
      <div className="bg-card/50 border border-border rounded-md p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          {editingId ? t("edit_title") : t("create_title")}
        </h3>

        <div>
          <label className="text-xs text-muted-foreground">{t("field_name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("field_name_placeholder")}
            className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="homebrew-name"
          />
        </div>

        {tab === "monster" && <MonsterForm data={data} onChange={setData} />}
        {tab === "spell" && <SpellForm data={data} onChange={setData} />}
        {tab === "item" && <ItemForm data={data} onChange={setData} />}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-500 transition-colors disabled:opacity-50 min-h-[32px]"
            data-testid="homebrew-save"
          >
            {loading ? tc("saving") : editingId ? tc("save") : tc("add")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tc("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-1">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground/50 text-center py-4">
            {t("empty_list")}
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between bg-card/30 border border-border/50 rounded px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <HomebrewBadge />
              <span className="text-sm text-foreground">{entry.name}</span>
              {"cr" in entry.data && entry.data.cr != null && (
                <span className="text-xs text-muted-foreground/60">
                  CR {String(entry.data.cr)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleEdit(entry)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title={tc("edit")}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {confirmDeleteId === entry.id ? (
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="px-2 py-0.5 text-xs text-red-400 border border-red-500/40 rounded hover:bg-red-900/30 transition-colors"
                >
                  {t("confirm_delete")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(entry.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                  title={tc("delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Homebrew Content Creator — Pro-gated.
 * Free users see ProBadge.
 */
export function HomebrewCreator() {
  return (
    <ProGate flagKey="homebrew">
      <HomebrewCreatorInner />
    </ProGate>
  );
}
