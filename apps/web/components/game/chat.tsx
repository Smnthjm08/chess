"use client";

import { CHAT_MAX_LENGTH } from "@repo/game-core";
import { useEffect, useRef, useState } from "react";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/game-socket";

const HIDDEN_KEY = "chat-hidden";

export function Chat({
  messages,
  viewerId,
  connected,
  onSend,
  className,
}: {
  messages: ChatMessage[];
  viewerId: string;
  connected: boolean;
  onSend: (text: string) => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [hidden, setHidden] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  // Read after mount, so the server render and the first client render agree.
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      // Storage can be blocked; the chat then just starts shown.
    }
  }, []);

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, hidden]);

  // Cleared on the server's echo rather than on send, so a message it refuses
  // (too fast, say) stays in the box to retry.
  const last = messages.at(-1);

  useEffect(() => {
    if (last?.userId !== viewerId) return;

    setText((draft) => (draft.trim() === last.text ? "" : draft));
  }, [last, viewerId]);

  function toggle() {
    const next = !hidden;

    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
    } catch {
      // Not remembered, but still hidden for this visit.
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Chat</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={!hidden}
          onClick={toggle}
        >
          {hidden ? "Show" : "Hide"}
        </Button>
      </CardHeader>

      {!hidden && (
        <CardContent className="space-y-3">
          <BubbleGroup
            ref={list}
            role="log"
            aria-label="Chat messages"
            className="max-h-48 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Only you and your opponent can see this.
              </p>
            ) : (
              messages.map((message, index) => {
                const mine = message.userId === viewerId;

                return (
                  <Bubble
                    key={index}
                    align={mine ? "end" : "start"}
                    variant={mine ? "default" : "muted"}
                  >
                    <BubbleContent>
                      <span className="sr-only">
                        {mine ? "You" : "Opponent"}:{" "}
                      </span>
                      {message.text}
                    </BubbleContent>
                  </Bubble>
                );
              })
            )}
          </BubbleGroup>

          <form
            onSubmit={(event) => {
              event.preventDefault();

              const trimmed = text.trim();

              if (trimmed) onSend(trimmed);
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={CHAT_MAX_LENGTH}
              disabled={!connected}
              placeholder="Send a message"
              aria-label="Chat message"
              enterKeyHint="send"
              autoComplete="off"
            />
          </form>
        </CardContent>
      )}
    </Card>
  );
}
