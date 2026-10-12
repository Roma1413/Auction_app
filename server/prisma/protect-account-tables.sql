-- Auction accesses these tables through the trusted backend postgres role.
-- No public Data API policies: account access is authorized by Express.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bid" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Watchlist" ENABLE ROW LEVEL SECURITY;
