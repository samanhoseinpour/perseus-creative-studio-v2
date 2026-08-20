-- The manual timezone override is gone: the zone is DERIVED from the browser
-- (which reports the OS's, so it follows a real move) and never chosen. A
-- pinnable setting could only make dates wrong — pin, relocate, and every date
-- is silently a day off with nothing on screen to explain it. Safe to drop:
-- every row was still `true`, so nobody had pinned anything.
ALTER TABLE "user" DROP COLUMN "timezone_auto";