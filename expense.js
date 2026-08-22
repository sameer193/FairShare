"use strict";

/*
    expense.js

    This file handles adding a new expense.

    The user can choose:
    1. Who paid
    2. Expense amount
    3. People included in the expense
    4. How the expense should be split

    Split modes:
    - Equal
    - Exact amount
    - Percentage
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
      "expense",
      group
    );


    // ========================================================
    // 4. DEFAULT SPLIT MODE
    // ========================================================

    let splitMode = "equal";


    // ========================================================
    // 5. CHECK NUMBER OF MEMBERS
    // ========================================================

    if (group.members.length < 2) {

      showError(
        "expense-error",

        "Add at least two members before you can " +
        "split a bill — head to the Members page first."
      );
    }


    // ========================================================
    // 6. CREATE PAYER DROPDOWN
    // ========================================================

    let payerOptions = "";


    for (
      let i = 0;
      i < group.members.length;
      i++
    ) {

      let member =
        group.members[i];


      payerOptions =
        payerOptions +

        '<option value="' +
        member +
        '">' +

        member +

        "</option>";
    }


    document.getElementById("exp-payer").innerHTML =
      payerOptions;


    // ========================================================
    // 7. SHOW PARTICIPANTS
    // ========================================================

    function renderParticipants() {

      let box =
        document.getElementById(
          "participant-list"
        );


      let rows = "";


      // Create checkbox for every member.
      for (
        let i = 0;
        i < group.members.length;
        i++
      ) {

        let member =
          group.members[i];


        rows =
          rows +

          '<label class="participant-chip">' +

          '<input type="checkbox" ' +
          'value="' +
          member +
          '" ' +
          "checked />" +

          member +

          "</label>";
      }


      box.innerHTML = rows;
    }


    // Display participants.
    renderParticipants();


    // ========================================================
    // 8. GET SELECTED PARTICIPANTS
    // ========================================================

    function getSelectedParticipants() {


      // Get all checkboxes.
      let boxes =
        document.querySelectorAll(
          "#participant-list input[type=checkbox]"
        );


      let selected = [];


      // Check every checkbox.
      for (
        let i = 0;
        i < boxes.length;
        i++
      ) {

        if (boxes[i].checked) {

          selected.push(
            boxes[i].value
          );
        }
      }


      return selected;
    }


    // ========================================================
    // 9. CREATE EXACT/PERCENTAGE INPUTS
    // ========================================================

    function renderSplitInputs() {

      let box =
        document.getElementById(
          "split-inputs"
        );


      let hint =
        document.getElementById(
          "split-hint"
        );


      // Clear old hint.
      hint.textContent = "";

      hint.className = "split-hint";


      // Get selected members.
      let participants =
        getSelectedParticipants();


      // Equal split does not need extra inputs.
      if (
        splitMode === "equal" ||
        participants.length === 0
      ) {

        box.innerHTML = "";

        return;
      }


      // Decide whether inputs show ₹ or %.
      let unit = "₹";


      if (splitMode === "percentage") {

        unit = "%";
      }


      let rows = "";


      // Create one input for every participant.
      for (
        let i = 0;
        i < participants.length;
        i++
      ) {

        let member =
          participants[i];


        rows =
          rows +

          '<div class="split-row">' +

          "<span>" +
          member +
          "</span>" +

          '<input type="number" ' +
          'step="0.01" ' +
          'min="0" ' +
          'placeholder="0" ' +
          'data-share="' +
          member +
          '" ' +
          'aria-label="' +
          member +
          " share in " +
          unit +
          '" />' +

          "<b>" +
          unit +
          "</b>" +

          "</div>";
      }


      box.innerHTML = rows;


      updateSplitHint();
    }


    // ========================================================
    // 10. UPDATE SPLIT HINT
    // ========================================================

    function updateSplitHint() {

      let hint =
        document.getElementById(
          "split-hint"
        );


      // Equal split doesn't need a hint.
      if (splitMode === "equal") {

        hint.textContent = "";

        return;
      }


      // Get all amount/percentage inputs.
      let inputs =
        document.querySelectorAll(
          "[data-share]"
        );


      let sum = 0;


      // Add all entered values.
      for (
        let i = 0;
        i < inputs.length;
        i++
      ) {

        let value =
          parseFloat(inputs[i].value);


        if (!value) {

          value = 0;
        }


        sum = sum + value;
      }


      sum = round2(sum);


      // ====================================================
      // PERCENTAGE MODE
      // ====================================================

      if (splitMode === "percentage") {

        hint.textContent =
          "Total: " +
          sum +
          "% of 100%";


        if (
          Math.abs(sum - 100) < 0.01
        ) {

          hint.className =
            "split-hint good";

        } else {

          hint.className =
            "split-hint bad";
        }


        return;
      }


      // ====================================================
      // EXACT AMOUNT MODE
      // ====================================================

      let amount =
        parseFloat(
          document.getElementById(
            "exp-amount"
          ).value
        );


      if (!amount) {

        amount = 0;
      }


      hint.textContent =
        "Entered: " +
        fmt(sum) +
        " of " +
        fmt(amount);


      if (
        Math.abs(sum - amount) < 0.01
      ) {

        hint.className =
          "split-hint good";

      } else {

        hint.className =
          "split-hint bad";
      }
    }


    // ========================================================
    // 11. PARTICIPANT CHECKBOX EVENT
    // ========================================================

    document
      .getElementById("participant-list")
      .addEventListener(
        "change",
        function () {

          renderSplitInputs();

        }
      );


    // ========================================================
    // 12. SPLIT MODE BUTTONS
    // ========================================================

    document
      .getElementById("split-mode")
      .addEventListener(
        "click",
        function (event) {


          /*
              Find the button that contains
              data-mode.
          */

          let button =
            event.target.closest(
              "button[data-mode]"
            );


          if (!button) {

            return;
          }


          // Get selected mode.
          splitMode =
            button.dataset.mode;


          // Get all split buttons.
          let buttons =
            document.querySelectorAll(
              "#split-mode button"
            );


          // Remove active class from all buttons.
          for (
            let i = 0;
            i < buttons.length;
            i++
          ) {

            buttons[i].classList.remove(
              "active"
            );
          }


          // Add active class to selected button.
          button.classList.add("active");


          // Update input fields.
          renderSplitInputs();
        }
      );


    // ========================================================
    // 13. INPUT EVENT FOR SPLIT VALUES
    // ========================================================

    document
      .getElementById("split-inputs")
      .addEventListener(
        "input",
        function () {

          updateSplitHint();

        }
      );


    // ========================================================
    // 14. AMOUNT INPUT EVENT
    // ========================================================

    document
      .getElementById("exp-amount")
      .addEventListener(
        "input",
        function () {

          updateSplitHint();

        }
      );


    // ========================================================
    // 15. EXPENSE FORM SUBMIT
    // ========================================================

    document
      .getElementById("expense-form")
      .addEventListener(
        "submit",
        function (event) {


          // Stop normal form submission.
          event.preventDefault();


          // =================================================
          // CHECK MEMBERS
          // =================================================

          if (group.members.length < 2) {

            showError(
              "expense-error",
              "Add at least two members first."
            );

            return;
          }


          // =================================================
          // GET FORM VALUES
          // =================================================

          let desc =
            document.getElementById(
              "exp-desc"
            ).value.trim();


          let amount =
            parseFloat(
              document.getElementById(
                "exp-amount"
              ).value
            );


          amount = round2(amount);


          let payer =
            document.getElementById(
              "exp-payer"
            ).value;


          let participants =
            getSelectedParticipants();


          // =================================================
          // VALIDATION
          // =================================================

          if (!desc) {

            showError(
              "expense-error",
              "Give the expense a description."
            );

            return;
          }


          if (!amount || amount <= 0) {

            showError(
              "expense-error",
              "Amount must be greater than zero."
            );

            return;
          }


          if (!payer) {

            showError(
              "expense-error",
              "Choose who paid."
            );

            return;
          }


          if (participants.length === 0) {

            showError(
              "expense-error",
              "Tick at least one person " +
              "under \"Split among\"."
            );

            return;
          }


          // =================================================
          // GET EXACT/PERCENTAGE VALUES
          // =================================================

          let inputs = {};


          let shareBoxes =
            document.querySelectorAll(
              "[data-share]"
            );


          for (
            let i = 0;
            i < shareBoxes.length;
            i++
          ) {

            let member =
              shareBoxes[i].dataset.share;


            inputs[member] =
              shareBoxes[i].value;
          }


          // =================================================
          // BUILD SHARES
          // =================================================

          let result =
            buildShares(
              splitMode,
              amount,
              participants,
              inputs
            );


          // If shares are invalid.
          if (!result.ok) {

            showError(
              "expense-error",
              result.msg
            );

            return;
          }


          // =================================================
          // CREATE EXPENSE OBJECT
          // =================================================

          let expense = {

            id: Date.now(),

            desc: desc,

            amount: amount,

            payer: payer,

            mode: splitMode,

            participants: participants,

            shares: result.shares,

            date:
              new Date().toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short"
                }
              )
          };


          // Add expense to group.
          group.expenses.push(expense);


          // Save updated groups.
          saveUserGroups(
            currentUser.id,
            groups
          );


          // Show message.
          setFlash(
            "Expense added."
          );


          // Open ledger.
          window.location.href =
            "ledger.html";
        }
      );
  }
}