"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";

// import OTP input
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { createRoomAction } from "@/actions/room";
import { toast } from "sonner";

export type roomTypes = {
  name: string;
  slug?: string;
  isPublic: boolean;
  pin?: string;
};

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState<roomTypes>({
    name: "",
    isPublic: true,
    pin: "",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
  };

  const resetForm = () => {
    setValues({
      name: "",
      isPublic: true,
      pin: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.message("Room name is required");
      return;
    }

    if (!values.isPublic && (!values.pin || values.pin.length < 4)) {
      toast("Private rooms require a PIN of at least 4 digits");
      return;
    }

    setIsLoading(true);

    try {
      const roomData = {
        name: values.name.trim(),
        slug: generateSlug(values.name),
        isPublic: values.isPublic,
        pin: values.isPublic ? undefined : values.pin,
      };

      const result = await createRoomAction(roomData);

      if (result.status === "success") {
        toast.success(result.message);

        resetForm();
        setOpen(false);

        // Redirect to the created room
        if (result.data?.slug) {
          window.location.href = `/room/${result.data.slug}`;
        }
      } else {
        toast.error(result?.message);
      }
    } catch (error) {
      console.error("Create room error:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Room
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Room</DialogTitle>
            <DialogDescription>
              Give your room a name and set the options. Then click create to
              start.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Chill Vibes"
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex gap-4 items-center justify-between">
              <Label htmlFor="public-toggle">Anyone can join?</Label>
              <Switch
                id="public-toggle"
                checked={values.isPublic}
                onCheckedChange={(checked) => handleChange("isPublic", checked)}
                disabled={isLoading}
              />
            </div>

            {!values.isPublic && (
              <div className="grid gap-4">
                <Label className="text-center">Access PIN (4-6 digits)</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={values.pin}
                    onChange={(val) => handleChange("pin", val)}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
