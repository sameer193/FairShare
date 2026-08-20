"use strict";
/* ==============================================================
   ledger.js — list every expense in the active group, with delete.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser);

  if (ctx) {
    let { groups, group } = ctx;
    renderNavbar(currentUser, "ledger", group);
    showFlashIfAny();

    const persist = () => saveUserGroups(currentUser.id, groups);

    const renderExpenses = () => {
      const box = document.getElementById("expense-list");
      if (group.expenses.length === 0) {
        box.innerHTML = `<div class="empty-state"><b>No expenses yet</b>Head to Add expense to log your first bill.</div>`;
        return;
      }
      const sorted = [...group.expenses].sort((a, b) => b.id - a.id);
      const rows = [];
      for (const exp of sorted) {
        const { id, desc, amount, payer, mode, participants, date } = exp;
        const who = participants && participants.length
          ? `Split among ${participants.length} of ${group.members.length}`
          : "";
        rows.push(`
          <div class="expense">
            <div class="desc">${desc}</div>
            <div class="amt">${fmt(amount)}</div>
            <button class="btn-danger-sm del" data-del-expense="${id}">Delete</button>
            <div class="meta">
              ${payer} paid · ${date}<span class="mode">${mode}</span>
              <span class="who">${who}</span>
            </div>
          </div>`);
      }
      box.innerHTML = rows.join("");
    };
    renderExpenses();

    document.getElementById("expense-list").addEventListener("click", (e) => {
      const id = Number(e.target.dataset.delExpense);
      if (!id) return;
      group.expenses = group.expenses.filter((exp) => exp.id !== id);
      persist();
      renderExpenses();
      toast("Expense removed.");
    });
  }
}
