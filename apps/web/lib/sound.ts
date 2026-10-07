export type Sound = "move" | "capture" | "check" | "end" | "low-time";

export function moveSound(san: string): Sound {
  if (/[+#]/.test(san)) return "check";
  if (san.includes("x")) return "capture";

  return "move";
}

export function playSound(sound: Sound) {
  // Browsers refuse audio until the page has had a click or a keypress.
  new Audio(`/sounds/${sound}.m4a`).play().catch(() => {});
}
