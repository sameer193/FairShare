
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

      // Fetch the group details.
      const result = await apiRequest("/groups/" + groupId);

      if (!result.success || !result.data) {
        throw new Error("Group details were not returned.");
      }

      const group = result.data;

      // ======================================================
      // 4. LOAD EXPENSES FOR THIS GROUP
      // ======================================================

      const expenseResult = await apiRequest(
        "/expenses?groupId=" + encodeURIComponent(group._id)
      );

      if (
        !expenseResult.success ||
        !Array.isArray(expenseResult.data)
      ) {
        throw new Error("Could not load group expenses.");
      }

      // Convert backend expenses into the format expected by core.js.
      const expenses = expenseResult.data.map(function (expense) {

        const shares = {};

        (expense.participants || []).forEach(function (person) {
          shares[person.memberId] = Number(person.shareAmount);
        });

        return {
          id: expense._id,
          desc: expense.description,
          amount: Number(expense.amount),
          payer: expense.paidBy,
          mode: expense.splitType,
          participants: (expense.participants || []).map(
            function (person) {
              return person.memberId;
            }
          ),
          shares: shares,
          date: expense.createdAt || ""
        };
      });

      // ======================================================
      // 5. LOAD RECORDED SETTLEMENTS FOR THIS GROUP
      // ======================================================

      const settlementResult = await apiRequest(
        "/settlements?groupId=" + encodeURIComponent(group._id)
      );

      if (
        !settlementResult.success ||
        !Array.isArray(settlementResult.data)
      ) {
        throw new Error("Could not load group settlements.");
      }

      const settlements = settlementResult.data;

      // ======================================================
      // 6. DISPLAY GROUP DETAILS
      // ======================================================

      document.getElementById("group-title").textContent =
        group.name;

      const members = group.members || [];

      const memberText =
        members.length +
        (members.length === 1 ? " member" : " members");

      const expenseText =
        expenses.length +
        (expenses.length === 1 ? " expense" : " expenses");

      document.getElementById("group-sub").textContent =
        memberText + " · " + expenseText;

      // ======================================================
      // 7. CALCULATE GROUP STATISTICS
      // ======================================================

      let total = 0;

      for (let i = 0; i < expenses.length; i++) {
        total += expenses[i].amount;
      }

      const localFormatGroup = {
        ...group,
        expenses: expenses,
        settlements: settlements
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
      // 8. DELETE GROUP THROUGH BACKEND
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
