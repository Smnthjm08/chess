import { Plus_Jakarta_Sans } from "next/font/google";

import "../globals.css";
import { Appbar } from "@/components/appbar";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning suppressContentEditableWarning>
      <body
        className={`${font.className} font-sans antialiased h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Appbar />
          <main className="flex-1 overflow-auto">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
