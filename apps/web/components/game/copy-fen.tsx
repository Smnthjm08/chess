"use client";

import { Check, ClipboardCopy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyFen({ fen }: { fen: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
    } catch {
      toast.error("Could not copy the FEN.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copy FEN"
      title="Copy FEN"
      onClick={copy}
    >
      {copied ? <Check /> : <ClipboardCopy />}
    </Button>
  );
}
