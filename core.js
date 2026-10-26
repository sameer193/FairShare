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

  if (!sessionId) {
    return null;
  }

  let user = readJSON(session, "FairShare-user", null);

  if (user && String(user.id) === String(sessionId)) {
    return user;
  }

  return null;
}


// Check whether the user is logged in.
function requireLogin() {

  let user = findCurrentUser();

  if (!user) {

    window.location.href = "index.html";

    return null;
  }

  return user;
}


// Logout the current user.
function logout() {

  session.removeItem(SESSION_KEY);

  session.removeItem(ACTIVE_GROUP_KEY);

  window.location.href = "index.html";
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

  const value = session.getItem(ACTIVE_GROUP_KEY);

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

  // Store balances as whole paisa internally.
  // This helps avoid floating-point calculation errors.
  let balances = Object.create(null);

  // Step 1: Check group data.
  if (!group || !Array.isArray(group.members)) {
    return balances;
  }

  // Step 2: Initialize every valid member's balance.
  for (let i = 0; i < group.members.length; i++) {

    let member = group.members[i];

    if (
      typeof member === "string" &&
      member.trim() !== "" &&
      !Object.prototype.hasOwnProperty.call(balances, member)
    ) {
      balances[member] = 0;
    }
  }

  // Convert an amount into whole paisa.
  // Return null if the amount is invalid.
  function toCents(value, allowZero) {

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return null;
    }

    let number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      return null;
    }

    let cents = Math.round(round2(number) * 100);

    if (!Number.isSafeInteger(cents)) {
      return null;
    }

    if (!allowZero && cents <= 0) {
      return null;
    }

    return cents;
  }

  // Step 3: Process expenses.
  let expenses = Array.isArray(group.expenses)
    ? group.expenses
    : [];

  for (let i = 0; i < expenses.length; i++) {

    let expense = expenses[i];

    if (!expense || typeof expense !== "object") {
      continue;
    }

    let payer = expense.payer;

    // The payer must be a member of this group.
    if (!Object.prototype.hasOwnProperty.call(balances, payer)) {
      continue;
    }

    let amountCents = toCents(expense.amount, false);

    if (amountCents === null) {
      continue;
    }

    let shares = expense.shares;

    if (
      !shares ||
      typeof shares !== "object" ||
      Array.isArray(shares)
    ) {
      continue;
    }

    let shareMembers = Object.keys(shares);
    let validShares = [];
    let validExpense = shareMembers.length > 0;

    // Validate all shares before applying the expense.
    for (let j = 0; j < shareMembers.length; j++) {

      let member = shareMembers[j];

      if (!Object.prototype.hasOwnProperty.call(balances, member)) {
        validExpense = false;
        break;
      }

      let shareCents = toCents(shares[member], true);

      if (shareCents === null) {
        validExpense = false;
        break;
      }

      validShares.push({
        member: member,
        cents: shareCents
      });
    }

    // Do not partially process an invalid expense.
    if (!validExpense) {
      continue;
    }

    // The person who paid receives credit.
    balances[payer] = balances[payer] + amountCents;

    // Subtract each member's expense share.
    for (let j = 0; j < validShares.length; j++) {

      let item = validShares[j];

      balances[item.member] =
        balances[item.member] - item.cents;
    }
  }

  // Step 4: Apply recorded payments.
  let settlements = Array.isArray(group.settlements)
    ? group.settlements
    : [];

  for (let i = 0; i < settlements.length; i++) {

    let settlement = settlements[i];

    if (!settlement || typeof settlement !== "object") {
      continue;
    }

    let from = settlement.from;
    let to = settlement.to;

    // Both people must exist in this group.
    if (
      !Object.prototype.hasOwnProperty.call(balances, from) ||
      !Object.prototype.hasOwnProperty.call(balances, to) ||
      from === to
    ) {
      continue;
    }

    let amountCents = toCents(settlement.amount, false);

    if (amountCents === null) {
      continue;
    }

    // The payer's debt decreases.
    balances[from] = balances[from] + amountCents;

    // The receiver's credit decreases.
    balances[to] = balances[to] - amountCents;
  }

  // Step 5: Convert whole paisa back to rupees.
  for (let member of Object.keys(balances)) {

    balances[member] = round2(balances[member] / 100);
  }

  return balances;
}



// ================================================================
// 16. RECORD A PAYMENT
// ================================================================



function recordSettlement(group, from, to, amount) {

  // Step 1: Validate the group.
  if (!group || !Array.isArray(group.members)) {
    return {
      ok: false,
      msg: "The group data is not valid."
    };
  }

  if (!Array.isArray(group.expenses)) {
    group.expenses = [];
  }

  if (!Array.isArray(group.settlements)) {
    group.settlements = [];
  }

  // Step 2: Both members must exist in this group.
  if (
    !group.members.includes(from) ||
    !group.members.includes(to)
  ) {
    return {
      ok: false,
      msg: "Choose a payer and receiver from this group."
    };
  }

  // Step 3: A person cannot pay themselves.
  if (from === to) {
    return {
      ok: false,
      msg: "Payer and receiver must be different people."
    };
  }

  // Step 4: Validate the payment amount.
  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      msg: "Payment amount must be greater than zero."
    };
  }

  amount = round2(amount);

  let amountCents = Math.round(amount * 100);

  if (amountCents <= 0) {
    return {
      ok: false,
      msg: "Payment must be at least ₹0.01."
    };
  }

  // Step 5: Calculate current balances.
  let balances = computeBalances(group);

  let fromBalance = balances[from] || 0;
  let toBalance = balances[to] || 0;

  // Negative balance means the person owes money.
  if (fromBalance >= -0.004) {
    return {
      ok: false,
      msg: from + " does not currently owe money."
    };
  }

  // Positive balance means the person should receive money.
  if (toBalance <= 0.004) {
    return {
      ok: false,
      msg: to + " is not currently owed money."
    };
  }

  // Step 6: Do not allow payments beyond outstanding balances.
  let amountOwedByPayer =
    Math.round(Math.abs(fromBalance) * 100);

  let amountOwedToReceiver =
    Math.round(toBalance * 100);

  if (amountCents > amountOwedByPayer) {
    return {
      ok: false,
      msg:
        "Payment cannot exceed the amount " +
        from +
        " currently owes (" +
        fmt(Math.abs(fromBalance)) +
        ")."
    };
  }

  if (amountCents > amountOwedToReceiver) {
    return {
      ok: false,
      msg:
        "Payment cannot exceed the amount " +
        to +
        " is owed (" +
        fmt(toBalance) +
        ")."
    };
  }

  // Step 7: Save the payment only after validation.
  let settlement = {
    id: Date.now() + Math.floor(Math.random() * 1000),

    from: from,

    to: to,

    amount: amount,

    date: new Date().toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short"
      }
    )
  };

  group.settlements.push(settlement);

  return {
    ok: true,
    settlement: settlement
  };
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

  // Step 1: Validate the bill amount.
  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      msg: "Bill amount must be greater than zero."
    };
  }

  amount = round2(amount);
  let amountCents = Math.round(amount * 100);

  if (amountCents <= 0) {
    return {
      ok: false,
      msg: "Bill amount must be at least ₹0.01."
    };
  }

  // Step 2: Validate participants.
  if (!Array.isArray(participants) || participants.length === 0) {
    return {
      ok: false,
      msg: "Select at least one person for the split."
    };
  }

  for (let i = 0; i < participants.length; i++) {

    if (
      typeof participants[i] !== "string" ||
      !participants[i].trim()
    ) {
      return {
        ok: false,
        msg: "Every participant must have a valid name."
      };
    }

    for (let j = 0; j < i; j++) {
      if (participants[j] === participants[i]) {
        return {
          ok: false,
          msg: "A participant cannot be included more than once."
        };
      }
    }
  }

  // Step 3: Check the selected split method.
  if (
    mode !== "equal" &&
    mode !== "exact" &&
    mode !== "percentage"
  ) {
    return {
      ok: false,
      msg: "Choose a valid split method."
    };
  }

  // Step 4: Equal split.
  // Distribute every paisa so that the total remains exact.
  if (mode === "equal") {

    let baseCents = Math.floor(
      amountCents / participants.length
    );

    let remainderCents =
      amountCents -
      baseCents * participants.length;

    let shares = Object.create(null);

    for (let i = 0; i < participants.length; i++) {

      let cents = baseCents;

      if (i < remainderCents) {
        cents = cents + 1;
      }

      shares[participants[i]] = cents / 100;
    }

    return {
      ok: true,
      shares: shares
    };
  }

  // Step 5: Exact amount split.
  // Every share must be a valid, non-negative number.
  if (mode === "exact") {

    let shares = Object.create(null);
    let sumCents = 0;

    for (let i = 0; i < participants.length; i++) {

      let member = participants[i];
      let rawValue = inputs ? inputs[member] : undefined;
      let value = 0;

      if (
        rawValue !== undefined &&
        rawValue !== null &&
        String(rawValue).trim() !== ""
      ) {
        value = Number(rawValue);
      }

      if (!Number.isFinite(value) || value < 0) {
        return {
          ok: false,
          msg: "Each exact share must be a valid amount of zero or more."
        };
      }

      let cents = Math.round(round2(value) * 100);

      shares[member] = cents / 100;
      sumCents = sumCents + cents;
    }

    // Compare whole paisa to avoid floating-point errors.
    if (sumCents !== amountCents) {
      return {
        ok: false,
        msg:
          "Exact shares add up to " +
          fmt(sumCents / 100) +
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

  // Step 6: Percentage split.
  // Negative percentages are not allowed.
  let percentages = Object.create(null);
  let percentageSum = 0;

  for (let i = 0; i < participants.length; i++) {

    let member = participants[i];
    let rawValue = inputs ? inputs[member] : undefined;
    let percentage = 0;

    if (
      rawValue !== undefined &&
      rawValue !== null &&
      String(rawValue).trim() !== ""
    ) {
      percentage = Number(rawValue);
    }

    if (!Number.isFinite(percentage) || percentage < 0) {
      return {
        ok: false,
        msg: "Each percentage must be a valid value of zero or more."
      };
    }

    percentages[member] = percentage;
    percentageSum = percentageSum + percentage;
  }

  percentageSum = round2(percentageSum);

  if (percentageSum !== 100) {
    return {
      ok: false,
      msg:
        "Percentages add up to " +
        percentageSum +
        "% — they must total 100%."
    };
  }

  // Step 7: Calculate shares in whole paisa.
  // Give leftover paisa to the largest fractional shares.
  let shares = Object.create(null);
  let fractionalShares = [];
  let allocatedCents = 0;

  for (let i = 0; i < participants.length; i++) {

    let member = participants[i];

    let exactCents =
      amountCents * percentages[member] / 100;

    let wholeCents = Math.floor(exactCents);

    shares[member] = wholeCents / 100;
    allocatedCents = allocatedCents + wholeCents;

    fractionalShares.push({
      name: member,
      fraction: exactCents - wholeCents,
      order: i
    });
  }

  fractionalShares.sort(function (a, b) {

    if (b.fraction !== a.fraction) {
      return b.fraction - a.fraction;
    }

    return a.order - b.order;
  });

  let remainingCents = amountCents - allocatedCents;

  for (let i = 0; i < remainingCents; i++) {

    let member = fractionalShares[i].name;

    shares[member] = round2(shares[member] + 0.01);
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
    'Fair<span>Share</span>' +
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

const API_BASE_URL = "https://fairshare-backend-orkq.onrender.com/api";

// Send a request to the FairShare backend.
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("FairShare-token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API_BASE_URL + endpoint, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Backend request failed.");
  }

  return data;
}