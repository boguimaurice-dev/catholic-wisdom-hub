/** Copie dans le presse-papiers avec effacement automatique (best-effort). */
export async function copyText(text: string, clearAfterSeconds = 0): Promise<boolean> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = legacyCopy(text);
  }

  if (copied && clearAfterSeconds > 0) {
    window.setTimeout(() => {
      void clearClipboard(text);
    }, clearAfterSeconds * 1000);
  }
  return copied;
}

async function clearClipboard(expected: string): Promise<void> {
  try {
    if (navigator.clipboard.readText) {
      try {
        const current = await navigator.clipboard.readText();
        if (current !== expected) return; // l'utilisateur a copié autre chose entre-temps
      } catch {
        /* lecture refusée : on efface quand même */
      }
    }
    await navigator.clipboard.writeText("");
  } catch {
    /* le navigateur peut refuser hors focus, sans conséquence */
  }
}

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
