-- Brain Gym helper works across every module, in one of four modes:
--   coach   (exercises: nudges only, never the answer)
--   tutor   (lessons, history, AI briefing: explains freely and goes deeper)
--   reflect (close, weekly review: asks, never writes the reflection)
--   review  (an exercise already completed: can now discuss the answer openly)

ALTER TABLE public.bg_coach_messages
    ADD COLUMN IF NOT EXISTS mode text CHECK (mode IN ('coach', 'tutor', 'reflect', 'review'));

ALTER TABLE public.bg_coach_messages DROP CONSTRAINT IF EXISTS bg_coach_messages_move_check;
ALTER TABLE public.bg_coach_messages ADD CONSTRAINT bg_coach_messages_move_check CHECK (move IN (
    'question', 'pointer', 'method', 'example', 'feedback', 'concept', 'decline',
    'explain', 'deeper', 'connect', 'further_reading', 'check_understanding', 'mirror'
));
