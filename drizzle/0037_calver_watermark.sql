-- Release versions moved from SemVer to CalVer (1.5.0–1.8.0 → 2026.8.1–2026.8.5,
-- see src/lib/releaseFields.ts). Every stored watermark is now a string from the
-- OLD scheme, and compareVersions reads the first segment as a number — so
-- '1.8.0' sorts BELOW '2026.8.1' and unseenFor would hand every existing member
-- the entire back catalogue as unread, three releases of which are
-- announce: 'notice'. That is a five-release interruption for the whole team,
-- and it fires on their next admin page load rather than at a moment anyone
-- chose. So the watermarks are moved with the numbers.
--
-- Set to the newest release that existed BEFORE this deploy, not to the newest
-- release: 2026.8.6 ships in the same push and everyone should see it, exactly
-- as they would have under the old numbering.
--
-- NULL rows are left alone. NULL already means "clean slate as of first sight"
-- and resolves to CURRENT_VERSION through resolveWatermark, which is the right
-- answer for an account that has never seen anything — writing a value here
-- would only rob the protected layout of the catch-up write it does in after().
--
-- Scoped by SHAPE rather than by "not CalVer": an old-scheme version is one
-- whose first segment is a small number, so the predicate is a regex over that
-- and nothing else. No cast, so a junk value in the column cannot raise here —
-- junk is already handled, degrading to CURRENT_VERSION through
-- resolveWatermark. Idempotent by construction: after this runs there is no
-- small-first-segment value left to match.
UPDATE "user"
SET "release_seen_version" = '2026.8.5'
WHERE "release_seen_version" ~ '^[0-9]{1,3}\.';
