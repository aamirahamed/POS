-- Brain Gym: build each morning's session overnight.
-- bg-build-session needs no secret for this call: without the owner's login it can only build today's
-- or tomorrow's session if it is missing, which is idempotent. The second run is a retry.
-- Times are UTC: 16:00 is 3am Melbourne in daylight saving (2am otherwise); 18:30 is 5:30am / 4:30am.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'bg-build-session-nightly',
    '0 16 * * *',
    $$
    SELECT net.http_post(
        url := 'https://iykdzhvlgraafoalzlbf.supabase.co/functions/v1/bg-build-session',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"date": "today"}'::jsonb,
        timeout_milliseconds := 10000
    );
    $$
);

SELECT cron.schedule(
    'bg-build-session-retry',
    '30 18 * * *',
    $$
    SELECT net.http_post(
        url := 'https://iykdzhvlgraafoalzlbf.supabase.co/functions/v1/bg-build-session',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"date": "today"}'::jsonb,
        timeout_milliseconds := 10000
    );
    $$
);
