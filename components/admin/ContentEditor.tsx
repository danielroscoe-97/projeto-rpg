"use client";

import { useState, useCallback } from "react";

interface ContentEditorProps {
  entityType: "monsters" | "spells";
}

export function ContentEditor({ entityType }: ContentEditorProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEditing(null);
    try {
      const res = await fetch(`/api/admin/content?type=${entityType}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setResults(json.data ?? []);
    } catch {
      setError("Failed to search");
    } finally {
      setLoading(false);
    }
  }, [entityType, search]);

  const startEdit = (entity: Record<string, unknown>) => {
    setEditing(entity);
    setSuccess(null);
    // Initialize edit fields with current values
    const fields: Record<string, string> = {};
    const editableKeys = entityType === "monsters"
      ? ["name", "hp", "ac", "challenge_rating", "type", "size", "alignment"]
      : ["name", "level", "school", "casting_time", "range", "components", "duration", "description"];
    for (const key of editableKeys) {
      fields[key] = String(entity[key] ?? "");
    }
    setEditFields(fields);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(editFields)) {
        const original = String(editing[key] ?? "");
        if (value !== original) {
          // Parse numbers for numeric fields
          if (["hp", "ac", "level"].includes(key)) {
            updates[key] = parseInt(value, 10);
          } else {
            updates[key] = value;
          }
        }
      }
      if (Object.keys(updates).length === 0) {
        setSuccess("No changes to save.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: editing.id,
          updates,
        }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else {
        setSuccess("Saved and propagated to active sessions.");
        // Update local results
        setResults((prev) =>
          prev.map((r) => (r.id === editing.id ? { ...r, ...updates } : r))
        );
        setEditing((prev) => (prev ? { ...prev, ...updates } : null));
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const editableKeys = entityType === "monsters"
    ? ["name", "hp", "ac", "challenge_rating", "type", "size", "alignment"]
    : ["name", "level", "school", "casting_time", "range", "components", "duration", "description"];

  return (
    <div data-testid="content-editor">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${entityType} by name...`}
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm min-h-[44px]"
          data-testid="content-search-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#e94560] text-white font-medium rounded-md hover:bg-[#c73652] transition-colors text-sm min-h-[44px] disabled:opacity-50"
          data-testid="content-search-btn"
        >
          Search
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

      {loading ? (
        <p className="text-white/40 text-sm">Searching...</p>
      ) : (
        <div className="space-y-2 mb-6">
          {results.map((entity) => (
            <button
              key={entity.id as string}
              type="button"
              onClick={() => startEdit(entity)}
              className={`w-full text-left bg-[#16213e] border rounded-md px-4 py-3 text-sm transition-colors ${
                editing?.id === entity.id
                  ? "border-[#e94560]"
                  : "border-white/10 hover:border-white/30"
              }`}
              data-testid={`content-row-${entity.id}`}
            >
              <span className="text-white font-medium">{String(entity.name ?? "")}</span>
              {entity.ruleset_version != null && (
                <span className="text-white/40 text-xs ml-2">{String(entity.ruleset_version)}</span>
              )}
              {entity.challenge_rating != null && (
                <span className="text-white/40 text-xs ml-2">CR {String(entity.challenge_rating)}</span>
              )}
              {entity.level != null && (
                <span className="text-white/40 text-xs ml-2">Level {String(entity.level)}</span>
              )}
            </button>
          ))}
          {results.length === 0 && !loading && search && (
            <p className="text-white/40 text-sm">No results found.</p>
          )}
        </div>
      )}

      {editing && (
        <div className="bg-[#16213e] border border-white/10 rounded-md p-4 space-y-3" data-testid="content-edit-form">
          <h3 className="text-white font-medium text-sm mb-3">
            Edit: {String(editing.name ?? "")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {editableKeys.map((key) => (
              <div key={key} className={key === "description" ? "col-span-2" : ""}>
                <label className="text-xs text-white/50 block mb-1 capitalize">
                  {key.replace(/_/g, " ")}
                </label>
                {key === "description" ? (
                  <textarea
                    value={editFields[key] ?? ""}
                    onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                    rows={4}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm min-h-[80px]"
                    data-testid={`edit-${key}`}
                  />
                ) : (
                  <input
                    type="text"
                    value={editFields[key] ?? ""}
                    onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm min-h-[32px]"
                    data-testid={`edit-${key}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-3 py-1 text-white/40 hover:text-white/70 text-xs min-h-[32px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1 bg-[#e94560] text-white text-xs font-medium rounded hover:bg-[#c73652] transition-colors min-h-[32px] disabled:opacity-50"
              data-testid="content-save-btn"
            >
              {saving ? "Saving..." : "Save & Propagate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
