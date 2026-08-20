"use strict";
/* ==============================================================
   settlement.js — suggested transfers (with "Mark as paid"),
   manual payment recording, and an undo-able payment history.
   Nothing here changes a balance automatically — every entry in
   "settlements" only exists because a person confirmed it.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser);

  if (ctx) {
    let { groups, group } = ctx;
    renderNavbar(currentUser, "settlement", group);
    showFlashIfAny();

    const persist = () => saveUserGroups(currentUser.id, groups);

    const render = () => {
      const balances = computeBalances(group);
      const transfers = optimizeSettlement(balances);
      renderSlips(transfers);
      renderSelects();
      renderHistory();
    };

    const renderSlips = (transfers) => {
      const box = document.getElementById("settlement-list");
      if (group.expenses.length === 0) {
        box.innerHTML = `<div class="settle-clear">Add expenses to generate a settlement plan.</div>`;
        return;
      }
      if (transfers.length === 0) {
        box.innerHTML = `<div class="settle-clear">✓ All settled — nobody owes anything.</div>`;
        return;
      }
      const rows = [];
      for (let i = 0; i < transfers.length; i++) {
        const { from, to, amount } = transfers[i];
        rows.push(`
          <div class="slip">
            <div class="route">${from} <span class="arrow">→</span> ${to}</div>
            <div class="pay">${fmt(amount)}</div>
            <small>Transfer ${i + 1} of ${transfers.length}</small>
            <button type="button" class="btn-mark-paid" data-from="${from}" data-to="${to}" data-amount="${amount}">
              Mark as paid
            </button>
          </div>`);
      }
      box.innerHTML = rows.join("");
    };

    const renderSelects = () => {
      const options = [];
      for (const m of group.members) options.push(`<option value="${m}">${m}</option>`);
      document.getElementById("settle-from").innerHTML = options.join("");
      document.getElementById("settle-to").innerHTML = options.join("");
    };

    const renderHistory = () => {
      const box = document.getElementById("payment-history");
      const list = group.settlements || [];
      if (list.length === 0) {
        box.innerHTML = `<div class="empty-state"><b>No payments recorded yet</b>Confirmed settlements will show up here.</div>`;
        return;
      }
      const sorted = [...list].sort((a, b) => b.id - a.id);
      const rows = [];
      for (const s of sorted) {
        const { id, from, to, amount, date } = s;
        rows.push(`
          <div class="payment-row">
            <div class="route">${from} <span class="arrow">→</span> ${to}</div>
            <div class="p-meta">${date}</div>
            <div class="p-amt">${fmt(amount)}</div>
            <button class="btn-danger-sm" data-undo-settlement="${id}">Undo</button>
          </div>`);
      }
      box.innerHTML = rows.join("");
    };

    render();

    /* --- confirm a suggested transfer exactly as shown --- */
    document.getElementById("settlement-list").addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-mark-paid");
      if (!btn) return;
      const { from, to, amount } = btn.dataset;
      if (!confirm(`Confirm that ${from} paid ${to} ${fmt(Number(amount))}?`)) return;
      recordSettlement(group, from, to, Number(amount));
      persist();
      render();
      toast(`Marked ${from} → ${to} as paid.`);
    });

    /* --- manual "record a payment" form --- */
    document.getElementById("settle-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const from = document.getElementById("settle-from").value;
      const to = document.getElementById("settle-to").value;
      const amount = round2(parseFloat(document.getElementById("settle-amount").value));

      if (group.members.length < 2) return showError("settle-error", "Add at least two members first.");
      if (from === to) return showError("settle-error", "Payer and receiver must be different people.");
      if (!amount || amount <= 0) return showError("settle-error", "Amount must be greater than zero.");

      recordSettlement(group, from, to, amount);
      persist();
      e.target.reset();
      render();
      toast(`Recorded: ${from} paid ${to} ${fmt(amount)}.`);
    });

    /* --- undo a recorded payment --- */
    document.getElementById("payment-history").addEventListener("click", (e) => {
      const id = Number(e.target.dataset.undoSettlement);
      if (!id) return;
      group.settlements = group.settlements.filter((s) => s.id !== id);
      persist();
      render();
      toast("Payment record removed.");
    });
  }
}
