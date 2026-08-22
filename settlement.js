"use strict";

/*
    settlement.js

    This file handles the settlement page.

    It shows:
    1. Suggested payments
    2. Manual payment recording
    3. Payment history
    4. Undo payment

    Important:
    This file does NOT calculate the balances itself.

    It uses:
        computeBalances()
        optimizeSettlement()

    from core.js.
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


    // Get groups and active group.
    let groups = ctx.groups;

    let group = ctx.group;


    // ========================================================
    // 3. NAVBAR
    // ========================================================

    renderNavbar(
      currentUser,
      "settlement",
      group
    );

    showFlashIfAny();


    // ========================================================
    // 4. SAVE DATA
    // ========================================================

    function persist() {

      saveUserGroups(
        currentUser.id,
        groups
      );
    }


    // ========================================================
    // 5. RENDER EVERYTHING
    // ========================================================

    function render() {

      // Calculate current balances.
      let balances =
        computeBalances(group);


      // Calculate recommended transfers.
      let transfers =
        optimizeSettlement(balances);


      // Display recommended payments.
      renderSlips(transfers);


      // Display member dropdowns.
      renderSelects();


      // Display payment history.
      renderHistory();
    }


    // ========================================================
    // 6. DISPLAY SUGGESTED PAYMENTS
    // ========================================================

    function renderSlips(transfers) {

      let box =
        document.getElementById(
          "settlement-list"
        );


      // ====================================================
      // NO EXPENSES
      // ====================================================

      if (group.expenses.length === 0) {

        box.innerHTML =
          '<div class="settle-clear">' +

          "Add expenses to generate a " +
          "settlement plan." +

          "</div>";

        return;
      }


      // ====================================================
      // NO TRANSFERS NEEDED
      // ====================================================

      if (transfers.length === 0) {

        box.innerHTML =
          '<div class="settle-clear">' +

          "✓ All settled — nobody owes anything." +

          "</div>";

        return;
      }


      // ====================================================
      // CREATE PAYMENT CARDS
      // ====================================================

      let rows = "";


      for (
        let i = 0;
        i < transfers.length;
        i++
      ) {

        let transfer =
          transfers[i];


        let from =
          transfer.from;

        let to =
          transfer.to;

        let amount =
          transfer.amount;


        rows =
          rows +

          '<div class="slip">' +

          '<div class="route">' +

          from +

          ' <span class="arrow">→</span> ' +

          to +

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
          from +
          '" ' +
          'data-to="' +
          to +
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
    // 7. DISPLAY MEMBER DROPDOWNS
    // ========================================================

    function renderSelects() {

      let options = "";


      for (
        let i = 0;
        i < group.members.length;
        i++
      ) {

        let member =
          group.members[i];


        options =
          options +

          '<option value="' +
          member +
          '">' +

          member +

          "</option>";
      }


      document.getElementById(
        "settle-from"
      ).innerHTML = options;


      document.getElementById(
        "settle-to"
      ).innerHTML = options;
    }


    // ========================================================
    // 8. DISPLAY PAYMENT HISTORY
    // ========================================================

    function renderHistory() {

      let box =
        document.getElementById(
          "payment-history"
        );


      // Get settlement history.
      let list =
        group.settlements;


      // Make sure list exists.
      if (!list) {

        list = [];
      }


      // ====================================================
      // NO PAYMENT HISTORY
      // ====================================================

      if (list.length === 0) {

        box.innerHTML =
          '<div class="empty-state">' +

          "<b>No payments recorded yet</b>" +

          "Confirmed settlements will show up here." +

          "</div>";

        return;
      }


      // ====================================================
      // COPY PAYMENT LIST
      // ====================================================

      let sorted = [];


      for (
        let i = 0;
        i < list.length;
        i++
      ) {

        sorted.push(list[i]);
      }


      // Newest payment first.
      sorted.sort(function (a, b) {

        return b.id - a.id;
      });


      // ====================================================
      // CREATE HISTORY ROWS
      // ====================================================

      let rows = "";


      for (
        let i = 0;
        i < sorted.length;
        i++
      ) {

        let settlement =
          sorted[i];


        let id =
          settlement.id;

        let from =
          settlement.from;

        let to =
          settlement.to;

        let amount =
          settlement.amount;

        let date =
          settlement.date;


        rows =
          rows +

          '<div class="payment-row">' +

          '<div class="route">' +

          from +

          ' <span class="arrow">→</span> ' +

          to +

          "</div>" +

          '<div class="p-meta">' +

          date +

          "</div>" +

          '<div class="p-amt">' +

          fmt(amount) +

          "</div>" +

          '<button class="btn-danger-sm" ' +
          'data-undo-settlement="' +
          id +
          '">' +

          "Undo" +

          "</button>" +

          "</div>";
      }


      box.innerHTML = rows;
    }


    // ========================================================
    // 9. FIRST DISPLAY
    // ========================================================

    render();


    // ========================================================
    // 10. MARK SUGGESTED PAYMENT AS PAID
    // ========================================================

    document
      .getElementById("settlement-list")
      .addEventListener(
        "click",
        function (event) {


          // Find the clicked button.
          let button =
            event.target.closest(
              ".btn-mark-paid"
            );


          // If it wasn't the button,
          // do nothing.
          if (!button) {

            return;
          }


          // Get payment information.
          let from =
            button.dataset.from;

          let to =
            button.dataset.to;

          let amount =
            Number(
              button.dataset.amount
            );


          // =================================================
          // CONFIRM PAYMENT
          // =================================================

          let answer =
            confirm(
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


          // =================================================
          // RECORD PAYMENT
          // =================================================

          recordSettlement(
            group,
            from,
            to,
            amount
          );


          // Save changes.
          persist();


          // Update everything.
          render();


          // Show message.
          toast(
            "Marked " +
            from +
            " → " +
            to +
            " as paid."
          );
        }
      );


    // ========================================================
    // 11. MANUAL PAYMENT FORM
    // ========================================================

    document
      .getElementById("settle-form")
      .addEventListener(
        "submit",
        function (event) {


          // Stop normal form submission.
          event.preventDefault();


          // Get selected payer.
          let from =
            document.getElementById(
              "settle-from"
            ).value;


          // Get selected receiver.
          let to =
            document.getElementById(
              "settle-to"
            ).value;


          // Get payment amount.
          let amount =
            parseFloat(
              document.getElementById(
                "settle-amount"
              ).value
            );


          amount =
            round2(amount);


          // =================================================
          // VALIDATION
          // =================================================

          if (group.members.length < 2) {

            showError(
              "settle-error",
              "Add at least two members first."
            );

            return;
          }


          // Payer and receiver cannot be same.
          if (from === to) {

            showError(
              "settle-error",
              "Payer and receiver must be " +
              "different people."
            );

            return;
          }


          // Amount must be positive.
          if (!amount || amount <= 0) {

            showError(
              "settle-error",
              "Amount must be greater than zero."
            );

            return;
          }


          // =================================================
          // SAVE PAYMENT
          // =================================================

          recordSettlement(
            group,
            from,
            to,
            amount
          );


          persist();


          // Clear form.
          event.target.reset();


          // Update screen.
          render();


          // Show message.
          toast(
            "Recorded: " +
            from +
            " paid " +
            to +
            " " +
            fmt(amount) +
            "."
          );
        }
      );


    // ========================================================
    // 12. UNDO PAYMENT
    // ========================================================

    document
      .getElementById("payment-history")
      .addEventListener(
        "click",
        function (event) {


          // Get settlement ID.
          let id =
            event.target.dataset
              .undoSettlement;


          // If not an Undo button.
          if (!id) {

            return;
          }


          // Convert ID to number.
          id = Number(id);


          // =================================================
          // CREATE NEW SETTLEMENT ARRAY
          // =================================================

          let remainingSettlements = [];


          for (
            let i = 0;
            i < group.settlements.length;
            i++
          ) {

            if (
              group.settlements[i].id !== id
            ) {

              remainingSettlements.push(
                group.settlements[i]
              );
            }
          }


          // Replace old settlement list.
          group.settlements =
            remainingSettlements;


          // Save changes.
          persist();


          // Update page.
          render();


          // Show message.
          toast(
            "Payment record removed."
          );
        }
      );
  }
}