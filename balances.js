"use strict";

/*
    balances.js

    This file displays the balance of every member
    in the active group.

    Positive balance:
    The person should receive money.

    Negative balance:
    The person needs to pay money.

    Zero balance:
    The person does not owe or receive anything.
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


    // Get the active group.
    let group = ctx.group;


    // ========================================================
    // 3. NAVBAR
    // ========================================================

    renderNavbar(
      currentUser,
      "balances",
      group
    );

    showFlashIfAny();


    // ========================================================
    // 4. CALCULATE BALANCES
    // ========================================================

    let balances =
      computeBalances(group);


    // Get the HTML element where
    // balances will be displayed.
    let box =
      document.getElementById(
        "balance-list"
      );


    // ========================================================
    // 5. CHECK MEMBERS
    // ========================================================

    if (group.members.length === 0) {

      box.innerHTML =
        '<div class="empty-state">' +

        "<b>No members</b>" +

        "Add members to see balances." +

        "</div>";

    }

    else {


      // ====================================================
      // 6. FIND BIGGEST BALANCE
      // ====================================================

      /*
          maxAbs stores the biggest absolute
          balance.

          We start with 0.01 so that we don't
          divide by zero later.
      */

      let maxAbs = 0.01;


      for (let name in balances) {

        let balance =
          balances[name];


        // Math.abs() gives the positive
        // value of a number.

        let absoluteBalance =
          Math.abs(balance);


        if (absoluteBalance > maxAbs) {

          maxAbs =
            absoluteBalance;
        }
      }


      // ====================================================
      // 7. CREATE BALANCE ROWS
      // ====================================================

      let rows = "";


      for (let name in balances) {

        let balance =
          balances[name];


        // =================================================
        // CALCULATE BAR WIDTH
        // =================================================

        let width =
          (Math.abs(balance) / maxAbs) * 50;


        // =================================================
        // FIND BALANCE TYPE
        // =================================================

        let className = "zero";


        if (balance > 0.004) {

          className = "pos";

        }

        else if (balance < -0.004) {

          className = "neg";
        }


        // =================================================
        // CREATE BALANCE BAR
        // =================================================

        let bar = "";


        if (className !== "zero") {


          // Start with normal position.
          let style =
            "width:" +
            width +
            "%;";


          // Negative balances should
          // start from the middle.
          if (className === "neg") {

            style =
              style +
              "left:" +
              (50 - width) +
              "%;";
          }


          bar =
            '<div class="bal-bar ' +
            className +
            '" style="' +
            style +
            '"></div>';
        }


        // =================================================
        // DISPLAY BALANCE AMOUNT
        // =================================================

        let amountText =
          fmt(balance);


        // Add + sign for positive balance.
        if (balance > 0) {

          amountText =
            "+" +
            amountText;
        }


        // Replace ₹- with −₹ for negative values.
        amountText =
          amountText.replace(
            "₹-",
            "−₹"
          );


        // =================================================
        // CREATE ROW
        // =================================================

        rows =
          rows +

          '<div class="bal-row">' +

          '<span class="name">' +
          name +
          "</span>" +

          '<div class="bal-track">' +
          bar +
          "</div>" +

          '<span class="bal-amt ' +
          className +
          '">' +

          amountText +

          "</span>" +

          "</div>";
      }


      // ====================================================
      // 8. DISPLAY ALL BALANCES
      // ====================================================

      box.innerHTML = rows;
    }
  }
}