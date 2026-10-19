import { useEffect, useRef, useState } from "react";
import { pinchedReadingSize, readingSize } from "@/lib/readingZoom";

export function useReadingZoom() {
  const [fontSize, setFontSize] = useState(() => {
    try { return readingSize(Number(localStorage.getItem("liturgy:font")) || 19); }
    catch { return 19; }
  });
  const readingRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(fontSize);
  sizeRef.current = fontSize;

  useEffect(() => {
    try { localStorage.setItem("liturgy:font", String(fontSize)); } catch { /* Storage may be unavailable. */ }
  }, [fontSize]);

  useEffect(() => {
    const element = readingRef.current;
    if (!element) return;
    let gesture: { distance: number; size: number } | null = null;
    const distance = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      gesture = { distance: distance(event.touches), size: sizeRef.current };
      if (event.cancelable) event.preventDefault();
    };
    const move = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      setFontSize(pinchedReadingSize(gesture.size, gesture.distance, distance(event.touches)));
    };
    const end = () => { gesture = null; };
    element.addEventListener("touchstart", start, { passive: false });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
    };
  }, []);

  return { readingRef, fontSize, changeFont: (delta: number) => setFontSize(size => readingSize(size + delta)) };
}