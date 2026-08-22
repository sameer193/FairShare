"use strict";

/*
    group.js

    This file controls the main page of one group.

    It shows:
    1. Group name
    2. Number of members
    3. Number of expenses
    4. Total money spent
    5. Average spending per member
    6. Number of settlement transfers

    It also allows the user to delete the group.
*/


// ================================================================
// 1. CHECK LOGIN
// ================================================================

const currentUser = requireLogin();


// Continue only if the user is logged in.
if (currentUser) {


  // ============================================================
  // 2. GET ACTIVE GROUP
  // ============================================================

  const ctx = requireActiveGroup(currentUser);


  // Continue only if an active group exists.
  if (ctx) {


    // Get the group from ctx.
    let group = ctx.group;


    // ========================================================
    // 3. DISPLAY NAVBAR
    // ========================================================

    renderNavbar(
      currentUser,
      "group",
      group
    );

    showFlashIfAny();


    // ========================================================
    // 4. DISPLAY GROUP NAME
    // ========================================================

    document.getElementById("group-title").textContent =
      group.name;


    // Number of members.
    let memberText =
      group.members.length + " member";


    if (group.members.length !== 1) {

      memberText = memberText + "s";
    }


    // Number of expenses.
    let expenseText =
      group.expenses.length + " expense";


    if (group.expenses.length !== 1) {

      expenseText = expenseText + "s";
    }


    // Show member and expense count.
    document.getElementById("group-sub").textContent =
      memberText +
      " · " +
      expenseText;


    // ========================================================
    // 5. CALCULATE TOTAL SPENDING
    // ========================================================

    let total = 0;


    for (
      let i = 0;
      i < group.expenses.length;
      i++
    ) {

      total =
        total + group.expenses[i].amount;
    }


    // ========================================================
    // 6. CALCULATE BALANCES
    // ========================================================

    let balances =
      computeBalances(group);


    // ========================================================
    // 7. CALCULATE SETTLEMENT TRANSFERS
    // ========================================================

    let transfers =
      optimizeSettlement(balances);


    // ========================================================
    // 8. CALCULATE AVERAGE PER MEMBER
    // ========================================================

    let perHead = 0;


    if (group.members.length > 0) {

      perHead =
        total / group.members.length;
    }


    // ========================================================
    // 9. CREATE STATISTICS
    // ========================================================

    let stats = [

      {
        label: "Total spent",
        value: fmt(total)
      },

      {
        label: "Members",
        value: group.members.length
      },

      {
        label: "Avg per member",
        value: fmt(perHead)
      },

      {
        label: "Settle-up transfers",
        value: transfers.length
      }
    ];


    // ========================================================
    // 10. DISPLAY STATISTICS
    // ========================================================

    let cells = "";


    for (let i = 0; i < stats.length; i++) {

      let stat = stats[i];


      cells =
        cells +

        '<div class="stat">' +

        "<b>" +
        stat.value +
        "</b>" +

        "<small>" +
        stat.label +
        "</small>" +

        "</div>";
    }


    document.getElementById("stat-grid").innerHTML =
      cells;


    // ========================================================
    // 11. DELETE GROUP
    // ========================================================

    document
      .getElementById("btn-del-group")
      .addEventListener("click", function () {


        // Ask the user for confirmation.
        let answer = confirm(
          'Delete "' +
          group.name +
          '" and everything in it? ' +
          "This can't be undone."
        );


        // If user selects Cancel.
        if (!answer) {

          return;
        }


        // Get all groups of current user.
        let groups =
          getUserGroups(currentUser.id);


        // Create a new array without
        // the current group.
        let remainingGroups = [];


        for (
          let i = 0;
          i < groups.length;
          i++
        ) {

          if (groups[i].id !== group.id) {

            remainingGroups.push(groups[i]);
          }
        }


        // Save the updated groups.
        saveUserGroups(
          currentUser.id,
          remainingGroups
        );


        // Remove active group.
        clearActiveGroupId();


        // Show message on dashboard.
        setFlash(
          'Group "' +
          group.name +
          '" deleted.'
        );


        // Go back to dashboard.
        window.location.href =
          "dashboard.html";
      });
  }
}