"use strict";

const currentUser = requireLogin();
const groupId = sessionStorage.getItem("FairShare-active-group");

if (!currentUser) {
  // requireLogin() handles the redirect.
} else if (!groupId) {
  window.location.href = "dashboard.html";
} else {
  loadBalances();
}

// Convert backend expenses into the format
// expected by computeBalances() in core.js.
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

// Load group and expenses from the backend.
async function loadBalances() {
  const box = document.getElementById("balance-list");

  try {
    const groupResult = await apiRequest("/groups/" + groupId);
    const group = groupResult.data;

    renderNavbar(currentUser, "balances", group);
    showFlashIfAny();

    const expenseResult = await apiRequest(
      "/expenses?groupId=" + encodeURIComponent(groupId)
    );

    const expenses = expenseResult.data || [];

    // Use backend expenses with the existing balance calculator.
    const balanceGroup = {
      ...group,
      expenses: expenses.map(normalizeExpense),
      settlements: []
    };

    renderBalances(balanceGroup);

  } catch (error) {
    if (box) {
      box.textContent = error.message || "Could not load balances.";
    }
  }
}

// Calculate and display member balances.
function renderBalances(group) {
  const box = document.getElementById("balance-list");

  if (!box) return;

  if (!group.members || group.members.length === 0) {
    box.innerHTML =
      '<div class="empty-state">' +
      "<b>No members</b>" +
      "Add members to see balances." +
      "</div>";
    return;
  }

  // Use the existing calculation function in core.js.
  const balances = computeBalances(group);

  // Find the largest absolute balance.
  let maxAbs = 0.01;

  for (const name in balances) {
    const absoluteBalance = Math.abs(balances[name]);

    if (absoluteBalance > maxAbs) {
      maxAbs = absoluteBalance;
    }
  }

  let rows = "";

  // Create a balance row for each member.
  for (const name of group.members) {
    const balance = Number(balances[name] || 0);
    const width = (Math.abs(balance) / maxAbs) * 50;

    let className = "zero";

    if (balance > 0.004) {
      className = "pos";
    } else if (balance < -0.004) {
      className = "neg";
    }

    let bar = "";

    if (className !== "zero") {
      let style = "width:" + width + "%;";

      if (className === "neg") {
        style += "left:" + (50 - width) + "%;";
      }

      bar =
        '<div class="bal-bar ' +
        className +
        '" style="' +
        style +
        '"></div>';
    }

    let amountText = fmt(balance);

    if (balance > 0) {
      amountText = "+" + amountText;
    }

    amountText = amountText.replace("₹-", "−₹");

    rows +=
      '<div class="bal-row">' +
      '<span class="name">' + escapeHTML(name) + "</span>" +
      '<div class="bal-track">' + bar + "</div>" +
      '<span class="bal-amt ' + className + '">' +
      amountText +
      "</span>" +
      "</div>";
  }

  box.innerHTML = rows;
}

// Escape member names before inserting them into HTML.
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}