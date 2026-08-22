"use strict";

/*
    dashboard.js

    This file controls the FairShare Dashboard.

    It does four main things:
    1. Shows dashboard statistics
    2. Shows user's groups
    3. Creates a new group
    4. Opens an existing group
*/


// ================================================================
// 1. CHECK LOGIN
// ================================================================

const currentUser = requireLogin();


// Continue only if a user is logged in.
if (currentUser) {


  // ============================================================
  // 2. SHOW NAVBAR
  // ============================================================

  renderNavbar(currentUser, "dashboard", null);

  showFlashIfAny();


  // Get all groups belonging to this user.
  let groups = getUserGroups(currentUser.id);


  // ============================================================
  // 3. SHOW DASHBOARD STATISTICS
  // ============================================================

  function renderStats() {

    let totalSpent = 0;

    let totalExpenses = 0;

    let totalTransfers = 0;


    // Go through every group.
    for (let i = 0; i < groups.length; i++) {

      let group = groups[i];


      // Count expenses.
      totalExpenses =
        totalExpenses + group.expenses.length;


      // Add the amount of every expense.
      for (let j = 0; j < group.expenses.length; j++) {

        let expense = group.expenses[j];

        totalSpent =
          totalSpent + expense.amount;
      }


      // Calculate this group's balances.
      let balances = computeBalances(group);


      // Find how many transfers are needed.
      let transfers = optimizeSettlement(balances);


      totalTransfers =
        totalTransfers + transfers.length;
    }


    // Show greeting.
    let firstName =
      currentUser.username.split(" ")[0];


    document.getElementById("greeting").textContent =
      "Hi " +
      firstName +
      " — here's where your money stands.";


    // ========================================================
    // CREATE STATISTICS
    // ========================================================

    let stats = [

      {
        label: "Total spent",
        value: fmt(totalSpent)
      },

      {
        label: "Your groups",
        value: groups.length
      },

      {
        label: "Expenses",
        value: totalExpenses
      },

      {
        label: "Settle-up transfers",
        value: totalTransfers
      }
    ];


    // Create HTML for the statistics.
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
  }


  // ================================================================
  // 4. SHOW GROUPS
  // ================================================================

  function renderGroups() {

    let box =
      document.getElementById("group-grid");


    // If there are no groups.
    if (groups.length === 0) {

      box.innerHTML =
        '<div class="empty-state">' +

        "<b>No groups yet</b>" +

        "Create your first group above to start " +
        "splitting bills." +

        "</div>";

      return;
    }


    // Store all group cards.
    let cards = "";


    // Go through every group.
    for (let i = 0; i < groups.length; i++) {

      let group = groups[i];

      let total = 0;


      // Calculate total money spent in this group.
      for (let j = 0; j < group.expenses.length; j++) {

        total =
          total + group.expenses[j].amount;
      }


      // Create group card.
      cards =
        cards +

        '<button type="button" ' +
        'class="group-card" ' +
        'data-open-group="' +
        group.id +
        '">' +

        "<b>" +
        group.name +
        "</b>" +

        '<span class="g-meta">' +

        group.members.length +
        " members · " +

        group.expenses.length +
        " expenses" +

        "</span>" +

        '<div class="g-total">' +

        fmt(total) +

        "</div>" +

        "</button>";
    }


    box.innerHTML = cards;
  }


  // ================================================================
  // 5. RENDER DASHBOARD
  // ================================================================

  function render() {

    renderStats();

    renderGroups();
  }


  // Display everything when page loads.
  render();


  // ================================================================
  // 6. CREATE NEW GROUP
  // ================================================================

  document
    .getElementById("btn-create-group")
    .addEventListener("click", function () {


      // Get input box.
      let input =
        document.getElementById("group-name");


      // Get the typed group name.
      let name =
        input.value.trim();


      // Check empty name.
      if (!name) {

        showError(
          "group-error",
          "Group name can't be empty."
        );

        return;
      }


      // ========================================================
      // CHECK DUPLICATE GROUP NAME
      // ========================================================

      let duplicate = false;


      for (let i = 0; i < groups.length; i++) {

        let group = groups[i];


        if (
          group.name.toLowerCase() ===
          name.toLowerCase()
        ) {

          duplicate = true;

          break;
        }
      }


      if (duplicate) {

        showError(
          "group-error",
          "You already have a group with that name."
        );

        return;
      }


      // ========================================================
      // CREATE GROUP
      // ========================================================

      let newGroup =
        createGroup(name);


      // Add new group to groups array.
      groups.push(newGroup);


      // Save updated groups.
      saveUserGroups(
        currentUser.id,
        groups
      );


      // Make the new group active.
      setActiveGroupId(newGroup.id);


      // Show message on next page.
      setFlash(
        'Group "' +
        name +
        '" created.'
      );


      // Open group page.
      window.location.href =
        "group.html";
    });


  // ================================================================
  // 7. CREATE GROUP USING ENTER KEY
  // ================================================================

  document
    .getElementById("group-name")
    .addEventListener("keydown", function (event) {


      if (event.key === "Enter") {

        document
          .getElementById("btn-create-group")
          .click();
      }
    });


  // ================================================================
  // 8. OPEN EXISTING GROUP
  // ================================================================

  document
    .getElementById("group-grid")
    .addEventListener("click", function (event) {


      /*
          data-open-group contains the ID
          of the group we clicked.
      */

      let groupId =
        event.target.dataset.openGroup;


      // If we didn't click a group button,
      // do nothing.
      if (!groupId) {

        return;
      }


      // Convert ID from string to number.
      groupId = Number(groupId);


      // Make this group active.
      setActiveGroupId(groupId);


      // Open group page.
      window.location.href =
        "group.html";
    });
}