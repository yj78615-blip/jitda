-- Enable Row Level Security on Todo table.
--
-- Supabase's `postgres.<project>` role owns tables created by Prisma and has
-- BYPASSRLS, so our Prisma-based server keeps working.
--
-- Effect: any request coming through Supabase's PostgREST as the `anon` or
-- `authenticated` role (e.g. if the anon key leaks and someone tries direct
-- REST access) is denied by default — no policies exist for those roles.
--
-- To later expose the table to Supabase Auth users, add per-user policies:
--   CREATE POLICY "own todos" ON "Todo"
--     FOR ALL TO authenticated
--     USING (auth.uid() = "userId")
--     WITH CHECK (auth.uid() = "userId");
-- (would require adding a userId column first)

ALTER TABLE "Todo" ENABLE ROW LEVEL SECURITY;
