"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              The page could not be loaded. If the server was restarting, trying
              again usually works.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/lobby" />}
            >
              Lobby
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}
