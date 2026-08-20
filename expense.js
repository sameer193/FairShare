"use strict";
/* ==============================================================
   expense.js — the expense entry form: payer, amount, "split
   among" participant checkboxes, and equal/exact/percentage modes.
   On success, redirects to ledger.html so you immediately see the
   entry you just added.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const ctx = requireActiveGroup(currentUser);

  if (ctx) {
    let { groups, group } = ctx;
    renderNavbar(currentUser, "expense", group);

    let splitMode = "equal";

    if (group.members.length < 2) {
      showError("expense-error", "Add at least two members before you can split a bill — head to the Members page first.");
    }

    /* payer dropdown */
    const payerOptions = [];
    for (const m of group.members) {
      payerOptions.push(`<option value="${m}">${m}</option>`);
    }
    document.getElementById("exp-payer").innerHTML = payerOptions.join("");

    /* "split among" checkboxes, all ticked by default */
    const renderParticipants = () => {
      const box = document.getElementById("participant-list");
      const rows = [];
      for (const m of group.members) {
        rows.push(`
          <label class="participant-chip">
            <input type="checkbox" value="${m}" checked />
            ${m}
          </label>`);
      }
      box.innerHTML = rows.join("");
    };
    renderParticipants();

    /* Loop over the checkbox list and collect whichever names are ticked. */
    const getSelectedParticipants = () => {
      const boxes = document.querySelectorAll("#participant-list input[type=checkbox]");
      const selected = [];
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].checked) selected.push(boxes[i].value);
      }
      return selected;
    };

    const renderSplitInputs = () => {
      const box = document.getElementById("split-inputs");
      const hint = document.getElementById("split-hint");
      hint.textContent = ""; hint.className = "split-hint";

      const participants = getSelectedParticipants();
      if (splitMode === "equal" || participants.length === 0) { box.innerHTML = ""; return; }

      const unit = splitMode === "exact" ? "₹" : "%";
      const rows = [];
      for (const m of participants) {
        rows.push(`
          <div class="split-row">
            <span>${m}</span>
            <input type="number" step="0.01" min="0" placeholder="0" data-share="${m}" aria-label="${m} share in ${unit}" />
            <b>${unit}</b>
          </div>`);
      }
      box.innerHTML = rows.join("");
      updateSplitHint();
    };

    const updateSplitHint = () => {
      const hint = document.getElementById("split-hint");
      if (splitMode === "equal") { hint.textContent = ""; return; }
      const inputs = document.querySelectorAll("[data-share]");
      let sum = 0;
      for (const el of inputs) sum += parseFloat(el.value) || 0;
      sum = round2(sum);
      if (splitMode === "percentage") {
        hint.textContent = `Total: ${sum}% of 100%`;
        hint.className = `split-hint ${Math.abs(sum - 100) < 0.01 ? "good" : "bad"}`;
      } else {
        const amount = parseFloat(document.getElementById("exp-amount").value) || 0;
        hint.textContent = `Entered: ${fmt(sum)} of ${fmt(amount)}`;
        hint.className = `split-hint ${Math.abs(sum - amount) < 0.01 ? "good" : "bad"}`;
      }
    };

    document.getElementById("participant-list").addEventListener("change", renderSplitInputs);
    document.getElementById("split-mode").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      splitMode = btn.dataset.mode;
      document.querySelectorAll("#split-mode button").forEach((b) => b.classList.toggle("active", b === btn));
      renderSplitInputs();
    });
    document.getElementById("split-inputs").addEventListener("input", updateSplitHint);
    document.getElementById("exp-amount").addEventListener("input", updateSplitHint);

    document.getElementById("expense-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (group.members.length < 2) return showError("expense-error", "Add at least two members first.");

      const desc = document.getElementById("exp-desc").value.trim();
      const amount = round2(parseFloat(document.getElementById("exp-amount").value));
      const payer = document.getElementById("exp-payer").value;
      const participants = getSelectedParticipants();

      if (!desc) return showError("expense-error", "Give the expense a description.");
      if (!amount || amount <= 0) return showError("expense-error", "Amount must be greater than zero.");
      if (!payer) return showError("expense-error", "Choose who paid.");
      if (participants.length === 0) return showError("expense-error", "Tick at least one person under \u201cSplit among\u201d.");

      const inputs = {};
      const shareBoxes = document.querySelectorAll("[data-share]");
      for (const el of shareBoxes) inputs[el.dataset.share] = el.value;

      const { ok, shares, msg } = buildShares(splitMode, amount, participants, inputs);
      if (!ok) return showError("expense-error", msg);

      group.expenses.push({
        id: Date.now(),
        desc, amount, payer,
        mode: splitMode,
        participants,
        shares,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      });
      saveUserGroups(currentUser.id, groups);

      setFlash("Expense added.");
      window.location.href = "ledger.html";
    });
  }
}
