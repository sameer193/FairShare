
"use strict";

/*
    dashboard.js

    This file controls the FairShare Dashboard.
    Groups are now loaded and created through the backend API.
*/

const currentUser = requireLogin();

if (currentUser) {

  // ============================================================
  // 1. SHOW NAVBAR
  // ============================================================

  renderNavbar(currentUser, "dashboard", null);
  showFlashIfAny();

  // Groups will be loaded from the backend.
  let groups = [];

  // ============================================================
  // 2. SHOW DASHBOARD STATISTICS
  // ============================================================

  function renderStats() {

    let totalSpent = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    for (let i = 0; i < groups.length; i++) {

      let group = groups[i];

      let expenses = group.expenses || [];

      totalExpenses += expenses.length;

      for (let j = 0; j < expenses.length; j++) {
        totalSpent += expenses[j].amount;
      }

      let balances = computeBalances({
        ...group,
        expenses: expenses,
        settlements: group.settlements || []
      });

      let transfers = optimizeSettlement(balances);

      totalTransfers += transfers.length;
    }

    const greeting = document.getElementById("greeting");

    const displayName = (
      currentUser.name ||
      currentUser.username ||
      "there"
    )
      .replace(/[_\d]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    greeting.textContent =
      `Hi ${displayName || "there"} — here's where your money stands.`;

    const stats = [
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

    let cells = "";

    for (let i = 0; i < stats.length; i++) {

      let stat = stats[i];

      cells +=
        '<div class="stat">' +
        "<b>" + stat.value + "</b>" +
        "<small>" + stat.label + "</small>" +
        "</div>";
    }

    document.getElementById("stat-grid").innerHTML = cells;
  }

  // ============================================================
  // 3. SHOW GROUPS
  // ============================================================

  function renderGroups() {

    const box = document.getElementById("group-grid");

    if (groups.length === 0) {

      box.innerHTML =
        '<div class="empty-state">' +
        "<b>No groups yet</b>" +
        "Create your first group above to start splitting bills." +
        "</div>";

      return;
    }

    let cards = "";

    for (let i = 0; i < groups.length; i++) {

      let group = groups[i];

      let expenses = group.expenses || [];
      let members = group.members || [];

      let total = 0;

      for (let j = 0; j < expenses.length; j++) {
        total += expenses[j].amount;
      }

      cards +=
        '<button type="button" ' +
        'class="group-card" ' +
        'data-open-group="' + group._id + '">' +

        "<b>" + escapeHTML(group.name) + "</b>" +

        '<span class="g-meta">' +
        members.length + " members · " +
        expenses.length + " expenses" +
        "</span>" +

        '<div class="g-total">' +
        fmt(total) +
        "</div>" +

        "</button>";
    }

    box.innerHTML = cards;
  }

  // Escape group names before inserting them into HTML.
  function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, function (character) {

      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return replacements[character];
    });
  }

  // ============================================================
  // 4. RENDER DASHBOARD
  // ============================================================

  function render() {
    renderStats();
    renderGroups();
  }

  // ============================================================
  // 5. LOAD GROUPS FROM BACKEND
  // ============================================================

  async function loadGroups() {

    const box = document.getElementById("group-grid");

    box.innerHTML = "Loading your groups...";

    try {

      const result = await apiRequest("/groups");

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error("The backend returned an unexpected groups response.");
      }

      groups = result.data;

      render();

    } catch (error) {

      box.innerHTML =
        '<div class="empty-state">' +
        "<b>Could not load groups</b>" +
        escapeHTML(error.message) +
        "</div>";

      console.error("Loading groups failed:", error);
    }
  }

  // Load groups when the dashboard opens.
  loadGroups();

  // ============================================================
  // 6. CREATE NEW GROUP
  // ============================================================

  document
    .getElementById("btn-create-group")
    .addEventListener("click", async function () {

      const input = document.getElementById("group-name");

      const name = input.value.trim();

      if (!name) {

        showError(
          "group-error",
          "Group name can't be empty."
        );

        return;
      }

      // Check for a duplicate group name.
      let duplicate = false;

      for (let i = 0; i < groups.length; i++) {

        if (
          groups[i].name.toLowerCase() === name.toLowerCase()
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

      const button = document.getElementById("btn-create-group");

      button.disabled = true;

      try {

        const result = await apiRequest("/groups", {
          method: "POST",
          body: JSON.stringify({
            name: name,
            members: []
          })
        });

        if (!result.success || !result.data || !result.data._id) {
          throw new Error("The backend did not return the new group.");
        }

        // Save the new group's MongoDB ID.
        setActiveGroupId(result.data._id);

        // Clear the input.
        input.value = "";

        // Show a success message on the group page.
        setFlash('Group "' + result.data.name + '" created.');

        // Open the newly created group.
        window.location.href = "group.html";

      } catch (error) {

        showError("group-error", error.message);

        console.error("Creating group failed:", error);

      } finally {

        button.disabled = false;
      }
    });

  // ============================================================
  // 7. CREATE GROUP USING ENTER KEY
  // ============================================================

  document
    .getElementById("group-name")
    .addEventListener("keydown", function (event) {

      if (event.key === "Enter") {
        event.preventDefault();

        document
          .getElementById("btn-create-group")
          .click();
      }
    });

  // ============================================================
  // 8. OPEN EXISTING GROUP
  // ============================================================

  document
    .getElementById("group-grid")
    .addEventListener("click", function (event) {

      const groupButton = event.target.closest("[data-open-group]");

      if (!groupButton) {
        return;
      }

      // Keep the MongoDB ID as a string.
      const groupId = groupButton.dataset.openGroup;

      setActiveGroupId(groupId);

      // The group page needs its own backend integration next.
      window.location.href = "group.html";
    });
}
