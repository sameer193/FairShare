"use strict";

/*
    members.js

    This file manages members of the current group.

    It allows the user to:
    1. View members
    2. Add members
    3. Add multiple members using commas
    4. Remove members
    5. Prevent duplicate members
    6. Prevent removing members who are used in expenses
*/


// ================================================================
// 1. CHECK LOGIN
// ================================================================

const currentUser = requireLogin();


// Continue only if user is logged in.
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
      "members",
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
    // 5. DISPLAY MEMBERS
    // ========================================================

    function renderMembers() {

      let box =
        document.getElementById("member-list");


      // If there are no members.
      if (group.members.length === 0) {

        box.innerHTML =
          '<div class="empty-state">' +

          "<b>No members yet</b>" +

          "Add the people sharing these bills above." +

          "</div>";

        return;
      }


      // Store all member HTML.
      let chips = "";


      // Go through every member.
      for (
        let i = 0;
        i < group.members.length;
        i++
      ) {

        let member =
          group.members[i];


        // Get initials of member.
        let memberInitials =
          initials(member);


        chips =
          chips +

          '<span class="chip">' +

          '<span class="avatar">' +

          memberInitials +

          "</span>" +

          member +

          '<button type="button" ' +
          'data-remove="' +
          member +
          '" ' +
          'aria-label="Remove ' +
          member +
          '">' +

          "×" +

          "</button>" +

          "</span>";
      }


      box.innerHTML = chips;
    }


    // Display members when page loads.
    renderMembers();


    // ========================================================
    // 6. ADD MEMBERS
    // ========================================================

    function addMembers() {


      // Get input box.
      let input =
        document.getElementById("member-name");


      // Get what the user typed.
      let typedText =
        input.value.trim();


      // Check if input is empty.
      if (!typedText) {

        showError(
          "member-error",
          "Member name can't be empty."
        );

        return;
      }


      // ====================================================
      // SPLIT INPUT BY COMMA
      // ====================================================

      let names =
        typedText.split(",");


      let added = [];

      let skipped = [];


      // ====================================================
      // CHECK EVERY NAME
      // ====================================================

      for (
        let i = 0;
        i < names.length;
        i++
      ) {

        // Remove extra spaces.
        let name =
          names[i].trim();


        // Ignore empty names.
        if (!name) {

          continue;
        }


        // Check name length.
        if (name.length > 24) {

          skipped.push(name);

          continue;
        }


        // =================================================
        // CHECK IF ALREADY IN GROUP
        // =================================================

        let alreadyInGroup = false;


        for (
          let j = 0;
          j < group.members.length;
          j++
        ) {

          if (
            group.members[j].toLowerCase() ===
            name.toLowerCase()
          ) {

            alreadyInGroup = true;

            break;
          }
        }


        // =================================================
        // CHECK IF SAME NAME WAS TYPED TWICE
        // =================================================

        let alreadyTyped = false;


        for (
          let j = 0;
          j < added.length;
          j++
        ) {

          if (
            added[j].toLowerCase() ===
            name.toLowerCase()
          ) {

            alreadyTyped = true;

            break;
          }
        }


        // If duplicate, skip it.
        if (alreadyInGroup || alreadyTyped) {

          skipped.push(name);

          continue;
        }


        // Add new member.
        group.members.push(name);

        added.push(name);
      }


      // ====================================================
      // SAVE CHANGES
      // ====================================================

      persist();


      // Clear input box.
      input.value = "";


      // Put cursor back in input.
      input.focus();


      // Update member list.
      renderMembers();


      // ====================================================
      // SHOW RESULT MESSAGE
      // ====================================================

      if (added.length > 0 && skipped.length > 0) {

        toast(
          "Added " +
          added.length +
          " member" +
          (added.length > 1 ? "s" : "") +
          ". Skipped duplicate: " +
          skipped.join(", ") +
          "."
        );

      }

      else if (added.length > 0) {

        if (added.length === 1) {

          toast(
            "Added " +
            added[0] +
            "."
          );

        } else {

          toast(
            "Added " +
            added.length +
            " members."
          );
        }

      }

      else {

        showError(
          "member-error",
          "Already in this group: " +
          skipped.join(", ") +
          "."
        );
      }
    }


    // ========================================================
    // 7. ADD MEMBER BUTTON
    // ========================================================

    document
      .getElementById("btn-add-member")
      .addEventListener(
        "click",
        addMembers
      );


    // ========================================================
    // 8. PRESS ENTER TO ADD MEMBER
    // ========================================================

    document
      .getElementById("member-name")
      .addEventListener(
        "keydown",
        function (event) {


          if (event.key === "Enter") {

            event.preventDefault();

            addMembers();
          }
        }
      );



    // ========================================================
    // 9. REMOVE MEMBER
    // ========================================================

    document
      .getElementById("member-list")
      .addEventListener("click", function (event) {

        // Find the remove button that was clicked.
        let button = event.target.closest("[data-remove]");

        // If the click was not on a remove button, stop.
        if (!button) {
          return;
        }

        let name = button.dataset.remove;

        // ====================================================
        // CHECK WHETHER MEMBER IS USED IN EXPENSES
        // ====================================================

        let involvedInExpense = false;

        let expenses = Array.isArray(group.expenses)
          ? group.expenses
          : [];

        for (let i = 0; i < expenses.length; i++) {

          let expense = expenses[i];

          // Check whether this member paid the expense.
          if (expense.payer === name) {
            involvedInExpense = true;
            break;
          }

          // Check whether this member has a share.
          if (
            expense.shares &&
            Object.prototype.hasOwnProperty.call(
              expense.shares,
              name
            )
          ) {
            involvedInExpense = true;
            break;
          }
        }

        // ====================================================
        // CHECK WHETHER MEMBER IS USED IN SETTLEMENTS
        // ====================================================

        let involvedInSettlement = false;

        let settlements = Array.isArray(group.settlements)
          ? group.settlements
          : [];

        for (let i = 0; i < settlements.length; i++) {

          let settlement = settlements[i];

          // Check whether this member paid someone.
          if (settlement.from === name) {
            involvedInSettlement = true;
            break;
          }

          // Check whether this member received money.
          if (settlement.to === name) {
            involvedInSettlement = true;
            break;
          }
        }

        // ====================================================
        // PREVENT DELETION IF HISTORY EXISTS
        // ====================================================

        if (involvedInExpense || involvedInSettlement) {

          showError(
            "member-error",
            name +
            " has existing financial history and " +
            "cannot be removed. Resolve the related " +
            "expenses and payments first."
          );

          return;
        }

        // ====================================================
        // REMOVE MEMBER
        // ====================================================

        let remainingMembers = [];

        for (let i = 0; i < group.members.length; i++) {

          if (group.members[i] !== name) {
            remainingMembers.push(group.members[i]);
          }
        }

        // Replace the member list.
        group.members = remainingMembers;

        // Save changes.
        persist();

        // Refresh the member list.
        renderMembers();

        // Show confirmation.
        toast(name + " removed.");
      });

  }
}
