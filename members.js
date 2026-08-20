"use strict";
/* ==============================================================
   members.js — add (bulk, comma-separated) and remove members
   for the currently active group.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser);

  if (ctx) {
    let { groups, group } = ctx;
    renderNavbar(currentUser, "members", group);
    showFlashIfAny();

    const persist = () => saveUserGroups(currentUser.id, groups);

    const renderMembers = () => {
      const box = document.getElementById("member-list");
      if (group.members.length === 0) {
        box.innerHTML = `<div class="empty-state"><b>No members yet</b>Add the people sharing these bills above.</div>`;
        return;
      }
      const chips = [];
      for (const m of group.members) {
        chips.push(`
          <span class="chip">
            <span class="avatar">${initials(m)}</span>${m}
            <button type="button" data-remove="${m}" aria-label="Remove ${m}">×</button>
          </span>`);
      }
      box.innerHTML = chips.join("");
    };
    renderMembers();

    /* Accepts one name OR several comma-separated names at once. A plain
       `for` loop walks the typed list, and each name goes through the
       same duplicate/empty checks before being pushed onto the array. */
    const addMembers = () => {
      const input = document.getElementById("member-name");
      const typed = input.value.split(",").map((n) => n.trim()).filter(Boolean);
      if (typed.length === 0) return showError("member-error", "Member name can't be empty.");

      const added = [];
      const skipped = [];

      for (let i = 0; i < typed.length; i++) {
        const name = typed[i];
        const alreadyInGroup = group.members.some((m) => m.toLowerCase() === name.toLowerCase());
        const alreadyTyped = added.some((m) => m.toLowerCase() === name.toLowerCase());
        if (name.length > 24) { skipped.push(name); continue; }
        if (alreadyInGroup || alreadyTyped) { skipped.push(name); continue; }
        group.members.push(name);
        added.push(name);
      }

      persist();
      input.value = "";
      input.focus();
      renderMembers();

      if (added.length && skipped.length) {
        toast(`Added ${added.length} member${added.length > 1 ? "s" : ""}. Skipped duplicate: ${skipped.join(", ")}.`);
      } else if (added.length) {
        toast(added.length === 1 ? `Added ${added[0]}.` : `Added ${added.length} members.`);
      } else {
        showError("member-error", `Already in this group: ${skipped.join(", ")}.`);
      }
    };

    document.getElementById("btn-add-member").addEventListener("click", addMembers);
    document.getElementById("member-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addMembers(); }
    });

    document.getElementById("member-list").addEventListener("click", (e) => {
      const name = e.target.dataset.remove;
      if (!name) return;

      const involved = group.expenses.some((exp) => exp.payer === name || name in exp.shares);
      if (involved) {
        showError("member-error", `${name} appears in existing expenses and can't be removed. Delete those expenses first.`);
        return;
      }
      group.members = group.members.filter((m) => m !== name);
      persist();
      renderMembers();
      toast(`${name} removed.`);
    });
  }
}
