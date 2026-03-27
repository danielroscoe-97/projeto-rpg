/**
 * @jest-environment jsdom
 */
import { useAudioStore } from "./audio-store";

// Mock HTMLAudioElement
const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();
const mockLoad = jest.fn();

class MockAudio {
  src = "";
  volume = 1;
  currentTime = 0;
  preload = "";
  onended: (() => void) | null = null;
  play = mockPlay;
  pause = mockPause;
  load = mockLoad;
}

// @ts-expect-error -- mocking Audio constructor
global.Audio = MockAudio;

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-url" },
        }),
      }),
    },
  }),
}));

describe("audio-store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAudioStore.setState({
      volume: 0.7,
      isMuted: false,
      activeAudioId: null,
      activeAudio: null,
      lastSoundLabel: null,
      playerAudioUrls: {},
      preloadedAudio: {},
    });
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("volume", () => {
    it("initializes with default volume 0.7", () => {
      expect(useAudioStore.getState().volume).toBe(0.7);
    });

    it("setVolume updates volume and persists to localStorage", () => {
      useAudioStore.getState().setVolume(0.5);
      expect(useAudioStore.getState().volume).toBe(0.5);
      expect(localStorage.getItem("dm_audio_volume")).toBe("0.5");
    });

    it("clamps volume to 0-1 range", () => {
      useAudioStore.getState().setVolume(1.5);
      expect(useAudioStore.getState().volume).toBe(1);

      useAudioStore.getState().setVolume(-0.3);
      expect(useAudioStore.getState().volume).toBe(0);
    });
  });

  describe("mute", () => {
    it("initializes unmuted", () => {
      expect(useAudioStore.getState().isMuted).toBe(false);
    });

    it("toggleMute switches mute state and persists", () => {
      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().isMuted).toBe(true);
      expect(localStorage.getItem("dm_audio_muted")).toBe("true");

      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().isMuted).toBe(false);
      expect(localStorage.getItem("dm_audio_muted")).toBe("false");
    });
  });

  describe("playSound", () => {
    it("plays a preset sound", () => {
      useAudioStore.getState().playSound("fireball", "preset", "TestPlayer");
      expect(mockPlay).toHaveBeenCalled();
      expect(useAudioStore.getState().activeAudioId).toBe("fireball");
      expect(useAudioStore.getState().lastSoundLabel).toContain("TestPlayer");
    });

    it("does not play when muted", () => {
      useAudioStore.setState({ isMuted: true });
      useAudioStore.getState().playSound("fireball", "preset", "TestPlayer");
      expect(mockPlay).not.toHaveBeenCalled();
      expect(useAudioStore.getState().activeAudioId).toBeNull();
    });

    it("does not play unknown preset", () => {
      useAudioStore.getState().playSound("nonexistent", "preset", "TestPlayer");
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("plays custom sound with provided URL", () => {
      useAudioStore.getState().playSound("custom-id", "custom", "TestPlayer", "https://example.com/audio.mp3");
      expect(mockPlay).toHaveBeenCalled();
      expect(useAudioStore.getState().activeAudioId).toBe("custom-id");
    });

    it("stops previous audio before playing new one", () => {
      // Play first sound
      useAudioStore.getState().playSound("fireball", "preset", "Player1");
      const firstAudio = useAudioStore.getState().activeAudio;

      // Play second sound
      useAudioStore.getState().playSound("thunder", "preset", "Player2");
      expect(firstAudio?.pause).toHaveBeenCalled();
    });
  });

  describe("stopAllAudio", () => {
    it("stops active audio and clears state", () => {
      useAudioStore.getState().playSound("fireball", "preset", "TestPlayer");
      expect(useAudioStore.getState().activeAudioId).toBe("fireball");

      useAudioStore.getState().stopAllAudio();
      expect(mockPause).toHaveBeenCalled();
      expect(useAudioStore.getState().activeAudioId).toBeNull();
      expect(useAudioStore.getState().activeAudio).toBeNull();
    });

    it("does nothing when no audio is playing", () => {
      useAudioStore.getState().stopAllAudio();
      expect(useAudioStore.getState().activeAudioId).toBeNull();
    });
  });

  describe("preloadPlayerAudio", () => {
    it("preloads audio files and stores signed URLs", async () => {
      const files = [
        { id: "file1", user_id: "u1", file_name: "test.mp3", file_path: "u1/test.mp3", file_size_bytes: 1000, created_at: "2026-01-01" },
      ];
      await useAudioStore.getState().preloadPlayerAudio(files);
      expect(useAudioStore.getState().playerAudioUrls).toHaveProperty("file1");
      expect(useAudioStore.getState().preloadedAudio).toHaveProperty("file1");
    });

    it("does nothing for empty array", async () => {
      await useAudioStore.getState().preloadPlayerAudio([]);
      expect(Object.keys(useAudioStore.getState().playerAudioUrls)).toHaveLength(0);
    });
  });

  describe("cleanup", () => {
    it("stops audio and clears all preloaded data", () => {
      useAudioStore.setState({
        activeAudioId: "test",
        activeAudio: new MockAudio() as unknown as HTMLAudioElement,
        playerAudioUrls: { a: "url" },
        preloadedAudio: { a: new MockAudio() as unknown as HTMLAudioElement },
        lastSoundLabel: "test",
      });

      useAudioStore.getState().cleanup();
      expect(useAudioStore.getState().activeAudioId).toBeNull();
      expect(useAudioStore.getState().activeAudio).toBeNull();
      expect(Object.keys(useAudioStore.getState().playerAudioUrls)).toHaveLength(0);
      expect(Object.keys(useAudioStore.getState().preloadedAudio)).toHaveLength(0);
      expect(useAudioStore.getState().lastSoundLabel).toBeNull();
    });
  });
});
