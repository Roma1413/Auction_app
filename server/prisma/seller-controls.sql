ALTER TABLE public."Auction" ADD COLUMN IF NOT EXISTS "closureType" TEXT;
ALTER TABLE public."Auction" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE public."Auction" ADD COLUMN IF NOT EXISTS "winnerId" TEXT;
CREATE TABLE IF NOT EXISTS public."Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON public."Notification"("userId", "createdAt");
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
