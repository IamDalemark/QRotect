import { z } from 'zod';

const configSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  publishableKey: z.string().trim().min(1),
});

export function getSupabaseConfig(input?: {
  url: string | undefined;
  publishableKey: string | undefined;
}) {
  // Server-only overrides keep local review isolated from frozen NEXT_PUBLIC build settings.
  const environment = process.env;
  const result = configSchema.safeParse(
    input ?? {
      url: environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey:
        environment.SUPABASE_PUBLISHABLE_KEY ?? environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  );

  if (!result.success) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local before using database features.',
    );
  }

  return result.data;
}
