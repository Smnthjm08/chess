/*
  Warnings:

  - You are about to drop the column `roomType` on the `room` table. All the data in the column will be lost.
  - Added the required column `hostId` to the `room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."room" DROP COLUMN "roomType",
ADD COLUMN     "hostId" TEXT NOT NULL,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pin" TEXT;

-- DropEnum
DROP TYPE "public"."roomType";

-- CreateIndex
CREATE INDEX "room_slug_id_idx" ON "public"."room"("slug", "id");

-- AddForeignKey
ALTER TABLE "public"."room" ADD CONSTRAINT "room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
