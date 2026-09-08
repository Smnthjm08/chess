"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteLink() {
  // Read on the client only: the server has no idea what host the visitor
  // reached the page on, and guessing would break the link behind a proxy.
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setUrl(window.location.href), []);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast.error("Could not copy — select the link and copy it by hand.");
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        aria-label="Invite link"
        onFocus={(event) => event.currentTarget.select()}
        className="font-mono text-xs"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={copy}
        disabled={!url}
        aria-label="Copy invite link"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
