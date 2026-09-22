# Security dependency maintenance

The September 22, 2026 dependency update replaces the 23 flagged package entries
in the earlier audit with patched releases. The final npm audit reports zero
known vulnerabilities; this is an advisory check, not a comprehensive security
audit or a guarantee against unknown issues.

Pinned release versions include Next.js and eslint-config-next 16.3.6,
next-auth 5.0.0-beta.32, @auth/prisma-adapter 2.11.3, Nodemailer 10.0.10,
and the Prisma CLI/client/libsql adapter together at 7.8.0. The lockfile resolves
@auth/core 0.41.3 and sharp 0.35.4. The existing image-generation removal and
dynamic API no-store policy remain in place.

## Overrides

Several upstream dependency constraints retain vulnerable releases. Overrides
select patched versions without downgrading Prisma. Keep these until an upstream
update naturally resolves to patched versions, then remove them and rerun audit
and compatibility checks.

- Prisma config uses deepmerge-ts 8.0.2. Its named `deepmerge` export is retained;
  Prisma config loading, generation, and disposable-database migrations are tested.
- Prisma development dependencies use @hono/node-server 1.19.17 and valibot 1.5.0.
- mysql2 uses 3.24.4. DreamBook's application database uses libsql, not MySQL.
- Nodemailer is unified with the direct dependency to keep Auth.js on its patched
  version. MIME composition is checked locally without transmitting email.
- @humanfs/node, baseline-browser-mapping, browserslist, esbuild, fast-uri, hono,
  and js-yaml use patched releases. Build and lint checks cover their use here.
- brace-expansion is patched separately within major versions 1 and 2, preserving
  the majors required by the two minimatch dependency branches.

## Verification

Run lint, the production build, pilot unit tests, both migration suites, and the
normal/paused/traffic HTTP suites. HTTP tests use disposable local databases and
include profile-access rejection for anonymous requests, malformed authorization,
and invalid session cookies. No hostile payload or load test is run against
shared production hosting. Live release checks verify public reads, private/admin
access denial, no-store cache headers, ETag behavior, and disabled dream imagery.

Future dependency updates should use the lockfile and repeat these checks. Avoid
blind `npm audit fix --force` changes to major framework or database versions.
