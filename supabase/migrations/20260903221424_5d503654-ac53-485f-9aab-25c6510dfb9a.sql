INSERT INTO public.woredas (name)
SELECT n FROM (VALUES ('Woreda 01'),('Woreda 02'),('Woreda 03')) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.woredas w WHERE w.name = v.n);

INSERT INTO public.zones (woreda_id, name)
SELECT w.id, z.n
FROM public.woredas w
CROSS JOIN (VALUES ('Zone 1'),('Zone 2'),('Zone 3')) AS z(n)
WHERE NOT EXISTS (
  SELECT 1 FROM public.zones zz WHERE zz.woreda_id = w.id AND zz.name = z.n
);