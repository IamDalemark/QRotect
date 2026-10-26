# Contributing

## Branches

- `main`: stable release baseline.
- `develop`: integration branch.
- `feature/<short-description>`: scoped implementation work from `develop`.

Bootstrap is the only initial direct commit to `main`. Setup work lives on `feature/project-setup` for review; integrate it into `develop` before starting subsequent features.

Use the following workflow after that integration:

```sh
git switch develop
git switch -c feature/admin-auth
```

Make small, coherent commits with one understandable purpose. Keep package changes and their lockfile changes together. Run checks appropriate to each change, and run `pnpm check` before integration. Add and run meaningful tests with each substantive feature.

Review and merge completed features into `develop`. Promote tested releases from `develop` to `main`. Do not rewrite shared history. Keep commits on feature branches until review/integration is requested.

## Commit messages

```text
type(optional-scope): short description
```

| Type       | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new user-facing feature                             |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation-only changes                            |
| `style`    | Formatting changes without behavior changes           |
| `refactor` | Code changes that neither fix a bug nor add a feature |
| `chore`    | Build tasks, dependency updates, and tooling          |
| `test`     | New or corrected tests                                |

Only these seven lowercase types are allowed. Scopes are optional. Descriptions are required. Keep the complete header within 100 characters. Standard Git-generated merge messages are exempt.

```text
feat(directory): add category filtering
fix(contacts): preserve phone extensions
chore(tooling): configure formatting
```

## Local checks

Installing dependencies runs Husky's setup through the `prepare` script. The pre-commit hook lints staged JavaScript/TypeScript and formats supported staged files. The commit-msg hook runs Commitlint. Hooks provide local checks and can be bypassed by Git; a future remote must run required checks in CI and configure branch protection.

Formatting uses two spaces, semicolons, single quotes, trailing commas, LF line endings, and a 100-character print width. Prettier owns formatting; ESLint checks code quality.

Keep the existing configured Git identity. Do not add an automated co-author or substitute another author. Each contributor should use their own legitimate identity; the initial setup belongs to Daniel Mark Wiegand.

## Secrets and research data

Commit `.env.example` with placeholders only. Never commit local credentials, private contact data, generated build output, dependencies, or test reports. Use reviewed public hotline records and a consenting test contact. The research prototype must not trigger real calls to emergency agencies.
