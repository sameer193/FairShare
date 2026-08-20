# SplitLedger — Dynamic Split-Bill Settlement Optimizer (Phase 1, multi-page)

A group expense tracker that computes the **minimum number of transactions**
needed to settle all debts among members, using a greedy max-creditor/
max-debtor matching algorithm — split across separate pages so each part
of the project is easy to open and read on its own, with a private,
uncluttered header.

## How to run
Open `login.html` first. Register an account, log in, and you'll land on
`dashboard.html`. No server or installation needed — open the files
directly in a browser, or use a Live Server extension.

## Pages
```
login.html        Sign up / Log in — its own page, own CSS/JS
dashboard.html     Your own stats + create/pick a group
group.html         "Hub" for one group — quick stats + links to each section
members.html       Add/remove members of the active group
expense.html       Add-expense form (payer, amount, split-among, split mode)
ledger.html        View/delete every expense in the active group
balances.html      The balances chart
settlement.html    Settlement plan, "Mark as paid", manual payments, history
profile.html        Your name, email, member-since date, and Log out
```

Every page after login shares two files:
- `core.js`   — storage helpers, session/group guards, the balance and
                settlement algorithms, and the navbar renderer
- `style.css` — all shared styling

Each page's own `<page>.js` only contains what's specific to that page.

## Fixes in this round

**"Create group" wasn't actually broken by JavaScript — it was CSS.**
The button sat next to the input inside a `.row`, styled with the shared
`.btn-primary` class (`width:100%`) plus an inline `flex:0 0 auto`. A flex
item's basis defaults to its own `width` when one is set, so the button
was claiming 100% of the row's width as its flex-basis — squeezing the
input down to almost nothing, which is exactly the tiny broken box you
saw. Fixed with a dedicated `.btn-primary-inline` class (same look, no
`width:100%`) instead of patching it with more inline styles, so the same
conflict can't quietly reappear elsewhere.

**Removed all site-wide numbers — not just hid them.** "Total users on
site" and "Total logins" are gone from the dashboard. The same problem
existed on the login page too (a "X people already use SplitLedger" line,
visible even before logging in) — that's removed as well, along with the
tracking code behind it (`STATS_KEY`, `getStats()`), since nothing
displays it anymore. What a logged-in person sees is only ever their own
data.

**Header is now just an avatar.** No name, no email, no logout button
sitting in the header. Just a small colored circle with the first letter
of your username — click it to go to `profile.html`, where your name,
email, "member since" date, and the actual Log out button live. The
avatar's color is generated per-name with a `for` loop over character
codes, so the same person always gets the same color.

**Nav no longer links to the page you're already on.** Rather than
special-casing "hide Dashboard while on the dashboard," the rule is
general: whichever page you're currently viewing, its own link is left
out of the nav bar — same behavior on every page, not just the dashboard.

## Phase 1 scope
Only concepts through Lecture 26 are used: variables, loops, functions,
arrays + array methods, higher-order functions, objects + destructuring,
DOM, events, forms + validation, JSON, LocalStorage, SessionStorage, and
basic ES6 (template literals, spread, destructuring, default parameters).

Deliberately **not** used (later-phase material): ES6 classes (a plain
factory function `createGroup(...)` is used instead), Promises,
async/await, fetch, REST APIs.

## Looping techniques
Every loop type from the syllabus does real work somewhere:
- **`for`** — bulk "add several members" parsing; gathering ticked
  checkboxes in "Split among"; building equal/percentage shares; hashing
  a name into a consistent avatar color.
- **`for...of`** — walking the users array on login/registration;
  iterating a group's expenses/settlements in `computeBalances`.
- **`for...in`** — iterating the `balances` object (a plain object, not
  an array) when rounding, charting, and splitting members into
  debtors/creditors before the settlement algorithm runs.
- **`while`** — the settlement algorithm itself: repeatedly matching the
  biggest debtor with the biggest creditor until one side runs out.

## Storage design
| Storage | Holds | Cleared by |
|---|---|---|
| **localStorage** | registered accounts, each account's groups/expenses/settlements | clearing localStorage, or "Clear site data" |
| **sessionStorage** | which account is logged in *right now*, which group this tab is currently working in | closing the tab, or clearing sessionStorage |

A brand-new (or freshly cleared) account starts with **zero groups** —
nothing is pre-filled or auto-seeded, ever.

## Features
- Sign up / Log in / Log out.
- Dashboard shows only your own numbers: total spent, groups, expenses,
  settle-up transfers.
- Profile page: avatar, name, email, member-since date, log out.
- Groups, members (bulk add via comma-separated names), "split among"
  checkboxes so a bill doesn't have to involve every member.
- Equal / Exact / Percentage splitting with live validation.
- Balance calculation and the greedy minimum-transaction settlement plan.
- Nothing settles automatically — every payment is confirmed by a person,
  either via "Mark as paid" on a suggestion or the manual "Record a
  payment" form, and can be undone from the payment history.

## Note on the auth
This is a frontend-only project, so accounts live in localStorage with a
simple, non-cryptographic character-shift on the password — not real
security. Real apps hash passwords on a backend server, which is outside
this phase.
