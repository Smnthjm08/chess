-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "forkedFromId" TEXT,
ADD COLUMN     "forkedFromPly" INTEGER,
ADD COLUMN     "startFen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

