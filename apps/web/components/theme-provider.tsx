"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// The no-flash script only does anything in the server HTML. React 19 warns
// about any executable <script> it renders on the client, so there it is
// marked as a data block; next-themes already suppresses the hydration diff.
const scriptProps =
  typeof window === "undefined" ? undefined : { type: "application/json" };

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
