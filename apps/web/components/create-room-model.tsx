"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Lock, Globe, Music2, Users, Settings } from "lucide-react";

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (roomData: RoomData) => void;
}

interface RoomData {
  name: string;
  description: string;
  type: "public" | "private";
  pin?: string;
  genre: string;
  maxParticipants: number;
  allowVoting: boolean;
  allowSongRequests: boolean;
}

export function CreateRoomModal({
  open,
  onOpenChange,
  onCreateRoom,
}: CreateRoomModalProps) {
  const [formData, setFormData] = useState<RoomData>({
    name: "",
    description: "",
    type: "public",
    pin: "",
    genre: "",
    maxParticipants: 20,
    allowVoting: true,
    allowSongRequests: true,
  });

  const [errors, setErrors] = useState<Partial<RoomData>>({});


  const validateForm = () => {
    const newErrors: Partial<RoomData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Room name is required";
    }

    if (!formData.genre) {
      newErrors.genre = "Please select a genre";
    }

    if (formData.type === "private" && !formData.pin) {
      newErrors.pin = "PIN is required for private rooms";
    }

    if (
      formData.type === "private" &&
      formData.pin &&
      formData.pin.length < 4
    ) {
      newErrors.pin = "PIN must be at least 4 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCreateRoom(formData);
      setFormData({
        name: "",
        description: "",
        type: "public",
        pin: "",
        genre: "",
        maxParticipants: 20,
        allowVoting: true,
        allowSongRequests: true,
      });
      setErrors({});
    }
  };

  const updateFormData = (field: keyof RoomData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5" />
            Create New Music Room
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name *</Label>
              <Input
                id="room-name"
                placeholder="Enter a catchy room name..."
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your room's vibe and music style..."
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Room Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.type === "public" ? "default" : "outline"}
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => updateFormData("type", "public")}
              >
                <Globe className="h-5 w-5" />
                <span className="font-medium">Public</span>
                <span className="text-xs text-muted-foreground">
                  Anyone can join
                </span>
              </Button>
              <Button
                type="button"
                variant={formData.type === "private" ? "default" : "outline"}
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => updateFormData("type", "private")}
              >
                <Lock className="h-5 w-5" />
                <span className="font-medium">Private</span>
                <span className="text-xs text-muted-foreground">
                  Requires PIN to join
                </span>
              </Button>
            </div>

            {formData.type === "private" && (
              <div className="space-y-2">
                <Label htmlFor="pin">Room PIN *</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4+ character PIN"
                  value={formData.pin}
                  onChange={(e) => updateFormData("pin", e.target.value)}
                  className={errors.pin ? "border-destructive" : ""}
                />
                {errors.pin && (
                  <p className="text-sm text-destructive">{errors.pin}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-participants">Max Participants</Label>
              <Select
                value={formData.maxParticipants.toString()}
                onValueChange={(value) =>
                  updateFormData("maxParticipants", Number.parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 people</SelectItem>
                  <SelectItem value="10">10 people</SelectItem>
                  <SelectItem value="20">20 people</SelectItem>
                  <SelectItem value="50">50 people</SelectItem>
                  <SelectItem value="100">100 people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Room Features
            </Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium">Allow Voting</p>
                  <p className="text-sm text-muted-foreground">
                    Let participants vote on songs in the queue
                  </p>
                </div>
                <Switch
                  checked={formData.allowVoting}
                  onCheckedChange={(checked) =>
                    updateFormData("allowVoting", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium">Allow Song Requests</p>
                  <p className="text-sm text-muted-foreground">
                    Let participants add songs to the queue
                  </p>
                </div>
                <Switch
                  checked={formData.allowSongRequests}
                  onCheckedChange={(checked) =>
                    updateFormData("allowSongRequests", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2">
              <Music2 className="h-4 w-4" />
              Create Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
