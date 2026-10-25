"use strict";

let settlementListenersAttached = false;
// ================================================================
// 1. CHECK LOGIN AND ACTIVE GROUP
// ================================================================

const currentUser = requireLogin();
const groupId = sessionStorage.getItem("FairShare-active-group");

let group = null;

if (!currentUser) {
  // requireLogin() handles the redirect.
} else if (!groupId) {
  window.location.href = "dashboard.html";
} else {
  loadSettlementPage();
}

// ================================================================
// 2. CONVERT BACKEND EXPENSES
// ================================================================

function normalizeExpense(expense) {
  const shares = {};

  const participants = (expense.participants || []).map(function (person) {
    shares[person.memberId] = Number(person.shareAmount);
    return person.memberId;
  });

  return {
    id: expense._id,
    desc: expense.description,
    amount: Number(expense.amount),
    payer: expense.paidBy,
    mode: expense.splitType,
    participants: participants,
    shares: shares,
    date: expense.createdAt || ""
  };
}

// ================================================================
// 3. LOAD GROUP, EXPENSES AND SETTLEMENTS
// ================================================================

async function loadSettlementPage() {
  const box = document.getElementById("settlement-list");

  try {
    const groupResult = await apiRequest(
      "/groups/" + encodeURIComponent(groupId)
    );

    const backendGroup = groupResult.data;

    const expenseResult = await apiRequest(
      "/expenses?groupId=" + encodeURIComponent(groupId)
    );

    const settlementResult = await apiRequest(
      "/settlements?groupId=" + encodeURIComponent(groupId)
    );

    const expenses = expenseResult.data || [];
    const settlements = settlementResult.data || [];

    group = {
      ...backendGroup,
      expenses: expenses.map(normalizeExpense),
      settlements: settlements.map(function (item) {
        return {
          id: item._id,
          from: item.from,
          to: item.to,
          amount: Number(item.amount),
          date: item.settledAt
            ? new Date(item.settledAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })
            : ""
        };
      })
    };

    renderNavbar(currentUser, "settlement", group);
    showFlashIfAny();

    render();
    attachEventListeners();

  } catch (error) {
    if (box) {
      box.textContent =
        error.message || "Could not load settlement information.";
    }

    showError(
      "settle-error",
      error.message || "Could not load settlements."
    );
  }
}

// ================================================================
// 4. SAFE HTML TEXT
// ================================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ================================================================
// 5. RENDER EVERYTHING
// ================================================================

function render() {
  const balances = computeBalances(group);
  const transfers = optimizeSettlement(balances);

  renderSlips(transfers);
  renderSelects();
  renderHistory();
}

// ================================================================
// 6. DISPLAY SUGGESTED PAYMENTS
// ================================================================

function renderSlips(transfers) {
  const box = document.getElementById("settlement-list");

  if (!box) return;

  if (!group.expenses.length) {
    box.innerHTML =
      '<div class="settle-clear">' +
      "Add expenses to generate a settlement plan." +
      "</div>";
    return;
  }

  if (!transfers.length) {
    box.innerHTML =
      '<div class="settle-clear">' +
      "✓ All settled — nobody owes anything." +
      "</div>";
    return;
  }

  let rows = "";

  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i];

    rows +=
      '<div class="slip">' +
      '<div class="route">' +
      escapeHtml(transfer.from) +
      ' <span class="arrow">→</span> ' +
      escapeHtml(transfer.to) +
      "</div>" +
      '<div class="pay">' + fmt(transfer.amount) + "</div>" +
      "<small>Transfer " + (i + 1) + " of " +
      transfers.length + "</small>" +
      '<button type="button" class="btn-mark-paid" ' +
      'data-from="' + escapeHtml(transfer.from) + '" ' +
      'data-to="' + escapeHtml(transfer.to) + '" ' +
      'data-amount="' + transfer.amount + '">' +
      "Mark as paid" +
      "</button>" +
      "</div>";
  }

  box.innerHTML = rows;
}

// ================================================================
// 7. DISPLAY MEMBER DROPDOWNS
// ================================================================

function renderSelects() {
  const fromSelect = document.getElementById("settle-from");
  const toSelect = document.getElementById("settle-to");

  if (!fromSelect || !toSelect) return;

  fromSelect.innerHTML = "";
  toSelect.innerHTML = "";

  group.members.forEach(function (member) {
    const fromOption = document.createElement("option");
    fromOption.value = member;
    fromOption.textContent = member;

    const toOption = document.createElement("option");
    toOption.value = member;
    toOption.textContent = member;

    fromSelect.appendChild(fromOption);
    toSelect.appendChild(toOption);
  });

  if (toSelect.options.length > 1) {
    toSelect.selectedIndex = 1;
  }
}

// ================================================================
// 8. DISPLAY PAYMENT HISTORY
// ================================================================

function renderHistory() {
  const box = document.getElementById("payment-history");

  if (!box) return;

  const list = Array.isArray(group.settlements)
    ? group.settlements
    : [];

  if (!list.length) {
    box.innerHTML =
      '<div class="empty-state">' +
      "<b>No payments recorded yet</b>" +
      "Confirmed settlements will show up here." +
      "</div>";
    return;
  }

  const sorted = list.slice().sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  let rows = "";

  sorted.forEach(function (settlement) {
    rows +=
      '<div class="payment-row">' +
      '<div class="route">' +
      escapeHtml(settlement.from) +
      ' <span class="arrow">→</span> ' +
      escapeHtml(settlement.to) +
      "</div>" +
      '<div class="p-meta">' +
      escapeHtml(settlement.date) +
      "</div>" +
      '<div class="p-amt">' + fmt(settlement.amount) + "</div>" +
      '<button type="button" class="btn-danger-sm" ' +
      'data-undo-settlement="' +
      escapeHtml(settlement.id) + '">' +
      "Undo" +
      "</button>" +
      "</div>";
  });

  box.innerHTML = rows;
}

// ================================================================
// 9. VALIDATE PAYMENT WITHOUT CHANGING THE REAL GROUP
// ================================================================

function validatePayment(from, to, amount) {
  // Make a temporary copy because recordSettlement()
  // adds a settlement to the group it receives.
  const testGroup = {
    ...group,
    members: group.members.slice(),
    expenses: group.expenses,
    settlements: group.settlements.slice()
  };

  return recordSettlement(testGroup, from, to, amount);
}

// ================================================================
// 10. RECORD A PAYMENT IN THE BACKEND
// ================================================================

async function saveSettlement(from, to, amount) {
  const result = validatePayment(from, to, amount);

  if (!result.ok) {
    toast(result.msg);
    return;
  }

  try {
    await apiRequest("/settlements", {
      method: "POST",
      body: JSON.stringify({
        groupId: groupId,
        from: from,
        to: to,
        amount: Number(Number(amount).toFixed(2))
      })
    });

    await loadSettlementPage();
    toast("Recorded: " + from + " paid " + to + " " + fmt(amount) + ".");

  } catch (error) {
    showError(
      "settle-error",
      error.message || "Could not record the payment."
    );
  }
}

// ================================================================
// 11. ATTACH BUTTON AND FORM EVENTS
// ================================================================

function attachEventListeners() {
  if (settlementListenersAttached) return;
  settlementListenersAttached = true;
  const settlementList = document.getElementById("settlement-list");
  const settleForm = document.getElementById("settle-form");
  const historyBox = document.getElementById("payment-history");

  settlementList.addEventListener("click", async function (event) {
    const button = event.target.closest(".btn-mark-paid");

    if (!button) return;

    const from = button.dataset.from;
    const to = button.dataset.to;
    const amount = Number(button.dataset.amount);

    const answer = confirm(
      "Confirm that " + from + " paid " + to + " " + fmt(amount) + "?"
    );

    if (!answer) return;

    button.disabled = true;
    await saveSettlement(from, to, amount);
  });

  settleForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const from = document.getElementById("settle-from").value;
    const to = document.getElementById("settle-to").value;
    const rawAmount = document.getElementById("settle-amount").value;
    const amount = Number(rawAmount);

    if (group.members.length < 2) {
      showError("settle-error", "Add at least two members first.");
      return;
    }

    if (from === to) {
      showError(
        "settle-error",
        "Payer and receiver must be different people."
      );
      return;
    }

    if (
      rawAmount.trim() === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showError("settle-error", "Amount must be greater than zero.");
      return;
    }

    const submitButton = settleForm.querySelector(
      'button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    try {
      const result = validatePayment(from, to, amount);

      if (!result.ok) {
        showError("settle-error", result.msg);
        return;
      }

      await apiRequest("/settlements", {
        method: "POST",
        body: JSON.stringify({
          groupId: groupId,
          from: from,
          to: to,
          amount: Number(Number(amount).toFixed(2))
        })
      });

      settleForm.reset();

      await loadSettlementPage();

      toast(
        "Recorded: " + from + " paid " + to + " " + fmt(amount) + "."
      );

    } catch (error) {
      showError(
        "settle-error",
        error.message || "Could not record the payment."
      );

    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  historyBox.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-undo-settlement]");

    if (!button) return;

    // MongoDB IDs are strings, not numbers.
    const settlementId = button.dataset.undoSettlement;

    const answer = confirm(
      "Undo this payment record? Balances will change."
    );

    if (!answer) return;

    button.disabled = true;

    try {
      await apiRequest(
        "/settlements/" + encodeURIComponent(settlementId) +
        "?groupId=" + encodeURIComponent(groupId),
        {
          method: "DELETE"
        }
      );

      await loadSettlementPage();
      toast("Payment record removed.");

    } catch (error) {
      button.disabled = false;

      showError(
        "settle-error",
        error.message || "Could not undo the payment."
      );
    }
  });
}
