# UnDebt — Proposed dev technical design

**Branch:** `dev` · **Status:** Proposed implementation; not production until merged to `main`.
**Audience:** Technical architects, designers, and developers.
**Production baseline:** [As-is technical design](./production.md). This page describes the full current proposal, including its limitations; code state is authoritative.

## 1. Solution summary and architecture

The dev feature extends the loan form and local simulator from one recurring loan payment to a sequence of dated payment/rate windows. It preserves Expo/React Native, Supabase Auth/Postgres, the `accounts` table, its ownership/RLS model, and existing chart/summary contracts. No schema migration is proposed: typed schedule data is serialized into the existing `payments` and `interest_rates` JSONB arrays.

```mermaid
flowchart LR
  user[User] --> modal[AccountModal]
  modal --> draft[LoanScheduleDraft]
  draft --> validator[loanSchedules validation]
  validator --> app[App.tsx serialization]
  app --> sdk[Supabase JS / PostgREST]
  sdk --> db[(public.accounts JSONB)]
  db --> app
  app --> projection[financialProjection event simulation]
  projection --> screens[Loan / overview / offset metrics and charts]
  nav[Sidebar responsive layout] --> screens
```

### Responsibilities

| Layer/module | Proposed responsibility |
|---|---|
| `components/AccountModal.tsx` | Build/edit repayment draft; expose staged, interest-only, card, and BNPL controls; show validation errors |
| `lib/loanSchedules.ts` | Draft/repayment types, UTC date utilities, defaults, date/overlap/coverage validation |
| `App.tsx` | Convert form draft to persisted JSONB arrays; keep existing account create/update flow |
| `lib/financialProjection.ts` | Parse legacy and new entries, generate payment events, accrue interest, simulate offsets and annual series |
| `lib/paymentEntries.ts` | Preserve activity recurrence, historical balances, Save/Spend flow aggregation |
| `components/Sidebar.tsx` | Use a scrollable vertical navigation/sidebar at compact widths instead of horizontal compact navigation |
| Supabase | Remains auth + row storage; calculation remains client-only |

**Flow:** Edit opens → app passes the selected account → modal restores legacy/new payment and rate entries into a draft → user edits → validation rejects invalid/overlapping/out-of-term/incomplete schedules → `App.tsx` replaces only schedule entry types, preserves other activities, builds rate windows, and inserts/updates the account row → fetch accounts → recompute projections and UI.

## 2. UI and behavior

- **Loan forms:** one or more repayment windows with amount, payment type, frequency, start/end, and optional override rate; add/remove schedule controls for eligible loan types.
- **Interest-only:** optional dated period; a repayment event with no amount is intended to pay accumulated interest.
- **Credit card:** minimum/full choice, monthly cadence, and optional 0% period with normal-rate windows before/after it.
- **Buy Now Pay Later:** default fortnightly repayment; UI limits choices to weekly, fortnightly, monthly, and quarterly.
- **Responsive navigation:** compact layout becomes a vertical, scrollable sidebar; navigation labels/icons remain selectable.
- Existing Overview, Loans, Accounts, offset management, Save, Spend, Help, Settings, chart periods/series, and account CRUD remain in scope and retain existing component contracts.

## 3. Data structures and persistence contract

`LoanScheduleDraft` is form state, not a database entity:

```ts
interface RepaymentScheduleDraft {
  id: string;                  // transient UI key
  amount: string;              // editable text
  type: 'Principal and Interest' | 'Interest Only' | 'Min balance' | 'Full payment';
  frequency: string;
  startDate: string;           // YYYY-MM-DD
  endDate: string;
  sameInterestRate: boolean;
  interestRate: string;        // optional rate override text
}

interface LoanScheduleDraft {
  interestOnlyPeriodEnabled: boolean;
  interestOnlyStartDate: string;
  interestOnlyEndDate: string;
  interestFreePeriodEnabled: boolean;
  interestFreeStartDate: string;
  interestFreeEndDate: string;
  creditCardPaymentType: 'Min balance' | 'Full payment';
  repayments: RepaymentScheduleDraft[];
}
```

### Stored payload

```json
{
  "payments": [
    {
      "type": "Principal and Interest",
      "periodKind": "repayment",
      "amount": 850,
      "frequency": "Monthly",
      "startDate": "2027-01-15",
      "endDate": "2056-12-15",
      "sameInterestRate": false,
      "interestRate": 6.1
    }
  ],
  "interest_rates": [
    { "rate": 6.1, "date": "2027-01-15", "endDate": "2056-12-15", "periodKind": "repayment" }
  ]
}
```

Other stored schedule entries represent interest-only periods in `payments`; credit-card interest-free windows are `interest_rates` entries with `rate: 0` and `periodKind: "interest-free"`. A separate interest-rate entry restores the normal rate after the promotional end. Transient draft IDs are not persisted as account or schedule keys. Existing income, savings transfers, part-payments, bills, and expenses remain in `payments`.

The relational model, enums, RLS, triggers, and indexes are unchanged from [production schema/setup](./production.md#3-persistence-model-and-schema). The same Supabase table writes and SQL diagnostics apply; there is no dev-only migration. Do not apply a schema change for this proposal unless the data-model decision changes.

## 4. Validation and date semantics

`validateLoanScheduleDraft()` currently:

1. Requires valid ISO loan dates; requires a maturity date for non-credit-card loans.
2. Requires at least one repayment draft. Non-card schedules require a positive repayment amount; all schedules require a frequency. A custom rate must be finite and non-negative.
3. Checks interest-only/free date ranges, schedule date order, loan-term bounds, and pairwise non-overlap across repayment and promotional periods.
4. For a loan with an end date, requires continuous coverage from `max(loan start, today)` through maturity by repayment or interest-only/free periods.

Date utilities parse dates as UTC calendar dates, reject impossible dates, add calendar days, and clamp month additions to a valid day. `financialProjection.getNextPayment()` generates the first due date one full configured frequency after the schedule start, then advances from each prior due date. This convention must be confirmed with product/lender requirements; month-end clamping can drift.

## 5. Calculation model

The dev simulator still produces local estimates, not lender-grade statements. It parses valid saved payment/rate arrays, adds monthly interest boundaries, and splits each interval at the next generated repayment event. For each interest interval it selects a rate and computes a prorated period rate:

```text
periodRate = Σ ((annualRate_i / 100 / 12) × (segmentDuration_i / monthDuration))
```

where `annualRate_i` is the annual rate for segment `i`; `monthDuration` is the duration of the containing monthly interval.

```text
interest = max(0, balance - offsetBalance) × periodRate + chargeInterest
```

The offset is capped at loan balance; charge interest is prorated from charge date to interval end. Interest is added before a due payment. Additional part-payments are applied after scheduled payment events, only in the offset-enabled/actual simulation.

| Payment type | Current dev simulation |
|---|---|
| `Full payment` | Pays the entire simulated balance at each generated due date |
| `Interest Only`, no amount | Pays accumulated interest since the last payment, capped by balance |
| `Interest Only`, with amount | Pays the configured amount |
| Principal and Interest | Pays configured amount; no amortization amount is solved from rate/term |
| `Min balance` | Currently falls through to configured amount or zero; no minimum-balance formula is implemented |

The summary converts each configured payment to an annual amount using the frequency multiplier and divides by 12. It does not time-weight amounts by active schedule duration. Account/transaction interest, offsets, Save/Spend formulas, annual sampling, and 30-year horizon are described in [production calculation behavior](./production.md#5-calculation-behavior), except loan payment scheduling is now event-based.

### Screen/component numeric audit (dev)

The complete shared screen-by-screen data lineage, account presets, activity formulas, chart scaling, and known cross-screen inconsistencies are in the [production numeric UI inventory](./production.md#numeric-ui-inventory-and-data-lineage). Those calculations remain in force on `dev`, except for the loan schedule changes below. This table records the dev call paths and deviations so loan-screen values are not mistaken for lender calculations.

| Screen / component | Dev numeric path and precise meaning |
|---|---|
| Overview cards and combined chart | Same formulas as production. The debt/assets supplied to the cards are balances at the projection start date; that is today in years mode, selected FY start in FY mode. The chart uses dev loan simulations for its loan series and existing transaction series for assets. |
| Loans summary | `outstanding` is the projected start balance total (today or FY start), not a newly calculated settlement amount. Scheduled/actual year-N balance and cumulative interest come from the corresponding simulation arrays. “Saved” is scheduled interest minus actual interest, where actual includes both offset benefits and linked extra repayments. |
| Loan summary monthly payments | Dev sums every parsed payment entry: `Σ(amount × periodsPerYear(frequency)) / 12`. `periodsPerYear` is 365/52/26/12/4/2/1 for daily/weekly/fortnightly/monthly/quarterly/half-yearly/annual; unknown text defaults to monthly. This ignores each schedule's active dates, payment type, and overlap in the selected horizon. Missing amount (including a default card minimum) contributes zero; “Full payment” also contributes zero to this run-rate although the simulator may pay the full balance. |
| Loan table | Balance remains as-of-today `currentBalances`. Rate label remains first stored rate entry. Payment amount/frequency still read `payments[0]`, not the first recognized repayment. Dev writes retained non-schedule activities before the new schedules, and may write an amount-less interest-only entry first; therefore the table can show an income/expense amount or `—` as “payment.” |
| Loan chart | Shows each dev event-simulated loan balance and scheduled-only comparison at annual samples, joined linearly. Values are balance at `projectionStartDate + N calendar months`, not the actual monthly path. Schedule boundaries can change within a year without appearing in the chart. |
| Accounts, Loan management, Save, Spend, sidebar, pickers, forms | No calculation change from production. See the production inventory for exact formulas. Linked cash projections still do not accrue interest on offset accounts, and offset summaries still report linked cash balances rather than effective capped/partial interest offsets. |

#### Dev loan calculation: event order and formulas

For each loan the dev simulator starts from the supplied projection-start balance. It chooses the next event as the earliest of (a) one month after the current cursor, (b) the next scheduled payment due date, and (c) maturity/horizon. A payment schedule's first due date is one full frequency interval after its own start date; later dates advance sequentially from the previous due date. Monthly interest-rate windows therefore do **not** make a monthly payment; they only split accrual.

For a month-bounded interval `cursor → next`, the monthly effective rate is:

```text
periodRate = Σ [ (annualRate_i / 100 / 12)
                 × (overlapDuration_i / (nextMonthlyBoundary − cursor)) ]
baseInterest = max(0, currentLoanBalance − offsetAtNext) × periodRate
chargeInterest = Σ [chargeAmount × periodRate
                     × (next − chargeDate) / (next − cursor)]
interest = baseInterest + chargeInterest
```

Dates/rate entries split the interval. Rate selection uses the latest rate start date not after the segment; a stored rate `endDate` is not enforced. If rate JSON contains entries but none has started, the selected rate is zero. When there is no rate array, the first account rate is the fallback. The charge-interest expression uses the interval's blended `periodRate` for each charge, rather than recalculating the exact post-charge rate segments.

At each `next` event the implementation orders calculations as follows:

1. Select the offset balance at `next` and accrue base interest for the entire interval using that end-point offset.
2. Add dated card/BNPL `Bill Payment` and `Expense` charges and their prorated interest.
3. If a scheduled due date equals `next`, apply `min(balance, amount)`. `Full payment` sets amount to the whole simulated balance. Amount-less `Interest Only` pays `accruedInterest` since the last payment; an amount-present entry pays its configured amount. Other types, including `Min balance`, pay configured amount or zero. The optional interest-only-period form serializes an amount-less `Interest Only` payment entry, and the simulator parses it as a payment schedule; it is not merely a rate/term flag.
4. In the actual/offset-enabled run only, subtract matching linked `Part Payment` occurrences whose dates fall after `cursor` and through `next`. The model applies these at the interval end even if recorded earlier in it.
5. Record the balance and cumulative interest/payment totals. Balances at or below `$0.005` are set to zero.

The dev uses three runs per loan: scheduled-only (`includeOffsets=false`, no part payments), offset-only (`includeOffsets=true`, no part payments), and actual (`includeOffsets=true`, part payments). Scheduled vs actual interest is what Loans and Loan management display. The computed offset-only comparison is not currently used by those cards.

#### Dev loan schedule inputs that are amounts, not formulas

- Principal-and-interest amount is required for non-card schedules and is used literally at each due event; no principal/rate/term amortization solver exists.
- Card form offers `Min balance` / `Full payment` but no minimum-percentage or minimum-amount input. The default card schedule amount is empty, so `Min balance` simulates a zero payment. The config's `$150` default is not loaded into the schedule draft.
- The optional introductory interest-only period is persisted as an amount-less `Interest Only` entry with the selected schedule frequency; because that entry uses the same payment-event code, it generates a payment one frequency after the period start and repeats through the configured end date. The exact intended lender behavior for the first due date and final period is not modeled separately.
- `Interest Only` with blank amount is simulated as accumulated interest paid on scheduled due events, not as a lender-calculated debit on the contractual due date. An entered amount can be lower or higher than accrued interest.
- BNPL presets are user-facing starting values ($100 fortnightly); these are neither inferred from balance/term nor validated against fees. Default BNPL interest is 0% from static preset arithmetic.
- A `Full payment` entry is not an amount formula: it pays the entire simulated balance at each event. No statement date, grace period, minimum due, late fee, or payment allocation waterfall is modeled.
- Extra payment monthly summary is the total occurrences in the 12 months after projection start divided by 12; it is not truncated at payoff. The event simulator itself caps each applied payment at remaining balance and stops at payoff.

#### Dev-specific gaps and interaction risks

1. Schedule validator enforces date coverage/non-overlap, but the calculator does not enforce rate-window end dates; an expired rate remains active until a later rate start.
2. The validator requires card repayment frequency but allows an empty amount, consistent with the currently zero `Min balance` payment. This must not be interpreted as a card minimum-payment calculation.
3. `getNextPayment` repeats monthly events by repeatedly adding a month from the prior date. Month-end sequences can drift relative to the activity counter, which recomputes dates from the original start anchor.
4. Annualized scheduled/extra payment tiles ignore schedule activation dates and payment type. They are nominal run-rate values and can disagree with actual simulated cash paid.
5. Card promo/rate date edges, charge effective dates, event ordering when multiple events share a date, and future schedule coverage require golden tests. Loan interest uses monthly simple prorating, not APR-to-APY conversion, daily balances, contractual day count, or daily compounding.
6. Development has not introduced independent cash/offset/Save/Spend calculators. Their existing issues remain: balance baseline ambiguity, inconsistent month-end recurrence, unspent transfers in Spend, Save end-cash wiring, account rate display, FY cutoffs, and negative-balance inconsistencies documented in production.

## 6. Database and data interactions

Writes still target `public.accounts` using the signed-in Supabase client:

- Account insert/update writes `balance`, dates, account type, schedule-bearing `payments`, and `interest_rates`.
- Schedule editing filters out the recognized prior loan schedule entries, writes the draft’s repayment/interest-only entries, and retains non-schedule activity entries.
- Card promotional periods are represented as rate windows; non-card repayment-rate overrides become dated rate entries.
- RLS continues to enforce account-row ownership. JSONB schema validation is client-only, and replacing the JSON array is a read-modify-write operation; concurrent edits can overwrite each other.

The account-level schedule must remain backward compatible with production’s single-payment payload. The simulator accepts object/array parsing and aliases `startDate`/`date` and `endDate`/`end_date`; malformed JSON is treated as absent and may fall back to default rates. Local Supabase setup, core DDL, CRUD SQL equivalents, and schema/policy/trigger inspection queries are in the [production setup reference](./production.md#4-database-setup-and-query-reference); this dev proposal introduces no additional SQL.

## 7. Gaps and release gates

**Known implementation gaps to close or consciously accept:**

1. `Min balance` has no formula; with no entered amount its current simulated payment is zero. This is a release blocker unless implemented or explicitly scoped out.
2. `Principal and Interest` uses a user-entered amount; the system does not solve a payment from principal, rate, term, and compounding convention. The full-payment behavior is also a simplifying assumption.
3. Rate entries store `endDate`, but rate selection is driven by the latest start date and does not itself enforce the end date. Validate contiguous/non-overlapping rate windows and define rate behavior in gaps.
4. Rate/day-count/compounding conventions, payment date semantics, card statement/minimum rules, BNPL fees, and negative balances need product/lender specifications and golden calculation cases.
5. Test legacy rows and migration-less persistence; add focused unit tests for invalid/leap dates, overlaps, coverage gaps, month ends, schedule ordering, interest-rate boundaries, payment events, and expected balances/interest.
6. Check schedule restoration/replacement, card promotional end dates, empty optional values, errors, accessibility, and sidebar behavior at narrow widths. Add automated app typecheck/build and tests to CI; the Pages job is not an app build.
7. `SUPABASE_CONFIG` still points to a single hosted project; there is no staging/production environment selection. Do not validate dev changes against production user data. Add a dedicated staging Supabase project/configuration before shared-user testing.
8. Recheck deployed RLS and trigger behavior independently; this proposal makes no change to them.

**Acceptance before merge:** product sign-off on repayment semantics; calculation tests pass; old account rows still load/edit; no accidental loss of activity JSON; responsive/accessibility review complete; production documentation updated for exactly the merged behavior.

## 8. Dev → production lifecycle

1. `dev` is the proposed integration branch; `main` is production. For every material app change on `dev`, update `docs/dev.md` and `docs/dev.html` in the same commit. The workflow enforces both files on app changes.
2. Validate with `cd expoapp && npx tsc --noEmit`, focused tests, app/web checks, and authenticated RLS-backed create/edit/delete scenarios. Document failures and remaining gaps.
3. Open a reviewed `dev` → `main` PR. Update `docs/production.md` and `docs/production.html` to represent the exact release; the workflow enforces both when app files change in the PR.
4. Merge only after approval and accepted release gates. The merge updates production code and its documentation together. A merge does not apply Supabase migrations or deploy a native app binary.
5. GitHub Pages serves static design docs from `dev/docs`; at this revision the repository Pages source is branch `dev`, path `/docs`, and the Actions workflow also validates docs and publishes on dev pushes. It is not the Expo app. App distribution and database migration apply remain separate release operations.

**Code references:** [AccountModal.tsx](../expoapp/components/AccountModal.tsx) · [loanSchedules.ts](../expoapp/lib/loanSchedules.ts) · [App.tsx](../expoapp/App.tsx) · [financialProjection.ts](../expoapp/lib/financialProjection.ts) · [Pages workflow](../.github/workflows/docs-pages.yml).
