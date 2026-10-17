import { useEffect, useRef, useState } from "react";

/** Returns true when the header should be hidden (user scrolling down past 80px). */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - last.current;
      if (Math.abs(diff) > 6) {
        setHidden(diff > 0 && y > 80);
        last.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}
