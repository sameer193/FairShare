"use strict";

/*
    ledger.js

    This file displays all expenses of the current group.

    It allows the user to:
    1. View all expenses
    2. See who paid
    3. See how the expense was split
    4. Delete an expense
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


    // Get groups and current group.
    let groups = ctx.groups;

    let group = ctx.group;


    // ========================================================
    // 3. NAVBAR
    // ========================================================

    renderNavbar(
      currentUser,
      "ledger",
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
    // 5. DISPLAY EXPENSES
    // ========================================================

    function renderExpenses() {

      let box =
        document.getElementById(
          "expense-list"
        );


      // ====================================================
      // NO EXPENSES
      // ====================================================

      if (group.expenses.length === 0) {

        box.innerHTML =
          '<div class="empty-state">' +

          "<b>No expenses yet</b>" +

          "Head to Add expense to log " +
          "your first bill." +

          "</div>";

        return;
      }


      // ====================================================
      // SORT EXPENSES
      // ====================================================

      /*
          We create a copy of the expenses array
          before sorting it.

          This prevents us from changing the
          original array order.
      */

      let sorted = [];


      for (
        let i = 0;
        i < group.expenses.length;
        i++
      ) {

        sorted.push(
          group.expenses[i]
        );
      }


      // Newest expense should appear first.
      sorted.sort(function (a, b) {

        return b.id - a.id;
      });


      // ====================================================
      // CREATE EXPENSE HTML
      // ====================================================

      let rows = "";


      for (
        let i = 0;
        i < sorted.length;
        i++
      ) {

        let expense =
          sorted[i];


        // Get expense information.
        let id =
          expense.id;

        let desc =
          expense.desc;

        let amount =
          expense.amount;

        let payer =
          expense.payer;

        let mode =
          expense.mode;

        let participants =
          expense.participants;

        let date =
          expense.date;


        // =================================================
        // FIND NUMBER OF PARTICIPANTS
        // =================================================

        let who = "";


        if (
          participants &&
          participants.length > 0
        ) {

          who =
            "Split among " +
            participants.length +
            " of " +
            group.members.length;
        }


        // =================================================
        // CREATE EXPENSE ROW
        // =================================================

        rows =
          rows +

          '<div class="expense">' +

          '<div class="desc">' +
          desc +
          "</div>" +

          '<div class="amt">' +
          fmt(amount) +
          "</div>" +

          '<button class="btn-danger-sm del" ' +
          'data-del-expense="' +
          id +
          '">' +

          "Delete" +

          "</button>" +

          '<div class="meta">' +

          payer +
          " paid · " +
          date +

          '<span class="mode">' +
          mode +
          "</span>" +

          '<span class="who">' +
          who +
          "</span>" +

          "</div>" +

          "</div>";
      }


      // Put all rows on the page.
      box.innerHTML = rows;
    }


    // ========================================================
    // 6. DISPLAY EXPENSES WHEN PAGE LOADS
    // ========================================================

    renderExpenses();


    // ========================================================
    // 7. DELETE EXPENSE
    // ========================================================

    document
      .getElementById("expense-list")
      .addEventListener(
        "click",
        function (event) {


          // Get the expense ID.
          let id =
            event.target.dataset.delExpense;


          // If the clicked element isn't
          // a delete button, do nothing.
          if (!id) {

            return;
          }


          // Convert ID from string to number.
          id = Number(id);


          // =================================================
          // CREATE NEW EXPENSE ARRAY
          // =================================================

          let remainingExpenses = [];


          for (
            let i = 0;
            i < group.expenses.length;
            i++
          ) {

            // Keep every expense except
            // the one we want to delete.
            if (
              group.expenses[i].id !== id
            ) {

              remainingExpenses.push(
                group.expenses[i]
              );
            }
          }


          // Replace old expense list.
          group.expenses =
            remainingExpenses;


          // Save updated data.
          persist();


          // Update screen.
          renderExpenses();


          // Show message.
          toast(
            "Expense removed."
          );
        }
      );
  }
}