# FairShare — Dynamic Split-Bill Settlement Optimizer

FairShare is a frontend-based group expense tracker that calculates a
settlement plan for shared expenses.

The main goal of FairShare is to reduce the **number of transactions**
required to settle all debts among group members using a greedy
max-creditor/max-debtor matching approach.

The project is divided into separate pages so that each part of the
application is easy to open, understand, and use.

---

## How to Run

No server or installation is required.

1. Open `login.html`.
2. Create an account using the Sign Up option.
3. Log in.
4. You will be taken to `dashboard.html`.
5. Create a group and start adding members and expenses.

The project can be opened directly in a browser or run using a
Live Server extension in VS Code.

---

## Pages

```text
login.html          Sign up / Log in
dashboard.html      User dashboard + create/select groups
group.html           Group overview and quick statistics
members.html         Add/remove group members
expense.html         Add and split expenses
ledger.html          View/delete expenses
balances.html        View member balances
settlement.html      Settlement plan and payment history
profile.html         User profile and logout