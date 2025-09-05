
-- rpc_get_random_anecdote.sql
create or replace function public.get_random_anecdote()
returns table (anecdote_id uuid, text text, category text, progression int)
language sql
security invoker
set search_path = public
as $$
  select a.anecdote_id, a.text, a.category, a.progression
  from public.anecdotes a
  where a.is_active = true
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_anecdote() to anon, authenticated;
