import { getPresetById, getAllPresets, getAmbientPresets, getMusicPresets, getSfxPresets } from "./audio-presets";

describe("audio-presets", () => {
  describe("getAllPresets", () => {
    it("returns 27 beta presets (12 SFX + 9 ambient + 6 music)", () => {
      expect(getAllPresets()).toHaveLength(27);
    });

    it("each preset has required fields", () => {
      for (const preset of getAllPresets()) {
        expect(preset.id).toBeTruthy();
        expect(preset.name_key).toMatch(/^audio\.preset_/);
        expect(preset.file).toMatch(/^\/sounds\/(sfx|ambient|music)\/.+\.mp3$/);
        expect(preset.icon).toBeTruthy();
        expect(["attack", "magic", "defense", "dramatic", "ambient", "monster", "interaction", "ui", "music"]).toContain(preset.category);
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

    it("getMusicPresets returns 6 music", () => {
      const music = getMusicPresets();
      expect(music).toHaveLength(6);
      for (const p of music) expect(p.category).toBe("music");
    });

    it("getSfxPresets returns 12 SFX (excludes ambient and music)", () => {
      const sfx = getSfxPresets();
      expect(sfx).toHaveLength(12);
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
  });
});
