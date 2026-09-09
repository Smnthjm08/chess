"use client";

import { useRouter } from "next/navigation";
import {
  AuthForm,
  useAuthCopy,
  type AuthMode,
} from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type { AuthMode };

/** The `/login` and `/signup` routes. In-app entry points use `AuthDialog`. */
export function AuthPanel({
  defaultMode = "signin",
  next = "/lobby",
}: {
  defaultMode?: AuthMode;
  next?: string;
}) {
  const router = useRouter();
  const { title, description } = useAuthCopy();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <AuthForm
          defaultMode={defaultMode}
          continueHref={next}
          onSuccess={() => {
            router.push(next);
            router.refresh();
          }}
          onDismiss={() => router.push(next)}
        />
      </CardContent>
    </Card>
  );
}
