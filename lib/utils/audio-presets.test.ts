import { getPresetById, getAllPresets } from "./audio-presets";

describe("audio-presets", () => {
  describe("getAllPresets", () => {
    it("returns 16 presets (10 SFX + 6 ambient)", () => {
      expect(getAllPresets()).toHaveLength(16);
    });

    it("each preset has required fields", () => {
      for (const preset of getAllPresets()) {
        expect(preset.id).toBeTruthy();
        expect(preset.name_key).toMatch(/^audio\.preset_/);
        expect(preset.file).toMatch(/^\/sounds\/(sfx|ambient)\/.+\.mp3$/);
        expect(preset.icon).toBeTruthy();
        expect(["attack", "magic", "defense", "dramatic", "ambient"]).toContain(preset.category);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = getAllPresets().map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("getPresetById", () => {
    it("returns preset for valid id", () => {
      const preset = getPresetById("fireball");
      expect(preset).toBeDefined();
      expect(preset!.id).toBe("fireball");
      expect(preset!.icon).toBe("\uD83D\uDD25");
      expect(preset!.category).toBe("magic");
    });

    it("returns undefined for invalid id", () => {
      expect(getPresetById("nonexistent")).toBeUndefined();
    });

    it("returns correct file path for sword-hit", () => {
      const preset = getPresetById("sword-hit");
      expect(preset?.file).toBe("/sounds/sfx/sword-hit.mp3");
    });
  });
});
