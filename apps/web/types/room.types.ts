export interface Room {
  id: string;
  slug: string;
  name: string;
  isPublic: boolean;
  pin: string | null;
  createdAt: Date;
  updatedAt: Date;
}
