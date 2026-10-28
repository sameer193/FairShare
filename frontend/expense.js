
requireLogin();

const currentUser = findCurrentUser();
let group = null;
let splitMode = "equal";

const groupId = sessionStorage.getItem("FairShare-active-group");

// Keep member names safe when inserting them into HTML.
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showError(message) {
  document.getElementById("expense-error").textContent = message;
}

function getSelectedParticipants() {
  return Array.from(
    document.querySelectorAll("#participant-list input[type='checkbox']:checked")
  ).map(function (checkbox) {
    return checkbox.value;
  });
}

// Load the selected group from the backend.
async function loadExpensePage() {
  if (!groupId) {
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const result = await apiRequest("/groups/" + groupId);
    group = result.data;

    renderNavbar(currentUser, "expense", group);

    if (!group || !Array.isArray(group.members)) {
      showError("Could not load the group members.");
      return;
    }

    if (group.members.length < 2) {
      document.getElementById("expense-form").style.display = "none";
      showError("Add at least two members before adding an expense.");
      return;
    }

    renderPayers();
    renderParticipants();
    renderSplitInputs();
    updateSplitHint();

  } catch (error) {
    showError(error.message || "Could not load the group.");
  }
}

function renderPayers() {
  const payerSelect = document.getElementById("exp-payer");

  payerSelect.innerHTML = group.members.map(function (member) {
    return `<option value="${escapeHTML(member)}">${escapeHTML(member)}</option>`;
  }).join("");
}

function renderParticipants() {
  const container = document.getElementById("participant-list");

  container.innerHTML = group.members.map(function (member) {
    return `
      <label>
        <input type="checkbox" value="${escapeHTML(member)}" checked>
        <span>${escapeHTML(member)}</span>
      </label>
    `;
  }).join("");

  container.querySelectorAll("input[type='checkbox']").forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      renderSplitInputs();
      updateSplitHint();
    });
  });
}

function renderSplitInputs() {
  const container = document.getElementById("split-inputs");
  const participants = getSelectedParticipants();

  if (participants.length === 0) {
    container.innerHTML = "<p>Select at least one participant.</p>";
    return;
  }

  if (splitMode === "equal") {
    container.innerHTML = "<p>The expense will be divided equally.</p>";
    return;
  }

  const label = splitMode === "exact" ? "Share amount (₹)" : "Percentage (%)";

  container.innerHTML = participants.map(function (member) {
    return `
      <label>
        ${escapeHTML(member)}
        <input
          type="number"
          min="0"
          step="0.01"
          data-share="${escapeHTML(member)}"
          aria-label="${escapeHTML(label)} for ${escapeHTML(member)}"
          placeholder="${escapeHTML(label)}"
        >
      </label>
    `;
  }).join("");

  container.querySelectorAll("[data-share]").forEach(function (input) {
    input.addEventListener("input", updateSplitHint);
  });
}

function updateSplitHint() {
  const hint = document.getElementById("split-hint");
  const amount = Number(document.getElementById("exp-amount").value);

  if (splitMode === "equal") {
    hint.textContent = "The total will be divided equally among selected participants.";
    return;
  }

  let total = 0;

  document.querySelectorAll("#split-inputs [data-share]").forEach(function (input) {
    if (input.value !== "") {
      total += Number(input.value);
    }
  });

  if (splitMode === "exact") {
    hint.textContent =
      "Entered total: ₹" + total.toFixed(2) +
      " / ₹" + (Number.isFinite(amount) ? amount.toFixed(2) : "0.00");
  } else {
    hint.textContent =
      "Entered percentage: " + total.toFixed(2) + "% / 100%";
  }
}

// Handle the Equal, Exact, and Percentage buttons.
document.querySelectorAll("#split-mode [data-mode]").forEach(function (button) {
  button.addEventListener("click", function () {
    splitMode = button.dataset.mode;

    document.querySelectorAll("#split-mode [data-mode]").forEach(function (item) {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });

    renderSplitInputs();
    updateSplitHint();
  });
});

document.getElementById("exp-amount").addEventListener("input", updateSplitHint);

// Save the expense through a backend API.
document.getElementById("expense-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  showError("");

  const submitButton = this.querySelector("button[type='submit']");
  const description = document.getElementById("exp-desc").value.trim();
  const amount = Number(document.getElementById("exp-amount").value);
  const paidBy = document.getElementById("exp-payer").value;
  const participants = getSelectedParticipants();

  if (!description) {
    showError("Enter an expense description.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showError("Enter an amount greater than zero.");
    return;
  }

  if (!paidBy) {
    showError("Choose who paid for this expense.");
    return;
  }

  if (participants.length === 0) {
    showError("Select at least one participant.");
    return;
  }

  const inputs = {};

  document.querySelectorAll("#split-inputs [data-share]").forEach(function (input) {
    inputs[input.dataset.share] =
      input.value.trim() === "" ? NaN : Number(input.value);
  });

  // Use the existing split calculation from core.js.
  const splitResult = buildShares(
    splitMode,
    amount,
    participants,
    inputs
  );

  if (!splitResult.ok) {
    showError(splitResult.message || "Please check the split amounts.");
    return;
  }

  const apiParticipants = participants.map(function (member) {
    return {
      memberId: member,
      shareAmount: splitResult.shares[member]
    };
  });

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    await apiRequest("/expenses", {
      method: "POST",
      body: JSON.stringify({
        groupId: group._id,
        description: description,
        amount: amount,
        paidBy: paidBy,
        splitType: splitMode,
        participants: apiParticipants
      })
    });

    setFlash("Expense added successfully.");
    window.location.href = "ledger.html";

  } catch (error) {
    showError(error.message || "Could not save the expense.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Add expense";
  }
});

loadExpensePage();
