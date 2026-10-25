
"use strict";

/*
    settlement.js

    This file handles the settlement page.

    It shows:
    1. Suggested payments
    2. Manual payment recording
    3. Payment history
    4. Undo payment

    Balance calculations are handled by core.js.
*/

// ================================================================
// 1. CHECK LOGIN
// ================================================================

const currentUser = requireLogin();

if (currentUser) {

  // ============================================================
  // 2. GET ACTIVE GROUP
  // ============================================================

  const ctx = requireActiveGroup(currentUser);

  if (ctx) {

    let groups = ctx.groups;
    let group = ctx.group;

    // ========================================================
    // 3. NAVBAR
    // ========================================================

    renderNavbar(currentUser, "settlement", group);
    showFlashIfAny();

    // ========================================================
    // 4. SAVE DATA
    // ========================================================

    function persist() {
      saveUserGroups(currentUser.id, groups);
    }

    // ========================================================
    // 5. SAFE HTML TEXT
    // ========================================================

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // ========================================================
    // 6. RENDER EVERYTHING
    // ========================================================

    function render() {

      let balances = computeBalances(group);

      let transfers = optimizeSettlement(balances);

      renderSlips(transfers);
      renderSelects();
      renderHistory();
    }

    // ========================================================
    // 7. DISPLAY SUGGESTED PAYMENTS
    // ========================================================

    function renderSlips(transfers) {

      let box = document.getElementById("settlement-list");

      if (!Array.isArray(group.expenses) ||
        group.expenses.length === 0) {

        box.innerHTML =
          '<div class="settle-clear">' +
          "Add expenses to generate a settlement plan." +
          "</div>";

        return;
      }

      if (transfers.length === 0) {

        box.innerHTML =
          '<div class="settle-clear">' +
          "✓ All settled — nobody owes anything." +
          "</div>";

        return;
      }

      let rows = "";

      for (let i = 0; i < transfers.length; i++) {

        let transfer = transfers[i];

        let from = transfer.from;
        let to = transfer.to;
        let amount = transfer.amount;

        rows +=
          '<div class="slip">' +

          '<div class="route">' +
          escapeHtml(from) +
          ' <span class="arrow">→</span> ' +
          escapeHtml(to) +
          "</div>" +

          '<div class="pay">' +
          fmt(amount) +
          "</div>" +

          "<small>" +
          "Transfer " +
          (i + 1) +
          " of " +
          transfers.length +
          "</small>" +

          '<button type="button" ' +
          'class="btn-mark-paid" ' +
          'data-from="' +
          escapeHtml(from) +
          '" ' +
          'data-to="' +
          escapeHtml(to) +
          '" ' +
          'data-amount="' +
          amount +
          '">' +
          "Mark as paid" +
          "</button>" +

          "</div>";
      }

      box.innerHTML = rows;
    }

    // ========================================================
    // 8. DISPLAY MEMBER DROPDOWNS
    // ========================================================

    function renderSelects() {

      let fromSelect = document.getElementById("settle-from");
      let toSelect = document.getElementById("settle-to");

      fromSelect.innerHTML = "";
      toSelect.innerHTML = "";

      for (let i = 0; i < group.members.length; i++) {

        let member = group.members[i];

        let fromOption = document.createElement("option");
        fromOption.value = member;
        fromOption.textContent = member;

        let toOption = document.createElement("option");
        toOption.value = member;
        toOption.textContent = member;

        fromSelect.appendChild(fromOption);
        toSelect.appendChild(toOption);
      }
    }

    // ========================================================
    // 9. DISPLAY PAYMENT HISTORY
    // ========================================================

    function renderHistory() {

      let box = document.getElementById("payment-history");

      let list = Array.isArray(group.settlements)
        ? group.settlements
        : [];

      if (list.length === 0) {

        box.innerHTML =
          '<div class="empty-state">' +
          "<b>No payments recorded yet</b>" +
          "Confirmed settlements will show up here." +
          "</div>";

        return;
      }

      // Copy the list before sorting.
      let sorted = list.slice();

      // Newest payment first.
      sorted.sort(function (a, b) {
        return Number(b.id) - Number(a.id);
      });

      let rows = "";

      for (let i = 0; i < sorted.length; i++) {

        let settlement = sorted[i];

        rows +=
          '<div class="payment-row">' +

          '<div class="route">' +
          escapeHtml(settlement.from) +
          ' <span class="arrow">→</span> ' +
          escapeHtml(settlement.to) +
          "</div>" +

          '<div class="p-meta">' +
          escapeHtml(settlement.date || "") +
          "</div>" +

          '<div class="p-amt">' +
          fmt(settlement.amount) +
          "</div>" +

          '<button type="button" class="btn-danger-sm" ' +
          'data-undo-settlement="' +
          escapeHtml(settlement.id) +
          '">' +
          "Undo" +
          "</button>" +

          "</div>";
      }

      box.innerHTML = rows;
    }

    // ========================================================
    // 10. FIRST DISPLAY
    // ========================================================

    render();

    // ========================================================
    // 11. MARK SUGGESTED PAYMENT AS PAID
    // ========================================================

    document
      .getElementById("settlement-list")
      .addEventListener("click", function (event) {

        let button = event.target.closest(".btn-mark-paid");

        if (!button) {
          return;
        }

        let from = button.dataset.from;
        let to = button.dataset.to;
        let amount = Number(button.dataset.amount);

        let answer = confirm(
          "Confirm that " +
          from +
          " paid " +
          to +
          " " +
          fmt(amount) +
          "?"
        );

        if (!answer) {
          return;
        }

        // Validate and record the payment.
        let result = recordSettlement(
          group,
          from,
          to,
          amount
        );

        // Never report success for a rejected payment.
        if (!result.ok) {
          toast(result.msg);
          return;
        }

        persist();
        render();

        toast(
          "Marked " +
          from +
          " → " +
          to +
          " as paid."
        );
      });

    // ========================================================
    // 12. MANUAL PAYMENT FORM
    // ========================================================

    document
      .getElementById("settle-form")
      .addEventListener("submit", function (event) {

        event.preventDefault();

        let from =
          document.getElementById("settle-from").value;

        let to =
          document.getElementById("settle-to").value;

        let rawAmount =
          document.getElementById("settle-amount").value;

        let amount = Number(rawAmount);

        if (group.members.length < 2) {

          showError(
            "settle-error",
            "Add at least two members first."
          );

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

          showError(
            "settle-error",
            "Amount must be greater than zero."
          );

          return;
        }

        // Record the payment through core.js.
        let result = recordSettlement(
          group,
          from,
          to,
          amount
        );

        if (!result.ok) {

          showError(
            "settle-error",
            result.msg
          );

          return;
        }

        // Save only successful payments.
        persist();

        event.target.reset();

        render();

        toast(
          "Recorded: " +
          from +
          " paid " +
          to +
          " " +
          fmt(amount) +
          "."
        );
      });

    // ========================================================
    // 13. UNDO PAYMENT
    // ========================================================

    // IMPORTANT:
    // This listener is outside the form-submit handler.
    // It is registered only once when the page loads.

    document
      .getElementById("payment-history")
      .addEventListener("click", function (event) {

        let button = event.target.closest(
          "[data-undo-settlement]"
        );

        if (!button) {
          return;
        }

        let id = Number(button.dataset.undoSettlement);

        if (!Number.isFinite(id)) {

          toast("Invalid payment record.");
          return;
        }

        let settlements = Array.isArray(group.settlements)
          ? group.settlements
          : [];

        let index = -1;

        // Find the payment to undo.
        for (let i = 0; i < settlements.length; i++) {

          if (Number(settlements[i].id) === id) {
            index = i;
            break;
          }
        }

        if (index === -1) {

          toast("Payment record not found.");
          return;
        }

        let answer = confirm(
          "Undo this payment record? Balances will change."
        );

        if (!answer) {
          return;
        }

        // Remove exactly one payment record.
        settlements.splice(index, 1);

        group.settlements = settlements;

        persist();
        render();

        toast("Payment record removed.");
      });

  }
}
