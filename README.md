# Cricket Mystery Draft 2026

- `index.html`: dark navy/gold draft interface.
- `supabase/schema.sql`: private state table with RLS enabled.
- `supabase/functions/draft/index.ts`: backend logic for randomized captain order, hidden player mapping, one-time box picks and timed reveal.
- Keep your private `setup/roster.json` out of this public repository.

## Supabase
1. Run `supabase/schema.sql` in SQL Editor.
2. Set Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`.
3. Deploy function `draft` from `supabase/functions/draft/index.ts`.
4. Open the website, enter the project URL and anon key, captain names, and choose the private roster JSON.
5. Enable GitHub Pages in Settings → Pages → Deploy from branch → main / root.

Never publish the roster or service-role key. This is an organizer-operated starter, not a fully authenticated multi-device production system; use one trusted organizer device for the event.