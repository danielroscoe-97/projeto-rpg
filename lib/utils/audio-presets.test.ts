import { getPresetById, getAllPresets, getAmbientPresets, getMusicPresets, getSfxPresets } from "./audio-presets";

describe("audio-presets", () => {
  describe("getAllPresets", () => {
    it("returns all presets (SFX + ambient + music)", () => {
      const all = getAllPresets();
      // 95 SFX + 9 ambient + 14 music = 118
      expect(all.length).toBeGreaterThanOrEqual(100);
    });

    it("each preset has required fields", () => {
      for (const preset of getAllPresets()) {
        expect(preset.id).toBeTruthy();
        expect(preset.name_key).toMatch(/^audio\.preset_/);
        expect(preset.file).toMatch(/^\/sounds\/(sfx|ambient|music)\/.+\.mp3$/);
        expect(preset.icon).toBeTruthy();
        expect(["attack", "magic", "defense", "dramatic", "ambient", "monster", "interaction", "music"]).toContain(preset.category);
      }
    });

    it("all preset IDs are unique", () => {
      const ids = getAllPresets().map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("category filters", () => {
    it("getAmbientPresets returns 9 ambient", () => {
      const ambient = getAmbientPresets();
      expect(ambient).toHaveLength(9);
      for (const p of ambient) expect(p.category).toBe("ambient");
    });

    it("getMusicPresets returns 14 music", () => {
      const music = getMusicPresets();
      expect(music).toHaveLength(14);
      for (const p of music) expect(p.category).toBe("music");
    });

    it("getSfxPresets excludes ambient and music", () => {
      const sfx = getSfxPresets();
      expect(sfx.length).toBeGreaterThan(50);
      for (const p of sfx) {
        expect(p.category).not.toBe("ambient");
        expect(p.category).not.toBe("music");
      }
    });
  });

  describe("getPresetById", () => {
    it("returns preset for valid id", () => {
      const preset = getPresetById("spell");
      expect(preset).toBeDefined();
      expect(preset!.category).toBe("magic");
    });

    it("returns undefined for invalid id", () => {
      expect(getPresetById("nonexistent")).toBeUndefined();
    });

    it("returns music preset", () => {
      const preset = getPresetById("music-battle-epic");
      expect(preset).toBeDefined();
      expect(preset!.category).toBe("music");
      expect(preset!.file).toBe("/sounds/music/battle-epic.mp3");
    });

    it("returns RO attack preset", () => {
      const preset = getPresetById("bash");
      expect(preset).toBeDefined();
      expect(preset!.category).toBe("attack");
    });

    it("returns RO magic preset", () => {
      const preset = getPresetById("fire-bolt");
      expect(preset).toBeDefined();
      expect(preset!.category).toBe("magic");
    });
  });
});
