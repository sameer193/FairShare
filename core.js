"use strict";

/*
   core.js
   Common JavaScript used by all pages after login.

   This file handles:
   1. Local Storage
   2. Session Storage
   3. Users
   4. Login session
   5. Groups
   6. Balance calculation
   7. Settlement calculation
   8. Shared navigation bar
*/


// ================================================================
// 1. STORAGE
// ================================================================

// This function checks whether browser storage is working.
function makeSafeStorage(storage) {

  try {

    storage.setItem("__test", "1");
    storage.removeItem("__test");

    return storage;

  } catch (error) {

    // If storage does not work, use temporary memory.
    let memory = {};

    return {

      getItem: function (key) {

        if (key in memory) {
          return memory[key];
        }

        return null;
      },

      setItem: function (key, value) {
        memory[key] = String(value);
      },

      removeItem: function (key) {
        delete memory[key];
      }
    };
  }
}


// Local Storage
// Data stays even after closing the browser.
const local = makeSafeStorage(window.localStorage);


// Session Storage
// Data stays only while the browser tab is open.
const session = makeSafeStorage(window.sessionStorage);


// ================================================================
// 2. STORAGE KEY NAMES
// ================================================================

const USERS_KEY = "FairShare-users";

const SESSION_KEY = "FairShare-session";

const ACTIVE_GROUP_KEY = "FairShare-active-group";

const FLASH_KEY = "FairShare-flash";


// Creates the storage key for a particular user's groups.
function dataKey(userId) {

  return "FairShare-v1-" + userId;
}


// ================================================================
// 3. JSON FUNCTIONS
// ================================================================

// Get data from Local Storage / Session Storage.
function readJSON(storageArea, key, fallback) {

  try {

    let data = storageArea.getItem(key);

    // If nothing is stored, return the default value.
    if (data === null) {
      return fallback;
    }

    return JSON.parse(data);

  } catch (error) {

    return fallback;
  }
}


// Save JavaScript data as JSON.
function writeJSON(storageArea, key, value) {

  storageArea.setItem(key, JSON.stringify(value));
}


// ================================================================
// 4. GENERAL HELPER FUNCTIONS
// ================================================================


// Round a number to 2 decimal places.
function round2(number) {

  return Math.round(number * 100) / 100;
}


// Convert number into Indian Rupee format.
function fmt(number) {

  return "₹" + round2(number).toFixed(2);
}


// Get first two initials from a person's name.
function initials(name) {

  name = name.trim();

  let words = name.split(" ");

  let result = "";

  for (let i = 0; i < words.length; i++) {

    if (words[i] !== "") {

      result = result + words[i].charAt(0);
    }
  }

  return result.substring(0, 2).toUpperCase();
}


// Get only the first letter of a name.
function firstLetter(name) {

  name = name.trim();

  return name.charAt(0).toUpperCase();
}


// ================================================================
// 5. CREATE AVATAR COLOR
// ================================================================

function colorForName(name) {

  let hash = 0;

  for (let i = 0; i < name.length; i++) {

    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }

  let hue = Math.abs(hash) % 360;

  return "hsl(" + hue + ", 55%, 38%)";
}


// ================================================================
// 6. TOAST MESSAGE
// ================================================================

function toast(message) {

  let element = document.getElementById("toast");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.add("show");

  setTimeout(function () {

    element.classList.remove("show");

  }, 2400);
}


// ================================================================
// 7. ERROR MESSAGE
// ================================================================

function showError(id, message) {

  let element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.add("show");

  setTimeout(function () {

    element.classList.remove("show");

  }, 4000);
}


// ================================================================
// 8. FLASH MESSAGE
// ================================================================

// Save a message before moving to another page.
function setFlash(message) {

  session.setItem(FLASH_KEY, message);
}


// Get the saved message and remove it.
function consumeFlash() {

  let message = session.getItem(FLASH_KEY);

  if (message) {

    session.removeItem(FLASH_KEY);
  }

  return message;
}


// Show flash message if one exists.
function showFlashIfAny() {

  let message = consumeFlash();

  if (message) {

    toast(message);
  }
}


// ================================================================
// 9. USERS
// ================================================================

// Get all registered users.
function getUsers() {

  return readJSON(local, USERS_KEY, []);
}


// ================================================================
// 10. LOGIN SESSION
// ================================================================

// Find the user who is currently logged in.
function findCurrentUser() {

  let sessionId = session.getItem(SESSION_KEY);

  // Nobody is logged in.
  if (!sessionId) {

    return null;
  }

  let users = getUsers();

  for (let i = 0; i < users.length; i++) {

    let user = users[i];

    if (user.id === sessionId) {

      return user;
    }
  }

  return null;
}


// Check whether the user is logged in.
function requireLogin() {

  let user = findCurrentUser();

  if (!user) {

    window.location.href = "login.html";

    return null;
  }

  return user;
}


// Logout the current user.
function logout() {

  session.removeItem(SESSION_KEY);

  session.removeItem(ACTIVE_GROUP_KEY);

  window.location.href = "login.html";
}


// ================================================================
// 11. GROUP DATA
// ================================================================


// Get all groups of one user.
function getUserGroups(userId) {

  let groups = readJSON(local, dataKey(userId), []);


  // Make sure every group has a settlements array.
  for (let i = 0; i < groups.length; i++) {

    if (!groups[i].settlements) {

      groups[i].settlements = [];
    }
  }

  return groups;
}


// Save all groups of a user.
function saveUserGroups(userId, groups) {

  writeJSON(local, dataKey(userId), groups);
}


// Create a new group.
function createGroup(name) {

  let group = {

    id: Date.now() + Math.floor(Math.random() * 1000),

    name: name,

    members: [],

    expenses: [],

    settlements: []
  };

  return group;
}


// ================================================================
// 12. ACTIVE GROUP
// ================================================================


// Get the ID of the group currently selected.
function getActiveGroupId() {

  let value = session.getItem(ACTIVE_GROUP_KEY);

  if (value) {

    return Number(value);
  }

  return null;
}


// Set the active group.
function setActiveGroupId(id) {

  session.setItem(ACTIVE_GROUP_KEY, String(id));
}


// Remove the active group.
function clearActiveGroupId() {

  session.removeItem(ACTIVE_GROUP_KEY);
}


// ================================================================
// 13. REQUIRE ACTIVE GROUP
// ================================================================


// Used on pages that need a selected group.
function requireActiveGroup(user) {

  let groups = getUserGroups(user.id);

  let groupId = getActiveGroupId();

  let activeGroup = null;


  for (let i = 0; i < groups.length; i++) {

    if (groups[i].id === groupId) {

      activeGroup = groups[i];

      break;
    }
  }


  // No group was selected.
  if (!activeGroup) {

    setFlash("Select a group first.");

    window.location.href = "dashboard.html";

    return null;
  }


  return {

    groups: groups,

    group: activeGroup
  };
}


// ================================================================
// 14. CHECK ACTIVE GROUP WITHOUT REDIRECTING
// ================================================================


// Used by profile page.
function peekActiveGroup(user) {

  let groups = getUserGroups(user.id);

  let groupId = getActiveGroupId();


  for (let i = 0; i < groups.length; i++) {

    if (groups[i].id === groupId) {

      return groups[i];
    }
  }

  return null;
}


// ================================================================
// 15. BALANCE CALCULATION
// ================================================================


// Positive balance:
// Person should receive money.
//
// Negative balance:
// Person needs to pay money.
function computeBalances(group) {

  let balances = {};


  // First give every member a balance of 0.
  for (let i = 0; i < group.members.length; i++) {

    let member = group.members[i];

    balances[member] = 0;
  }


  // Go through every expense.
  for (let i = 0; i < group.expenses.length; i++) {

    let expense = group.expenses[i];

    let payer = expense.payer;

    let amount = expense.amount;

    let shares = expense.shares;


    // The person who paid gets credit.
    if (balances[payer] !== undefined) {

      balances[payer] = balances[payer] + amount;
    }


    // Subtract each person's share.
    for (let member in shares) {

      if (balances[member] !== undefined) {

        balances[member] =
          balances[member] - shares[member];
      }
    }
  }


  // Now apply payments that have already been made.
  for (let i = 0; i < group.settlements.length; i++) {

    let settlement = group.settlements[i];

    let from = settlement.from;

    let to = settlement.to;

    let amount = settlement.amount;


    // Person who paid gets credit.
    if (balances[from] !== undefined) {

      balances[from] =
        balances[from] + amount;
    }


    // Person who received the payment gets lower balance.
    if (balances[to] !== undefined) {

      balances[to] =
        balances[to] - amount;
    }
  }


  // Round all balances to 2 decimal places.
  for (let member in balances) {

    balances[member] =
      round2(balances[member]);
  }


  return balances;
}


// ================================================================
// 16. RECORD A PAYMENT
// ================================================================


function recordSettlement(group, from, to, amount) {

  let settlement = {

    id: Date.now() + Math.floor(Math.random() * 1000),

    from: from,

    to: to,

    amount: round2(amount),

    date: new Date().toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short"
      }
    )
  };


  group.settlements.push(settlement);
}


// ================================================================
// 17. SETTLEMENT OPTIMIZER
// ================================================================


// This function tries to reduce the number of payments.
//
// Example:
//
// A owes B ₹500
// C owes B ₹300
//
// Instead of many payments, we create the minimum
// useful transfers.
function optimizeSettlement(balances) {

  let debtors = [];

  let creditors = [];


  // Separate people who owe money and people
  // who should receive money.
  for (let name in balances) {

    let balance = balances[name];


    // Negative = person owes money.
    if (balance < -0.004) {

      debtors.push({

        name: name,

        amount: -balance
      });
    }


    // Positive = person should receive money.
    else if (balance > 0.004) {

      creditors.push({

        name: name,

        amount: balance
      });
    }
  }


  // Sort biggest debtor first.
  debtors.sort(function (a, b) {

    return b.amount - a.amount;
  });


  // Sort biggest creditor first.
  creditors.sort(function (a, b) {

    return b.amount - a.amount;
  });


  let transfers = [];

  let debtorIndex = 0;

  let creditorIndex = 0;


  // Continue until we finish either debtors
  // or creditors.
  while (
    debtorIndex < debtors.length &&
    creditorIndex < creditors.length
  ) {


    let debtor = debtors[debtorIndex];

    let creditor = creditors[creditorIndex];


    // Find the smaller amount.
    let pay = Math.min(
      debtor.amount,
      creditor.amount
    );


    pay = round2(pay);


    // Create a payment.
    transfers.push({

      from: debtor.name,

      to: creditor.name,

      amount: pay
    });


    // Reduce debtor's remaining amount.
    debtor.amount =
      round2(debtor.amount - pay);


    // Reduce creditor's remaining amount.
    creditor.amount =
      round2(creditor.amount - pay);


    // If debtor has nothing left,
    // move to next debtor.
    if (debtor.amount <= 0.004) {

      debtorIndex++;
    }


    // If creditor has received everything,
    // move to next creditor.
    if (creditor.amount <= 0.004) {

      creditorIndex++;
    }
  }


  return transfers;
}


// ================================================================
// 18. BUILD EXPENSE SHARES
// ================================================================


// There are three ways to split a bill:
//
// 1. Equal
// 2. Exact amount
// 3. Percentage
function buildShares(mode, amount, participants, inputs) {


  // ------------------------------------------------------------
  // EQUAL SPLIT
  // ------------------------------------------------------------

  if (mode === "equal") {

    let share =
      round2(amount / participants.length);

    let shares = {};


    for (let i = 0; i < participants.length; i++) {

      let member = participants[i];


      // Give the last person the remaining amount.
      // This avoids small decimal errors.
      if (i === participants.length - 1) {

        shares[member] =
          round2(
            amount -
            share * (participants.length - 1)
          );

      } else {

        shares[member] = share;
      }
    }


    return {

      ok: true,

      shares: shares
    };
  }


  // ------------------------------------------------------------
  // EXACT AMOUNT SPLIT
  // ------------------------------------------------------------

  if (mode === "exact") {

    let shares = {};

    let sum = 0;


    for (let i = 0; i < participants.length; i++) {

      let member = participants[i];

      let value = parseFloat(inputs[member]);


      if (!value) {

        value = 0;
      }


      value = round2(value);

      shares[member] = value;

      sum = round2(sum + value);
    }


    // Exact shares must equal bill amount.
    if (Math.abs(sum - amount) > 0.01) {

      return {

        ok: false,

        msg:
          "Exact shares add up to " +
          fmt(sum) +
          ", but the bill is " +
          fmt(amount) +
          "."
      };
    }


    return {

      ok: true,

      shares: shares
    };
  }


  // ------------------------------------------------------------
  // PERCENTAGE SPLIT
  // ------------------------------------------------------------

  let percentageSum = 0;


  for (let i = 0; i < participants.length; i++) {

    let member = participants[i];

    let percentage = parseFloat(inputs[member]);


    if (!percentage) {

      percentage = 0;
    }


    percentageSum =
      percentageSum + percentage;
  }


  percentageSum = round2(percentageSum);


  // Percentages must total 100.
  if (Math.abs(percentageSum - 100) > 0.01) {

    return {

      ok: false,

      msg:
        "Percentages add up to " +
        percentageSum +
        "% — they must total 100%."
    };
  }


  let shares = {};

  let runningTotal = 0;


  for (let i = 0; i < participants.length; i++) {

    let member = participants[i];

    let percentage =
      parseFloat(inputs[member]);


    if (!percentage) {

      percentage = 0;
    }


    // Give the last person the remaining amount.
    if (i === participants.length - 1) {

      shares[member] =
        round2(amount - runningTotal);

    } else {

      shares[member] =
        round2(
          (amount * percentage) / 100
        );

      runningTotal =
        round2(
          runningTotal + shares[member]
        );
    }
  }


  return {

    ok: true,

    shares: shares
  };
}


// ================================================================
// 19. NAVIGATION BAR
// ================================================================


// List of pages in the FairShare navigation bar.
const NAV_LINKS = [

  {
    page: "dashboard",
    href: "dashboard.html",
    label: "Dashboard",
    scoped: false
  },

  {
    page: "group",
    href: "group.html",
    label: "Group hub",
    scoped: true
  },

  {
    page: "members",
    href: "members.html",
    label: "Members",
    scoped: true
  },

  {
    page: "expense",
    href: "expense.html",
    label: "Add expense",
    scoped: true
  },

  {
    page: "ledger",
    href: "ledger.html",
    label: "Ledger",
    scoped: true
  },

  {
    page: "balances",
    href: "balances.html",
    label: "Balances",
    scoped: true
  },

  {
    page: "settlement",
    href: "settlement.html",
    label: "Settlement",
    scoped: true
  }
];


// ================================================================
// 20. DISPLAY NAVIGATION BAR
// ================================================================

function renderNavbar(user, currentPage, activeGroup) {

  let box = document.getElementById("navbar");


  if (!box) {

    return;
  }


  let links = "";


  // Go through every navigation link.
  for (let i = 0; i < NAV_LINKS.length; i++) {

    let link = NAV_LINKS[i];


    // Don't show the current page.
    if (link.page === currentPage) {

      continue;
    }


    // Group pages should only appear when
    // a group is selected.
    if (link.scoped && !activeGroup) {

      continue;
    }


    links =
      links +
      '<a class="nav-link" href="' +
      link.href +
      '">' +
      link.label +
      "</a>";
  }


  // Get user's avatar letter.
  let letter = firstLetter(user.username);


  // Get avatar color.
  let color = colorForName(user.username);


  // Create the navigation bar.
  let html = "";


  html =
    '<div class="navbar-inner">' +

    '<a class="brand-mini" href="dashboard.html">' +
    'Split<span>Ledger</span>' +
    "</a>" +

    '<nav class="nav-links">' +
    links +
    "</nav>" +

    '<a class="avatar-link" ' +
    'href="profile.html" ' +
    'style="background:' + color + '" ' +
    'title="' + user.username + '\'s profile">' +
    letter +
    "</a>" +

    "</div>";


  // If a group is active, show the breadcrumb.
  if (activeGroup) {

    html =
      html +

      '<div class="breadcrumb">' +

      "Currently editing <b>" +
      activeGroup.name +
      "</b>" +

      '<a href="dashboard.html" id="btn-switch-group">' +
      "Switch group" +
      "</a>" +

      "</div>";
  }


  box.innerHTML = html;
}