-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_done_dueDate_idx" ON "Todo"("done", "dueDate");
