import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type scale in globals.css. Unregistered, `text-caption` reads as a colour
// and is dropped whenever a real colour like `text-muted-foreground` follows it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-xl",
        "display-lg",
        "display-md",
        "display-sm",
        "stat",
        "title-lg",
        "title-md",
        "title-sm",
        "body-md",
        "body-sm",
        "caption",
        "caption-upper",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
