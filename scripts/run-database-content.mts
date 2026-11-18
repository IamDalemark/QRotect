import { ZodError } from 'zod';
import { main } from './database-content.mjs';
main().catch((error: unknown) => {
  // Never print connection errors, SQL detail or stack traces containing credentials/data.
  if (error instanceof ZodError)
    console.error(
      error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'),
    );
  else if (
    error instanceof Error &&
    !('code' in error) &&
    !/postgres(?:ql)?:\/\//i.test(error.message)
  )
    console.error(error.message);
  else
    console.error(
      'Database operation failed. Check connectivity, privileges and migrations. Uncommitted database changes were rolled back.',
    );
  process.exitCode = 1;
});
