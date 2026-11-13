# UnDebt — Proposed design (dev)

**Status:** Proposed changes on `dev`, including the current in-progress worktree changes. Not production until merged to `main`.
**Baseline:** See [production design](./production.md). Keep this page and `dev.html` aligned with each material code change or requested design refresh.

## Proposed solution

Extend loan setup and projection to support dated repayment stages rather than one recurring payment per loan. Keep the existing Expo/React Native client, Supabase Auth/Postgres backend, and account-row ownership model. Persist the expanded schedule in the existing `payments` and `interest_rates` JSONB fields; the current proposal does not add a table or migration. A separate pure TypeScript `loanSchedules` module handles draft creation, date helpers, and schedule validation.

### Architecture and interactions

1. The account modal initializes a schedule draft for loan type, dates, and defaults. Editing reads prior JSONB entries to restore repayment and promotional periods.
2. Users can define one or more repayment windows (date range, amount, frequency, payment type, and optionally a different rate), plus an interest-only period. Credit cards can choose minimum/full payment and an interest-free range; BNPL schedules constrain frequency choices.
3. Client validation checks dates, required amounts/frequencies, overlaps, loan-term bounds, and coverage of the active term. On save, the app serializes schedule entries into `payments` and rate windows into `interest_rates` on the account row, then uses the existing Supabase update/insert flow.
4. The projection engine selects dated payment events, accrues interest at monthly boundaries, applies payment events, and continues to produce the existing summary metrics and chart series. The compact navigation is also being changed to a vertical sidebar with scrolling.

There is **no proposed database migration**: account ownership/RLS and table shape remain as-is. Proposed JSON examples:

```text
payments[] = {
  type: "Principal and Interest" | "Interest Only" | "Min balance" | "Full payment",
  periodKind?: "interest-only" | "repayment",
  amount?: number, frequency: string, startDate: "YYYY-MM-DD", endDate?: string | null,
  sameInterestRate?: boolean, interestRate?: number
}
interest_rates[] = { rate: number, date: "YYYY-MM-DD", endDate?: string | null, periodKind?: string }
```

Interest-free periods are represented as a dated rate of zero. Existing income, transfer, part-payment, bill, and expense entries remain in `payments`.

## UI changes and calculation rules

- Loan forms expose repayment type, timing, frequency, staged schedules, and rate choice; add/remove schedule controls are restricted by account type. Validation errors are shown before saving.
- The simulator now consumes multiple schedule entries. For a dated rate window it uses the rate applicable to the simulated period; otherwise the account rate default is used. It accrues loan interest on the balance net of eligible offset and applies repayments on generated schedule dates. Interest-only entries without a fixed amount pay accrued interest; full-payment entries pay the balance; other entries use their configured amount.
- Monthly repayment summary totals the annualized configured payment amounts across schedules. Existing balance, interest, offset, financial-year, Save/Spend, and chart UI remains the intended contract.
- Date utilities use UTC ISO calendar dates and clamp month additions to a valid day. Schedule validation requires non-overlapping periods and repayment/interest coverage through maturity where a loan end date exists.

## Data structures

`LoanScheduleDraft` groups interest-only and interest-free toggles/date ranges, credit-card payment type, and an array of `RepaymentScheduleDraft` records. A repayment record includes a transient UI ID, amount text, payment type, frequency, start/end dates, same-rate flag, and optional override rate. Persisted account JSON remains the source of truth; IDs used by the draft are not database keys.

## Known gaps before production merge

1. **Tests:** Add focused tests for schedule validation, legacy JSON compatibility, event-date generation, leap/month-end dates, payment ordering, rate boundaries, and balance/interest results. No test runner or financial regression suite is present currently.
2. **Calculation review:** Confirm payment due-date convention (first payment after the configured start), interest accrual/day-count, rate changes inside a period, minimum-payment rules, credit-card statement timing, and BNPL fee/interest behavior with product requirements. Current estimates are not lender-grade.
3. **Persistence integrity:** JSONB avoids a migration but does not enforce schedule shape. Concurrent edits can overwrite arrays; malformed legacy entries and duplicate/overlapping ranges require explicit handling.
4. **Save/UX:** Verify restored schedules for all legacy account shapes, clearing/replacing schedules, empty end dates, DST/date boundaries, narrow layouts, accessibility, and user-facing validation/errors.
5. **Security/schema:** Recheck RLS using authenticated and anonymous test users; inspect deployed duplicate policies and triggers. Any future normalized schema needs a reviewed migration and backfill plan.
6. **Delivery:** Add a repeatable application build/typecheck and automated calculation tests to CI before treating the proposed feature as production-ready. GitHub Pages deployment only verifies/publishes static documentation.

## Dev → main release and documentation lifecycle

1. Make application and design updates on `dev`. For every material code behavior change, update this file and `dev.html` in the same change; refresh them on explicit design requests even if code is unchanged.
2. Validate affected platform builds/type checks, focused calculation tests, account create/edit/legacy-data flows, and Supabase RLS/migration behavior. Document anything not verified as a gap rather than implying it works.
3. Push `dev`: the GitHub Actions Pages workflow publishes the current `docs/` content. Initial repository Pages configuration must use **GitHub Actions** as the source.
4. Submit a reviewed PR **`dev` → `main`**. Update `production.md` and `production.html` in that PR to describe the exact release being promoted. The Pages workflow enforces this when the PR changes application code. Merge only after checks, review, and explicit acceptance or resolution of readiness gaps; the merge updates production documentation and code together.
5. Deploy application changes and any approved Supabase migration through their release procedures. A Git merge or Pages deployment does not itself deploy the Expo app or apply database migrations.
