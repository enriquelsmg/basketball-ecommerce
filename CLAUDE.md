# Engineering instructions

## 1. Purpose, scope, and authority

Build a polished public-portfolio frontend for basketball merchandise: jerseys, basketballs, nets, hoops, and equipment.

**Status:** paths, scripts, configurations, integrations, and supporting documents below are planned until implemented and verified. Imperatives are mandatory; items marked **Proposed** or **Recommendation** require adoption. Inspect existing work before changing it. Obtain approval before changing scope, thresholds, required checks, or the hook budget.

**Approved:** Spanish UI (`es-ES`), EUR, Spanish demo market; catalog browsing/search/filtering/sorting; product details and applicable variants; cart editing; simulated guest checkout with delivery details, shipping, taxes, discounts, stock constraints/reduction, and confirmation; deterministic demo reset; PR demonstrations and evidence-backed releases.

**Excluded without approval:** backend, database/browser persistence, accounts/authentication, real payments/fulfillment, administration, wishlists, reviews, analytics, and a runtime theme switcher. Never collect card details. **No production deployment.**

Use free tooling/services only: no paid runners, overages, or trial-dependent infrastructure. Drop paid-only integrations with documented gaps and updated gates. Outages, rate limits, and missing setup are unavailable verification, not grounds to remove an adopted gate or report success.

**Pending adoption/setup:**

- Proposed workflow: short-lived branches → PRs into `main`; semantic-release creates protected `vX.Y.Z` tags and GitHub Releases after successful gates. Adopt the merge strategy before configuring commit validation.
- Proposed vulnerability gate: Dependency-Check CVSS >= 7; npm audit high/critical.
- Choose a free preview host; recommendation: Cloudflare Pages Direct Upload for previews only.
- Owner activates protections, integrations, and credentials. Require accountable maintainer review; require another reviewer only when available and agreed. Resolve material findings or document their approved disposition before merge.

## 2. Stack and engineering principles

Use **React, strict TypeScript, Tailwind CSS, Vite, npm, React Router**, React's built-in state, and project-owned UI components. Testing: **Vitest, React Testing Library, user-event, jsdom, Playwright**. Delivery: **ESLint with eslint-plugin-sonarjs, Husky, GitHub Actions, semantic-release, OWASP Dependency-Check, CodeRabbit**. Contracts: **OpenAPI, Swagger UI, Redocly CLI, openapi-typescript, Ajv, ajv-formats** using free local tooling.

- **KISS:** choose the simplest clear design satisfying current behavior and quality gates. Prefer straightforward composition and explicit data flow; justify additional layers, abstractions, configuration, and dependencies through demonstrated need. Simplicity must not weaken correctness, tests, accessibility, contracts, or security.
- Apply **SOLID, DRY, YAGNI, and reusability** pragmatically: cohesive modules, explicit dependencies, and extraction of actual shared responsibilities; no speculative frameworks or premature generalization.
- Propose additional/replacement frameworks, state/router/UI libraries, or tooling before adoption.
- Use ESM and English identifiers; narrow `unknown` at boundaries and justify type escapes. Keep business rules independent of React, browser APIs, and adapters.
- Pin compatible supported Node LTS/npm versions; commit one `package-lock.json`; install with `npm ci`. Keep local/CI versions aligned. Verify engines, commands, configuration, and integration capabilities against current official documentation; avoid unpinned `latest`.
- Use current ESLint flat configuration and Tailwind's supported Vite/CSS-first integration. Exclude dependencies, build/report output, secrets, and local environment files from Git; intentionally committed generated contracts and safe examples are exceptions.
- Add a compatible pinned `eslint-plugin-sonarjs` dev dependency and apply `sonarjs.configs.recommended` alongside TypeScript/React configuration. Supply type information where required; avoid duplicate plugin registration and accidental rule overrides. Enforce SonarJS through local and CI lint; document narrowly justified exceptions instead of disabling rules to pass gates. This free ESLint integration requires no SonarQube server or subscription.

## 3. Architecture: ownership, dependencies, and loading

### Scope Rule

Place **every module and test helper**—including components, hooks, logic, services, contracts, types, and schemas—in the narrowest scope containing its actual consumers. Apply recursively:

| Planned scope | Responsibility |
| --- | --- |
| `src/app/` | Bootstrap, shell, routing, providers, adapter composition. |
| `src/features/{catalog,cart,checkout}/` | Feature-owned implementation. |
| Feature `pages/<page>/` | Page-exclusive code. |
| Feature `shared/<responsibility>/` | Actual reuse across that feature's pages. |
| `src/shared/commerce/` | Commerce responsibilities shared across features. |
| `src/shared/ui/`, `src/shared/theme/` | Approved reusable primitives and semantic tokens. |
| `contracts/openapi.yaml` | API documentation/composition entry point. |
| `tests/e2e/` | Cross-page journeys and scoped fixtures. |
| `config/coverage-policy.ts` | Source-to-risk mapping. |
| `tools/`, `.github/workflows/` | Automation and orchestration. |

Create scopes only when needed. When consumers expand, relocate only the shared responsibility to their nearest common parent and update imports. Never leave shared code inside one consuming page, promote whole pages for small reuse, or create global dumping grounds.

Expose narrow public interfaces. Prohibit page-to-page imports, sibling-feature-internal imports, shared-to-consumer dependencies, and cycles. Enclosing composition may assemble children through public interfaces; reusable code receives specialized behavior through typed inputs/callbacks. Use type-only imports and avoid barrels mixing initialization, shared logic, and deferred UI.

Keep schemas/generated validators in their owning scope; documentation aggregation does not change runtime ownership. Keep state at its narrowest suitable runtime owner: filesystem scope, state lifetime, and loading strategy are separate decisions.

Enforce practical ESLint import restrictions for aliases and relative paths; review resolved dependencies and dynamic imports. `no-restricted-imports` alone does not prove cycle absence or enforce dynamic-import boundaries. Propose additional graph tooling only if necessary.

### Lazy loading

Keep the initial shell/catalog available; defer product details, cart, checkout, and confirmation UI where justified. Use supported router loading or module-scope React `lazy`/dynamic imports. Keep cart state/contracts/services independent of the cart page; audit indirect imports, providers, and entry points for accidental eager dependencies.

Provide cohesive loading/error boundaries and recovery; disclose that a full reload resets the demo. Avoid tiny-component fragmentation, forced directory-to-chunk mappings, and duplicated business logic. Record intentional prefetching. Verify production module/chunk information and browser requests; never infer loading from folders or test generated chunk filenames/import spelling.

## 4. Commerce, in-memory behavior, and API contracts

### Domain and state

- Document deterministic fixture rules before implementation: product/variant/cart identity; search normalization, combined filters and sorting; delivery regions, tax display/rates, shipping tariffs, discount eligibility/expiry/stacking/order, rounding, quote changes, and duplicate submission. Demo policies are not authoritative Spanish legal/tax rules.
- Represent money in integer euro cents with precise intermediate calculations and explicit rounding; format with `Intl.NumberFormat` (`es-ES`, `EUR`). Use one order-breakdown source; never calculate from formatted strings.
- Require positive integer quantities and validate stock at mutation and checkout. Successful checkout creates one order, reduces stock, and clears the purchased cart; failure must not partially mutate state. Test repeated submissions.
- Create private mutable storage per application/test instance. Components consume typed hooks/services and immutable snapshots through narrow asynchronous ports for catalog, cart, quotes, submission, and order lookup. Define validation, cancellation/stale-result semantics, and discriminated errors, including missing items, stock/discount conflicts, invalid inputs, and temporary failures.
- Preserve state across client navigation; refresh restores seeds and clears cart/orders/customer data. Tabs/sessions remain independent. Visible reset also clears dependent UI and prevents stale asynchronous work restoring old state. A refreshed confirmation URL shows an unavailable/demo-reset state. Reset is a demo lifecycle operation, not a future destructive HTTP endpoint.
- Support loading, empty, success, and failure states. Inject clocks, IDs, and faults where needed; isolate tests and avoid random delays.
- Select adapters at one `src/app/` composition point. Future HTTP adoption should mainly replace adapter/configuration; keep transport details out of UI/domain code. Do not implement it speculatively.

Label transactions as simulations; use fictional test data and do not log delivery details. The future backend owns authoritative validation, pricing/tax/shipping/discounts, stock concurrency, idempotency, authentication/authorization, and transaction integrity. Frontend checks cannot enforce these guarantees.

### Contract source of truth

Use **OpenAPI 3.1.2 plus referenced canonical JSON Schema 2020-12 payload schemas**, declaring their dialect. Describe approved operations, parameters, requests/responses, examples, and errors. Keep authored schemas scoped; generate types/validators rather than duplicate DTO definitions. Test intentional domain/API mappings.

- Redocly CLI validates/bundles OpenAPI; `openapi-typescript` generates API types; Ajv's 2020-12 support and needed `ajv-formats` generate standalone payload validators. Do not validate the whole OpenAPI document as a payload schema or compile schemas inside React.
- Validate seeds, examples, valid/invalid payloads, adapter responses, and errors with reusable contract tests. Run the same applicable suite against a future HTTP adapter. Schema validation does not replace business rules.
- Fail CI on invalid contracts or generated drift **before build regeneration can conceal it**. Type-generator `--check` covers types only; regenerate validators into a clean temporary location and compare complete file inventories/content, including missing/extra files. Never hand-edit generated code.
- Serve bundled Swagger UI separately from the eager shopping bundle; label it as the future interface simulated in memory. Set `supportedSubmitMethods: []` and `validatorUrl: "none"`; do not imply live endpoints or require paid hosting.

## 5. TDD, testing, and coverage

For each small behavior/regression: **Red**—write/run a meaningful test and observe the intended failure; **Green**—implement the simplest maintainable solution; **Refactor**—improve structure while green; **Verify**—run appropriate wider checks. Setup failures do not establish Red. Never present retrospective tests as TDD. Validate infrastructure/configuration appropriately instead of inventing behavioral tests.

Use a pyramid: unit tests are the largest layer for rules/calculations; integration tests cover component/state/service/adapter collaboration; fewer Playwright journeys protect complete core workflows. Maintain a behavior-to-test matrix. Cover happy paths, boundaries, invalid inputs, failures, and regressions; put detailed combinations at lower layers.

| Tier | Classification | Lines, statements, functions, branches |
| --- | --- | --- |
| Core | All approved shopping behavior, including discovery/search/filter/sort, variants, cart, commerce calculations, checkout/confirmation, relevant failures, state/reset, and production in-memory behavior. | **100% each** |
| Important | Generic interactions, composition/navigation, loading/error presentation, and deferred-UI recovery not implementing core rules. | **80% each** |
| Supporting | Approved informational/promotional content and low-risk presentation. | **60% each** |

- Classify every authored runtime module unambiguously in `config/coverage-policy.ts`; mixed responsibilities inherit the stronger tier. Never downgrade code to pass or create features to populate tiers.
- Run complete unit/integration coverage with explicit source inclusion, including unimported files and in-memory adapters. Enforce each tier separately at Vitest's root coverage configuration or through validated reports; specify all four metrics, not a blended total. Vitest projects may separate Node/jsdom environments; do not configure coverage per project.
- Justify exclusions individually: tests, declarations, tooling configuration, or generated outputs. Generated validators are runtime code and require contract/freshness verification. Preserve HTML/machine-readable coverage and tier mapping.
- Assert observable behavior using semantic queries and realistic interactions. Mock external boundaries, not every collaborator. No assertion-free/trivial tests, indiscriminate snapshots, coverage padding, weakened assertions, test-specific production behavior, unjustified skips, ordering dependence, arbitrary waits, or retries hiding flakiness.
- Test the built `dist/` with Chromium, Firefox, WebKit, and representative mobile viewport/touch flows. Protect selection → cart → discount → checkout → confirmation plus representative failure/recovery, keyboard, refresh/reset/isolation, and deferred-navigation behavior. Use synthetic diagnostics; emulation is not real-device verification.

## 6. Design and accessibility

Use one restrained earthy system: consistent typography, spacing, surfaces, borders, radii, shadows, and few purposeful variants. Centralize semantic tokens in `src/shared/theme/tokens.css` with supported Tailwind theme integration; use `@theme inline` when referencing other variables. Keep all UI states coherent, transitions subtle, and motion reducible. Use licensed/original assets with attribution; avoid implied brand affiliation.

Target WCAG 2.2 AA practices: semantic HTML, labels/alternatives, keyboard access, visible unobscured focus, contrast, usable targets, associated field errors, meaningful status announcements, and intentional navigation/dialog focus. Prefer native controls. Verify responsive layouts, zoom/reflow, long Spanish content, keyboard flows, and reduced motion manually and through suitable tests; automation alone does not prove conformance.

## 7. Planned command interface

Implement these scripts before claiming they run. Use pinned local executables; document runtime/browser installation. `npm ci` requires the committed manifest/lockfile. Initialize Husky through its supported prepare lifecycle.

| Command | Responsibility |
| --- | --- |
| `npm run dev` | Vite development server. |
| `npm run lint` | ESLint including SonarJS; no errors/warnings. |
| `npm run typecheck` | All app/test/tooling TS projects; not only an empty solution config. |
| `npm run build` | Actual production build to `dist/`, including static API docs. |
| `npm run preview` | Serve `dist/` at a documented strict address/port. |
| `npm run test:unit` | Complete unit suite. |
| `npm run test:integration` | Complete integration suite. |
| `npm run test:core` | Complete core-tagged Vitest suite without coverage. |
| `npm run test:coverage` | All Vitest tests, risk-map validation, reports, tier gates. |
| `npm run test:e2e` | Complete Playwright suite against the existing build. |
| `npm run contracts:generate` | Deterministic types and standalone validators. |
| `npm run contracts:check` | Contract/example validation, bundling, generated freshness. |
| `npm run security:dependencies` | Dependency-Check + npm audit, reports and adopted gates. |
| `npm run verify:commit` | Lint + build + core tests, once each. |
| `npm run verify` | Lint, typecheck, contracts, full Vitest coverage, build, E2E; report security separately. |
| `npm run release` | Pinned semantic-release; trusted release-branch CI only, after all required gates. |

Use supported commands such as `vite build`, `vitest run --coverage`, `vitest run --tags-filter=core`, and `playwright test`; configure tag support and browser installation for pinned versions. A successful Vite build does not establish successful type checking.

## 8. Pre-commit: mandatory 10-second budget

Husky must run `verify:commit` on every commit: **ESLint including SonarJS + actual production build + complete core unit/integration verification**. Measure the combined wall time on a documented reference machine with dependencies installed; report cold/warm conditions. The **10-second** target is unverified until measured; a timeout or cached old pass is not compliance.

Tag every core-protecting Vitest test `core`; execute the entire set, including shared-dependency coverage. Fail empty/incomplete selection against the behavior/test inventory once core behavior exists. For infrastructure-only bootstrap, report non-applicability instead of adding placeholder tests.

Keep coverage, installation, security scans, and E2E outside the hook. Staged linting must handle configuration/shared effects. Verify committed content using safe snapshot/restoration or stop clearly when unstaged work prevents faithful checking; never discard work or auto-stage fixes. Parallelize only without write races.

If safe optimization cannot meet the budget, retain all checks, report timings/options, and obtain approval before changing the arrangement. CI enforces gates independently.

## 9. CI, security, previews, and releases

### Meaningful commits

- Commit one coherent, verified increment at a time; keep unrelated changes separate. Complete Red → Green → Refactor before committing; demonstrate Red through execution evidence, not deliberately failing commits.
- Use Conventional Commits: `type(scope): concise imperative description`; scope names the affected responsibility. Explain non-obvious reasons/tradeoffs in the body and reference relevant issues/PRs. Avoid vague messages such as `updates` or `fix stuff`.

| Commit meaning | Release effect |
| --- | --- |
| `feat(cart): support quantity updates` | Minor. |
| `fix(checkout): prevent duplicate orders`; `perf(catalog): reduce filter work` | Patch. |
| Any type with `!` or a parsed `BREAKING CHANGE:` footer | Major; document impact and migration in the footer. |
| `docs`, `test`, `refactor`, `style`, `build`, `ci`, `chore` | No release alone unless breaking or covered by an approved release rule. |

- The highest relevant impact since the last release determines the bump. Never mislabel work to force a version. Preserve recognized revert metadata.
- Validate messages entering release history. For squash merges, review the **final squash message**, preserving the overall impact and breaking footer; a valid PR title alone is insufficient.
- **Recommendation:** adopt free `@commitlint/cli` and `@commitlint/config-conventional` in Husky's `commit-msg` hook and PR CI. Syntax validation complements review of meaning; preserve all pre-commit checks and the 10-second budget.

### Pipeline

After workflow adoption, run PR/`main` CI; release only from successful trusted release-branch runs, never recursively from generated tags. Schedule trusted vulnerability-data updates/fresh scans. Reuse repository scripts:

1. Lockfile installation; commit-message validation, lint, typecheck, ownership checks, contracts and freshness.
2. Complete unit/integration suites and tier coverage.
3. Build once; run the complete Playwright suite against that artifact without reusing an unrelated CI server.
4. Required dependency/security scans with valid, fresh data.
5. Required `quality-gate` depends on all mandatory jobs and rejects failed, cancelled, missing, or unexpectedly skipped prerequisites. Only successful gates permit authorized publication.

Use standard free public-repository runners; cache dependency downloads by OS/runtime/lock hash with trust separation. Bound jobs and artifact storage: initial timeouts are 10 minutes for validation/build, 15 for Vitest, 25 for E2E, and 30 for scans; initial PR artifact retention is seven days. Preserve failure reports, coverage, scanner output, Playwright traces/screenshots. Cancel stale PR runs and serialize publication where necessary.

### Trust boundary

Default tokens to read-only; scope publication permissions/secrets narrowly. Pin actions to verified full commit SHAs and tools/images to immutable versions/digests. Never expose secrets to frontend bundles, logs/artifacts, or untrusted PR execution. Do not execute PR code through `pull_request_target` or in a privileged publisher. Prevent untrusted cache poisoning; handle metadata as data, not interpolated shell code.

Publishers upload already-tested static artifacts without installing/executing PR code. Cross-check repository, approved workflow/event/run, current PR revision, successful checks, and artifact identity/digest against trusted GitHub metadata. Track head/base/**actual tested SHA**; synthetic merge commits differ from heads. Reject traversal, symlinks, unexpected executable/configuration files, Functions, and worker entry points. A supplied manifest alone is insufficient. Require maintainer authorization for public fork previews.

### Security checks

- Keep **OWASP Dependency-Check**; npm audit complements it and partly overlaps its data, not replaces it. Verify supported release/runtime/npm-lock compatibility and actual npm/Node Audit/RetireJS coverage; include development dependencies and report analyzer gaps/false positives.
- Refresh compatible NVD/RetireJS data in trusted serialized jobs; keep any NVD key there and provide verified snapshots to unprivileged scans. Adopt/enforce a freshness limit. Missing/stale data or scanner/network failures cannot pass. `--noupdate` does not disable every analyzer's network use. Disable optional OSS Index if free access/credentials are unestablished and disclose the gap.
- Preserve HTML/JSON findings and exit statuses. The proposed gates map to `--failOnCVSS 7` and `npm audit --audit-level=high --json`; adopt policy before enforcing releases. Keep lower/unknown severities visible. Exceptions require maintainer approval, exact dependency/version/finding, rationale, owner, issue, expiry, and relevant compensating controls; revalidate and include them in evidence. Never suppress outages or broad dependency classes.
- **CodeRabbit:** verify free public-repository eligibility; owner installs/scopes the app and validates `.coderabbit.yaml` against its schema. Record actual review/revision/findings: skipped or rate-limited reviews can satisfy its status check. Keep AI review separate from deterministic gates and human review.
- Recommendation: add free public-repository source/secret scanning when available. The **OWASP Top 10 describes risks**; no scanner, AI review, or passing pipeline proves complete coverage or production security.

### PR demonstrations

Attach the tested build and concise visual evidence; distinguish artifacts from live previews. Activate hosting only after provider adoption/setup. For the recommended Cloudflare Direct Upload option, publish the tested static artifact to an explicit non-production branch, verify the destination, disable production deployment, check deep links, and expire obsolete previews within free quotas. Use the trusted publication boundary above.

### Releases

Configure pinned **semantic-release** in planned `release.config.mjs`: explicit adopted release branch, `v${version}` tags, `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, a small local evidence-validation integration, and `@semantic-release/github`. Install a compatible `conventional-changelog-conventionalcommits` preset and configure it consistently in both analysis and notes, including required `presetConfig`. Explicitly omit npm publishing and generated Git release commits; the tag/release metadata owns the version, without changing tested source or rebuilding `dist/`.

Fetch full history/tags and serialize publishers. Require adopted policies, fresh security evidence, and **all gates passing for the exact release commit**. In `verifyRelease`, validate computed version/SHA, required evidence completeness/provenance/checksums, and finalize versioned evidence metadata **before tagging**; asset globs alone do not prove completeness. Never reuse unrelated PR results. A dry run does not verify publication and still checks push permissions; keep credentials out of untrusted runs.

Generate readable release notes with features, fixes, relevant maintenance/security changes, breaking migrations, and commit/PR links. Configure note visibility deliberately without changing bump rules. Use the GitHub plugin's `draftRelease: true` and `assets`; verify uploaded assets/digests before publishing the draft in the same trusted workflow. Give only the trusted publisher necessary `contents: write`; disable unnecessary issue/PR comments and labels. Do not depend on token-generated release events launching further verification. Report partial failures and recover deliberately; never silently overwrite evidence or reuse published tags.

Attach the exact tested build/API docs, unit/integration/E2E results, HTML/machine-readable coverage with tier outcomes, security findings/policy/exceptions, contract/freshness results, and release notes/limitations/review status. Include an evidence manifest with tag/version, full tested SHA, workflow IDs/URLs, tool versions, lockfile hash, scan/data timestamps, gate results, and asset checksums plus `SHA256SUMS`. Keep evidence as durable release assets, not solely expiring CI artifacts. **Releases never deploy to production.**

## 10. Documentation, completion, and reporting

Create documentation with implementation: `README.md` for setup/commands/demo use; `docs/product.md` for policies/test matrix/assets; `docs/architecture.md` for boundaries/state/adapters/loading; `docs/verification.md` for coverage/browser/accessibility/hook measurements; `docs/delivery.md` for adopted policies, integrations, permissions, exceptions, and evidence.

**Done means:** approved behavior implemented through incremental TDD; meaningful tests and applicable gates pass; scope/dependency/loading rules hold; contracts/generated outputs/fixtures/risk mapping/docs are current; responsive accessible Spanish UI and relevant lifecycle/failure paths are verified; hook requirements remain intact; commits describe their actual impact and PR/release evidence satisfies publication rules. Unavailable required verification blocks gated publication.

Report changes/reasons, executed commands/results, observed Red/Green outcomes, measured tier coverage and hook timing, relevant architecture/loading/accessibility checks, and remaining risks/unverified work. Never claim inspection, execution, coverage, security, previews, or releases without evidence; never weaken checks to claim completion.

### Official references

Recheck current official documentation when implementing/upgrading:

- [Vite](https://vite.dev/guide/), [React lazy](https://react.dev/reference/react/lazy), [React Router](https://reactrouter.com/start/modes), [Tailwind](https://tailwindcss.com/docs/theme), [Husky](https://typicode.github.io/husky/get-started.html), [SonarJS for ESLint](https://github.com/SonarSource/SonarJS/blob/master/packages/analysis/src/jsts/rules/README.md).
- [Vitest coverage](https://vitest.dev/config/coverage), [tags](https://vitest.dev/guide/test-tags), [Playwright CI](https://playwright.dev/docs/ci), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [OpenAPI](https://spec.openapis.org/oas/v3.1.2.html), [type generation](https://openapi-ts.dev/cli), [Redocly](https://redocly.com/docs/cli/commands/lint), [Ajv](https://ajv.js.org/standalone.html), [Swagger](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).
- [Dependency-Check](https://github.com/dependency-check/DependencyCheck), [CodeRabbit](https://docs.coderabbit.ai/pr-reviews/status-check), [GitHub security](https://docs.github.com/en/actions/reference/security/secure-use), [preview upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), [commitlint hooks](https://commitlint.js.org/guides/local-setup.html), [semantic-release configuration](https://semantic-release.org/usage/configuration/), [release lifecycle](https://semantic-release.org/foundation/release-steps/), [commit analysis](https://github.com/semantic-release/commit-analyzer), [release notes](https://github.com/semantic-release/release-notes-generator), [GitHub releases/assets](https://github.com/semantic-release/github).
