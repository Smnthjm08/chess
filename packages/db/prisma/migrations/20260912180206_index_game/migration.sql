-- CreateIndex
CREATE INDEX "Game_status_whiteId_idx" ON "Game"("status", "whiteId");

-- CreateIndex
CREATE INDEX "Game_status_blackId_idx" ON "Game"("status", "blackId");
