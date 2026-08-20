"use strict";
/* ==============================================================
   balances.js — render the zero-axis balance chart for the
   active group.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser);

  if (ctx) {
    const { group } = ctx;
    renderNavbar(currentUser, "balances", group);
    showFlashIfAny();

    const balances = computeBalances(group);
    const box = document.getElementById("balance-list");

    if (group.members.length === 0) {
      box.innerHTML = `<div class="empty-state"><b>No members</b>Add members to see balances.</div>`;
    } else {
      let maxAbs = 0.01;
      for (const name in balances) {
        maxAbs = Math.max(maxAbs, Math.abs(balances[name]));
      }

      const rows = [];
      for (const name in balances) {
        const bal = balances[name];
        const w = (Math.abs(bal) / maxAbs) * 50;
        const cls = bal > 0.004 ? "pos" : bal < -0.004 ? "neg" : "zero";
        const bar = cls === "zero" ? "" :
          `<div class="bal-bar ${cls}" style="width:${w}%;${cls === "neg" ? `left:${50 - w}%` : ""}"></div>`;
        rows.push(`
          <div class="bal-row">
            <span class="name">${name}</span>
            <div class="bal-track">${bar}</div>
            <span class="bal-amt ${cls}">${bal > 0 ? "+" : ""}${fmt(bal).replace("₹-", "−₹")}</span>
          </div>`);
      }
      box.innerHTML = rows.join("");
    }
  }
}
