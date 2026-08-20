"use strict";
/* ==============================================================
   group.js — the hub for one specific group: quick stats + links
   out to Members / Add expense / Ledger / Balances / Settlement.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser); // redirects to dashboard.html if none selected

  if (ctx) {
    const { group } = ctx;
    renderNavbar(currentUser, "group", group);
    showFlashIfAny();

    document.getElementById("group-title").textContent = group.name;
    document.getElementById("group-sub").textContent =
      `${group.members.length} member${group.members.length === 1 ? "" : "s"} · ${group.expenses.length} expense${group.expenses.length === 1 ? "" : "s"}`;

    let total = 0;
    for (const exp of group.expenses) total += exp.amount;
    const balances = computeBalances(group);
    const transfers = optimizeSettlement(balances);
    const perHead = group.members.length ? total / group.members.length : 0;

    const stats = [
      { label: "Total spent", value: fmt(total) },
      { label: "Members", value: group.members.length },
      { label: "Avg per member", value: fmt(perHead) },
      { label: "Settle-up transfers", value: transfers.length },
    ];
    const cells = [];
    for (const s of stats) {
      cells.push(`<div class="stat"><b>${s.value}</b><small>${s.label}</small></div>`);
    }
    document.getElementById("stat-grid").innerHTML = cells.join("");

    document.getElementById("btn-del-group").addEventListener("click", () => {
      if (!confirm(`Delete "${group.name}" and everything in it? This can't be undone.`)) return;
      const groups = getUserGroups(currentUser.id).filter((g) => g.id !== group.id);
      saveUserGroups(currentUser.id, groups);
      clearActiveGroupId();
      setFlash(`Group "${group.name}" deleted.`);
      window.location.href = "dashboard.html";
    });
  }
}
