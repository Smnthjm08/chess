import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>
              That game or player does not exist, or the link is mistyped.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/lobby" />}>
              Back to the lobby
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}
