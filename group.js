
"use strict";

// ============================================================
// 1. CHECK LOGIN
// ============================================================

const currentUser = requireLogin();

if (currentUser) {

  // ==========================================================
  // 2. SHOW NAVBAR
  // ==========================================================

  renderNavbar(currentUser, "group", null);
  showFlashIfAny();

  // ==========================================================
  // 3. LOAD ACTIVE GROUP FROM BACKEND
  // ==========================================================

  async function loadGroup() {

    const groupId = sessionStorage.getItem("FairShare-active-group");

    if (!groupId) {
      window.location.href = "dashboard.html";
      return;
    }

    try {

      const result = await apiRequest("/groups/" + groupId);

      if (!result.success || !result.data) {
        throw new Error("Group details were not returned.");
      }

      const group = result.data;

      // ======================================================
      // 4. DISPLAY GROUP DETAILS
      // ======================================================

      document.getElementById("group-title").textContent =
        group.name;

      const members = group.members || [];
      const expenses = group.expenses || [];

      const memberText =
        members.length + (members.length === 1 ? " member" : " members");

      const expenseText =
        expenses.length + (expenses.length === 1 ? " expense" : " expenses");

      document.getElementById("group-sub").textContent =
        memberText + " · " + expenseText;

      // ======================================================
      // 5. CALCULATE STATISTICS
      // ======================================================

      let total = 0;

      for (let i = 0; i < expenses.length; i++) {
        total += expenses[i].amount;
      }

      const localFormatGroup = {
        ...group,
        expenses: expenses,
        settlements: group.settlements || []
      };

      const balances = computeBalances(localFormatGroup);
      const transfers = optimizeSettlement(balances);

      let perHead = 0;

      if (members.length > 0) {
        perHead = total / members.length;
      }

      const stats = [
        { label: "Total spent", value: fmt(total) },
        { label: "Members", value: members.length },
        { label: "Avg per member", value: fmt(perHead) },
        { label: "Settle-up transfers", value: transfers.length }
      ];

      let cells = "";

      for (let i = 0; i < stats.length; i++) {

        cells +=
          '<div class="stat">' +
          "<b>" + stats[i].value + "</b>" +
          "<small>" + stats[i].label + "</small>" +
          "</div>";
      }

      document.getElementById("stat-grid").innerHTML = cells;

      // ======================================================
      // 6. DELETE GROUP THROUGH BACKEND
      // ======================================================

      document
        .getElementById("btn-del-group")
        .addEventListener("click", async function () {

          const answer = confirm(
            'Delete "' + group.name + '"? This cannot be undone.'
          );

          if (!answer) {
            return;
          }

          const button = document.getElementById("btn-del-group");
          button.disabled = true;

          try {

            await apiRequest("/groups/" + group._id, {
              method: "DELETE"
            });

            clearActiveGroupId();

            setFlash('Group "' + group.name + '" deleted.');

            window.location.href = "dashboard.html";

          } catch (error) {

            alert("Could not delete group: " + error.message);
            button.disabled = false;
          }
        });

    } catch (error) {

      console.error("Loading group failed:", error);

      alert("Could not load group: " + error.message);

      window.location.href = "dashboard.html";
    }
  }

  loadGroup();
}
