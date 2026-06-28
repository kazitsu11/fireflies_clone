"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface PlayerContextValue {
  currentMs: number;
  isPlaying: boolean;
  durationMs: number;
  rate: number;
  /** ref callback the <audio> element registers with. */
  bindAudio: (node: HTMLAudioElement | null) => void;
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  skip: (deltaMs: number) => void;
  setRate: (r: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

/**
 * Lifts playback state so the transcript and summary can both read `currentMs`
 * and drive the player via `seekTo`. The actual <audio> element is owned by
 * MediaPlayer and registered here through `bindAudio`.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handlersRef = useRef<Record<string, EventListener>>({});

  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState(1);

  const bindAudio = useCallback((node: HTMLAudioElement | null) => {
    const prev = audioRef.current;
    if (prev) {
      for (const [ev, fn] of Object.entries(handlersRef.current)) {
        prev.removeEventListener(ev, fn);
      }
      handlersRef.current = {};
    }
    audioRef.current = node;
    if (!node) return;

    const map: Record<string, EventListener> = {
      timeupdate: () => setCurrentMs(node.currentTime * 1000),
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      ended: () => setIsPlaying(false),
      loadedmetadata: () => setDurationMs((node.duration || 0) * 1000),
      durationchange: () => setDurationMs((node.duration || 0) * 1000),
      ratechange: () => setRateState(node.playbackRate),
    };
    for (const [ev, fn] of Object.entries(map)) node.addEventListener(ev, fn);
    handlersRef.current = map;

    setDurationMs((node.duration || 0) * 1000);
    setRateState(node.playbackRate);
    setCurrentMs(node.currentTime * 1000);
  }, []);

  const seekTo = useCallback((ms: number) => {
    const a = audioRef.current;
    if (!a) return;
    const seconds = Math.max(0, ms / 1000);
    a.currentTime = seconds;
    setCurrentMs(seconds * 1000); // optimistic; timeupdate will confirm
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);
  const skip = useCallback((deltaMs: number) => {
    const a = audioRef.current;
    if (!a) return;
    const max = a.duration || Infinity;
    a.currentTime = Math.min(Math.max(0, a.currentTime + deltaMs / 1000), max);
  }, []);
  const setRate = useCallback((r: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = r;
    setRateState(r);
  }, []);

  const value = useMemo(
    () => ({
      currentMs,
      isPlaying,
      durationMs,
      rate,
      bindAudio,
      seekTo,
      play,
      pause,
      toggle,
      skip,
      setRate,
    }),
    [currentMs, isPlaying, durationMs, rate, bindAudio, seekTo, play, pause, toggle, skip, setRate],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
