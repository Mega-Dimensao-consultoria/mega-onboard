UPDATE public.form_questions
SET mask = REPLACE(mask, '9', '0'),
    updated_at = now()
WHERE field_type = 'masked' AND mask LIKE '%9%';