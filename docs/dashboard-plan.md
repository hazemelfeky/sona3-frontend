# Task: Family detail view

Follow `docs/dashboard-plan.md` — same conventions, same stack
(Vue 3 + Vue Router + Nuxt UI + Supabase, Arabic RTL, read-only).

This builds section 4 of that document.

## Route

Add `/families/:id` as a real route, not a modal. The org needs to share links
to a specific family. Clicking a row in the families table navigates there;
provide a back link to the table.

Handle: invalid id, family not found, and still-loading — three distinct
states, all in Arabic.

## Data fetching

`family_id` is the key on every child table. Fetch the parent and children in
**parallel queries**, not a chain of awaits — this is one screen and the
requests are independent.

Do not join these in JavaScript and do not build a giant nested view. Each
query maps to one table:

```
families        where family_id = :id   (single row)
members         where family_id = :id
income_sources  where family_id = :id
expenses        where family_id = :id
family_needs    where family_id = :id   (join need_types for label_ar)
```

Put this in a `useFamilyDetail(id)` composable returning
`{ family, members, income, expenses, needs, loading, error }`.

## Sections to render

**Family header** — `head_name`, `area`, `evaluation_status` as a badge,
`member_count`, `registration_date`, `source_sheet` + `row_id` (small, muted —
useful for tracing a row back to its sheet).

**Household** — `head_*` and `spouse_*` fields side by side. Where a spouse
field is null, the whole spouse block should collapse rather than render a
column of dashes.

**Housing** — `housing_type`, `housing_condition_notes`, `blanket_count`.

**Members** — table from `members`: `name`, `age`, `relation`, `is_working`,
`education_level`, `education_monthly_cost`, `notes`.

**Income** — table from `income_sources`: `source_type`, `source_detail`,
`amount`. Many rows have a null `amount` with the detail in text — that is
normal, render `—` for the amount and keep the row.

**Expenses** — table from `expenses`. Map `category` codes to Arabic labels:
`electricity` كهرباء · `water` مياه · `gas` غاز · `food` أكل ·
`transport` مواصلات · `rent` إيجار · `internet` نت ·
`education` تعليم · `medical` علاج · `other` أخرى.

**Totals** — `declared_income`, `declared_expenses`, `deficit_note`,
`deficit_coping`. These are values stated in the source sheet, not computed.
Label them so it's clear they're declared figures, and do not calculate a
deficit from them — the two numbers are often missing or inconsistent.

**Needs** — the most important section, see below.

**Notes** — `general_notes`, `head_notes`, `spouse_notes`.

## Needs section — build this carefully

This screen doubles as the review tool for LLM extraction quality, so the
needs section has a specific job beyond display.

Render side by side:

- **Left:** parsed needs from `family_needs`, showing `need_types.label_ar`
  (never the raw code)
- **Right:** the `needs_raw` text exactly as it appears in the source sheet

The point is that a reviewer can see at a glance whether the model classified
the raw text correctly.

Mark each need by `source`:
- `column` — stated explicitly in the sheet. Render as a normal badge.
- `inferred` — derived by the model from other columns. Visually distinct
  (outline style, or a small icon) with an Arabic tooltip explaining it was
  inferred and needs review.

Where `need_code = 'other'`, show the `note` field — it holds the original
text the model couldn't classify.

Also surface `confidence` (`high` / `medium` / `low`) somewhere in the header.
A `low` family should be visibly flagged.

## Excluded

`health_records` and `debts` have RLS enabled with no policies — they return
empty for every client, by design. **Omit both sections entirely.** Do not
render empty panels, do not add policies, do not query them.

`aid_history` is empty (no source column yet). Skip it.

## Constraints

- Read-only. No forms, no edit buttons, no mutations.
- Nearly every field is nullable. Null renders as `—` via `utils/format.ts`.
  A section whose fields are all null should collapse, not render a wall of
  dashes.
- Formatting goes through `utils/format.ts` only — money via
  `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`,
  dates as `YYYY-MM-DD`, numbers in Western digits.
- Nuxt UI components throughout (`UCard`, `UTable`, `UBadge`, `UTooltip`).
- RTL correct: check that tables and tooltips read right-to-left properly.
- `evaluation_status` values are `مقبولة` and `مرفوضة` (تاء مربوطة). Other
  values may appear and should render as-is rather than being mapped or hidden.

## Done when

- Clicking a row in the families table opens `/families/:id`
- Pasting that URL directly loads the same view
- A family with mostly-null fields renders cleanly with no empty sections
- Parsed needs and `needs_raw` are visible together, and `inferred` needs are
  distinguishable from `column` ones at a glance