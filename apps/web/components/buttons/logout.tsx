"use client";

import { authClient } from "@repo/shared/auth/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    toast.success("Logged out successfully");
    router.push("/signin");
  };

  return (
    <Button
      variant={"destructive"}
      size={"sm"}
      className="hover:cursor-pointer"
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
}
