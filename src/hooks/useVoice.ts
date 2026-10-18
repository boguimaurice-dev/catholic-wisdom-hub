import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Veuillez autoriser l'accès au microphone.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}

export type TTSStatus = "idle" | "speaking" | "paused";

function cleanForSpeech(text: string) {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/#/g, "")
    .replace(/\*+/g, "")
    .replace(/_{1,2}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/>\s*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitChunks(clean: string) {
  const sentences = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [clean];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 200 && current) { chunks.push(current.trim()); current = s; }
    else current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function useTTS() {
  const [status, setStatus] = useState<TTSStatus>("idle");
  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const tokenRef = useRef(0);
  const statusRef = useRef<TTSStatus>("idle");
  const wakeLockRef = useRef<any>(null);
  const keyRef = useRef<string | null>(null);
  const [progress, setProgress] = useState({ i: 0, n: 0 });

  const setS = (s: TTSStatus) => { statusRef.current = s; setStatus(s); };

  const acquireWake = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener?.("release", () => { wakeLockRef.current = null; });
      }
    } catch { /* ignoré */ }
  };
  const releaseWake = () => {
    try { wakeLockRef.current?.release?.(); } catch { /* ignoré */ }
    wakeLockRef.current = null;
  };

  const playFrom = useCallback((start: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const token = ++tokenRef.current;
    const voice = synth.getVoices().find((v) => v.lang.startsWith("fr")) || null;

    const speakChunk = (i: number) => {
      if (token !== tokenRef.current) return;
      if (i >= chunksRef.current.length) {
        indexRef.current = 0; setS("idle"); releaseWake();
        if (keyRef.current) try { localStorage.removeItem(keyRef.current); } catch { /* */ }
        return;
      }
      indexRef.current = i;
      if (keyRef.current) try { localStorage.setItem(keyRef.current, String(i)); } catch { /* */ }
      const u = new SpeechSynthesisUtterance(chunksRef.current[i]);
      u.lang = "fr-FR"; u.rate = 0.95; u.pitch = 1;
      if (voice) u.voice = voice;
      u.onend = () => { if (token === tokenRef.current) speakChunk(i + 1); };
      u.onerror = (e: any) => {
        if (token !== tokenRef.current) return;
        if (e?.error === "canceled" || e?.error === "interrupted") return;
        speakChunk(i + 1);
      };
      synth.speak(u);
    };
    setS("speaking");
    acquireWake();
    speakChunk(start);
  }, []);

  const speak = useCallback((text: string, saveKey?: string) => {
    if (!window.speechSynthesis) {
      toast.error("La synthèse vocale n'est pas supportée par votre navigateur.");
      return;
    }
    const clean = cleanForSpeech(text);
    if (!clean) return;
    chunksRef.current = splitChunks(clean);
    keyRef.current = saveKey ? `tts-pos:${saveKey}` : null;
    let start = 0;
    if (keyRef.current) {
      const s = parseInt(localStorage.getItem(keyRef.current) || "0", 10);
      if (s > 0 && s < chunksRef.current.length) start = s;
    }
    indexRef.current = start;
    if (window.speechSynthesis.getVoices().length === 0) {
      let started = false;
      const go = () => { if (started) return; started = true; window.speechSynthesis.onvoiceschanged = null; playFrom(start); };
      window.speechSynthesis.onvoiceschanged = go;
      setTimeout(go, 250);
    } else playFrom(start);
  }, [playFrom]);

  const pause = useCallback(() => {
    if (statusRef.current !== "speaking") return;
    tokenRef.current++;
    window.speechSynthesis.cancel();
    setS("paused");
    releaseWake();
  }, []);

  const resume = useCallback(() => {
    if (!chunksRef.current.length) return;
    playFrom(indexRef.current);
  }, [playFrom]);

  const skip = useCallback((delta: number) => {
    if (!chunksRef.current.length) return;
    const n = Math.max(0, Math.min(chunksRef.current.length - 1, indexRef.current + delta));
    indexRef.current = n;
    if (keyRef.current) try { localStorage.setItem(keyRef.current, String(n)); } catch { /* */ }
    if (statusRef.current === "speaking") playFrom(n);
  }, [playFrom]);

  const stop = useCallback(() => {
    tokenRef.current++;
    window.speechSynthesis?.cancel();
    indexRef.current = 0;
    setS("idle");
    releaseWake();
  }, []);

  // Retour d'écran : si le navigateur a coupé la lecture, passer en pause pour pouvoir reprendre
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current === "speaking") {
        const synth = window.speechSynthesis;
        if (!synth.speaking || synth.paused) {
          tokenRef.current++;
          synth.cancel();
          setS("paused");
        } else acquireWake();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      tokenRef.current++;
      window.speechSynthesis?.cancel();
      releaseWake();
    };
  }, []);

  return { status, isSpeaking: status === "speaking", isPaused: status === "paused", speak, pause, resume, stop };
}
