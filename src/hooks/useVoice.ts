import { useState, useCallback, useRef } from "react";
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

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cancelledRef = useRef(false);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      toast.error("La synthèse vocale n'est pas supportée par votre navigateur.");
      return;
    }

    const cleanText = text
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*?/g, "")
      .replace(/_{1,2}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/>\s*/g, "")
      .replace(/^[-•]\s*/gm, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    window.speechSynthesis.cancel();
    cancelledRef.current = false;

    // Découper en chunks (~200 car.) — Chrome coupe la synthèse au-delà de ~15s
    const sentences = cleanText.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [cleanText];
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > 200 && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return voices.find((v) => v.lang.startsWith("fr")) || null;
    };

    const startSpeaking = () => {
      const frenchVoice = pickVoice();

      const speakChunk = (i: number) => {
        if (cancelledRef.current || i >= chunks.length) {
          setIsSpeaking(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i]);
        u.lang = "fr-FR";
        u.rate = 0.95;
        u.pitch = 1;
        if (frenchVoice) u.voice = frenchVoice;
        u.onend = () => speakChunk(i + 1);
        u.onerror = (e: any) => {
          if (e?.error === "canceled" || e?.error === "interrupted") return;
          console.error("TTS error:", e?.error);
          speakChunk(i + 1);
        };
        window.speechSynthesis.speak(u);
      };

      setIsSpeaking(true);
      speakChunk(0);
    };

    // Si les voix ne sont pas encore chargées, attendre
    if (window.speechSynthesis.getVoices().length === 0) {
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null;
        startSpeaking();
      };
      window.speechSynthesis.onvoiceschanged = handler;
      // fallback si l'événement ne se déclenche pas
      setTimeout(() => {
        if (!cancelledRef.current && !window.speechSynthesis.speaking) {
          window.speechSynthesis.onvoiceschanged = null;
          startSpeaking();
        }
      }, 250);
    } else {
      startSpeaking();
    }
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
