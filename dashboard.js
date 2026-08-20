"use strict";
/* ==============================================================
   dashboard.js — stats + create/select groups.
   Relies on core.js being loaded first (storage, session, guards,
   navbar renderer, formatting helpers).
   ============================================================== */

const currentUser = requireLogin();   // redirects to login.html if nobody's signed in

if (currentUser) {
  renderNavbar(currentUser, "dashboard", null);
  showFlashIfAny();

  let groups = getUserGroups(currentUser.id);

  const renderStats = () => {
    // per-user totals across every group they own
    let totalSpent = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    for (const g of groups) {
      totalExpenses += g.expenses.length;
      for (const exp of g.expenses) {
        totalSpent += exp.amount;
      }
      const balances = computeBalances(g);
      totalTransfers += optimizeSettlement(balances).length;
    }

    document.getElementById("greeting").textContent =
      `Hi ${currentUser.username.split(" ")[0]} — here's where your money stands.`;

    // Only ever the signed-in person's own numbers — nothing site-wide.
    const stats = [
      { label: "Total spent", value: fmt(totalSpent) },
      { label: "Your groups", value: groups.length },
      { label: "Expenses", value: totalExpenses },
      { label: "Settle-up transfers", value: totalTransfers },
    ];

    const cells = [];
    for (const s of stats) {
      cells.push(`
        <div class="stat">
          <b>${s.value}</b>
          <small>${s.label}</small>
        </div>`);
    }
    document.getElementById("stat-grid").innerHTML = cells.join("");
  };

  const renderGroups = () => {
    const box = document.getElementById("group-grid");
    if (groups.length === 0) {
      box.innerHTML = `<div class="empty-state"><b>No groups yet</b>Create your first group above to start splitting bills.</div>`;
      return;
    }
    const cards = [];
    for (const g of groups) {
      let total = 0;
      for (const exp of g.expenses) total += exp.amount;
      cards.push(`
        <button type="button" class="group-card" data-open-group="${g.id}">
          <b>${g.name}</b>
          <span class="g-meta">${g.members.length} members · ${g.expenses.length} expenses</span>
          <div class="g-total">${fmt(total)}</div>
        </button>`);
    }
    box.innerHTML = cards.join("");
  };

  const render = () => {
    renderStats();
    renderGroups();
  };
  render();

  /* --- create a group --- */
  document.getElementById("btn-create-group").addEventListener("click", () => {
    const input = document.getElementById("group-name");
    const name = input.value.trim();
    if (!name) return showError("group-error", "Group name can't be empty.");

    let duplicate = false;
    for (const g of groups) {
      if (g.name.toLowerCase() === name.toLowerCase()) { duplicate = true; break; }
    }
    if (duplicate) return showError("group-error", "You already have a group with that name.");

    const g = createGroup(name);
    groups.push(g);
    saveUserGroups(currentUser.id, groups);

    setActiveGroupId(g.id);
    setFlash(`Group "${name}" created.`);
    window.location.href = "group.html";
  });
  document.getElementById("group-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-create-group").click();
  });

  /* --- open a group --- */
  document.getElementById("group-grid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-open-group]");
    if (!card) return;
    setActiveGroupId(Number(card.dataset.openGroup));
    window.location.href = "group.html";
  });
}
