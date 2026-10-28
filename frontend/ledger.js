
"use strict";

const currentUser = requireLogin();
const groupId = sessionStorage.getItem("FairShare-active-group");

if (!currentUser) {
  // requireLogin() handles the redirect.
} else if (!groupId) {
  window.location.href = "dashboard.html";
} else {
  loadLedger();
}

// Convert a backend expense into the format FairShare uses.
function normalizeExpense(expense) {
  const shares = {};

  const participants = (expense.participants || []).map(function (person) {
    shares[person.memberId] = person.shareAmount;
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
    date: expense.createdAt
      ? new Date(expense.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
      : "Unknown date",
    createdAt: expense.createdAt
  };
}

// Load the group and expenses from the backend.
async function loadLedger() {
  const box = document.getElementById("expense-list");

  try {
    const groupResult = await apiRequest("/groups/" + groupId);
    const group = groupResult.data;

    renderNavbar(currentUser, "ledger", group);
    showFlashIfAny();

    const expenseResult = await apiRequest(
      "/expenses?groupId=" + encodeURIComponent(groupId)
    );

    const rawExpenses = expenseResult.data || [];

    const ledgerGroup = {
      ...group,
      expenses: rawExpenses.map(normalizeExpense),
      settlements: []
    };

    updateSummary(ledgerGroup.expenses);
    renderExpenses(ledgerGroup);

  } catch (error) {
    if (box) {
      box.textContent = error.message || "Could not load expenses.";
    }
  }
}

// Update the three summary cards.
function updateSummary(expenses) {
  const countElement = document.getElementById("ledger-count");
  const totalElement = document.getElementById("ledger-total");
  const newestElement = document.getElementById("ledger-newest");

  const total = expenses.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);

  countElement.textContent = String(expenses.length);
  totalElement.textContent = fmt(total);

  // Find the newest expense using its original database timestamp.
  let newestExpense = null;

  expenses.forEach(function (expense) {
    if (
      !newestExpense ||
      new Date(expense.createdAt) > new Date(newestExpense.createdAt)
    ) {
      newestExpense = expense;
    }
  });

  newestElement.textContent = newestExpense
    ? newestExpense.date
    : "—";
}

// Display the expense list.
function renderExpenses(group) {
  const box = document.getElementById("expense-list");

  if (!box) return;

  if (group.expenses.length === 0) {
    box.innerHTML =
      '<div class="empty-state">' +
      "<b>No expenses yet</b>" +
      "Head to Add expense to log your first bill." +
      "</div>";
    return;
  }

  // Sort by the original timestamp, newest first.
  const sorted = group.expenses.slice().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let rows = "";

  sorted.forEach(function (expense) {
    const who = expense.participants.length > 0
      ? "Split among " + expense.participants.length +
      " of " + group.members.length
      : "No participants";

    rows +=
      '<div class="expense">' +
      '<div class="desc">' + escapeHTML(expense.desc) + "</div>" +
      '<div class="amt">' + fmt(expense.amount) + "</div>" +
      '<button class="btn-danger-sm del" data-del-expense="' +
      escapeHTML(expense.id) + '">' +
      "Delete" +
      "</button>" +
      '<div class="meta">' +
      escapeHTML(expense.payer) +
      " paid · " + escapeHTML(expense.date) +
      '<span class="mode">' + escapeHTML(expense.mode) + "</span>" +
      '<span class="who">' + escapeHTML(who) + "</span>" +
      "</div>" +
      "</div>";
  });

  box.innerHTML = rows;

  // Delete an expense through the backend.
  box.querySelectorAll("[data-del-expense]").forEach(function (button) {
    button.addEventListener("click", async function () {
      const expenseId = button.dataset.delExpense;

      if (!confirm("Are you sure you want to delete this expense?")) {
        return;
      }

      button.disabled = true;

      try {
        await apiRequest("/expenses/" + encodeURIComponent(expenseId), {
          method: "DELETE"
        });

        await loadLedger();
        toast("Expense removed.");

      } catch (error) {
        button.disabled = false;
        alert(error.message || "Could not delete the expense.");
      }
    });
  });
}

// Escape text before inserting it into HTML.
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
