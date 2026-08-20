"use strict";
/* ==============================================================
   core.js — shared logic for every page AFTER login.
   login.html does NOT use this file (it runs before a session
   exists); every other page includes this file first, then its
   own small page-specific script.

   Storage design (this is the actual fix for the "data won't go
   away" bug):
     LOCAL STORAGE  — durable, survives closing the browser:
         FairShare-users   (array of every registered account)
         FairShare-v1-<id> (one array of groups per user)
     SESSION STORAGE — only lasts while this tab is open:
         FairShare-session      (which user id is logged in)
         FairShare-active-group (which group you're currently in)
         FairShare-flash        (a one-time message for the next page)

   Nothing in this file ever invents or seeds sample data. If
   storage is empty, the app shows empty states — nothing more.

   Privacy: this build does NOT track or display any site-wide
   numbers (total accounts, total logins) anywhere in the app —
   what a logged-in person sees is only ever their own data.
   ============================================================== */

/* ---------- Safe storage wrappers (fall back to memory if blocked) ---------- */
function makeSafeStorage(realStorage) {
  try {
    realStorage.setItem("__t", "1");
    realStorage.removeItem("__t");
    return realStorage;
  } catch (err) {
    const mem = {};
    return {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    };
  }
}
const local = makeSafeStorage(window.localStorage);
const session = makeSafeStorage(window.sessionStorage);

/* LocalStorage keys (durable) */
const USERS_KEY = "FairShare-users";
const dataKey = (userId) => `FairShare-v1-${userId}`;

/* SessionStorage keys (this tab only) */
const SESSION_KEY = "FairShare-session";
const ACTIVE_GROUP_KEY = "FairShare-active-group";
const FLASH_KEY = "FairShare-flash";

/* ---------------------------- JSON helpers ----------------------------- */
function readJSON(storageArea, key, fallback) {
  try {
    const parsed = JSON.parse(storageArea.getItem(key));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    return fallback;
  }
}
function writeJSON(storageArea, key, value) {
  storageArea.setItem(key, JSON.stringify(value));
}

/* ---------------------------- General utilities ----------------------------- */
function round2(n) { return Math.round(n * 100) / 100; }
function fmt(n) { return `₹${round2(n).toFixed(2)}`; }
function initials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* Just the first letter — used for the small header avatar, per request. */
function firstLetter(name) {
  return name.trim().charAt(0).toUpperCase();
}

/* Turns a name into a consistent color, so the same person always gets
   the same avatar color across pages/sessions. Walks every character of
   the name with a `for` loop to build a simple running hash. */
function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2400);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 4000);
}

/* ======================================================================
   FLASH MESSAGES — a one-time note carried across a page redirect using
   SessionStorage. Written on one page, read (and immediately erased) on
   the next page load, so it never lingers or reappears on refresh.
   ====================================================================== */
function setFlash(msg) {
  session.setItem(FLASH_KEY, msg);
}
function consumeFlash() {
  const msg = session.getItem(FLASH_KEY);
  if (msg) session.removeItem(FLASH_KEY);
  return msg;
}
function showFlashIfAny() {
  const msg = consumeFlash();
  if (msg) toast(msg);
}

/* ======================================================================
   USERS (LocalStorage). getUsers() is only ever used internally, to
   check for a duplicate email on registration and to look up whoever
   the current session belongs to — its length/contents are never
   rendered anywhere in the UI.
   ====================================================================== */
function getUsers() { return readJSON(local, USERS_KEY, []); }

/* ======================================================================
   SESSION — who is logged in, for this browser tab only
   ====================================================================== */
function findCurrentUser() {
  const sessionId = session.getItem(SESSION_KEY);
  if (!sessionId) return null;

  const users = getUsers();
  for (const user of users) {          // for...of loop over the users array
    if (user.id === sessionId) return user;
  }
  return null;
}

/* Call this at the top of every protected page. Redirects to login.html
   and stops the caller (via the returned null) if nobody is logged in. */
function requireLogin() {
  const user = findCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function logout() {
  session.removeItem(SESSION_KEY);
  session.removeItem(ACTIVE_GROUP_KEY);
  window.location.href = "login.html";
}

/* ======================================================================
   PER-USER GROUP DATA (LocalStorage, private to that account)
   ====================================================================== */
function getUserGroups(userId) {
  const groups = readJSON(local, dataKey(userId), []);
  // migrate any group saved before "settlements" existed
  for (const g of groups) {
    if (!Array.isArray(g.settlements)) g.settlements = [];
  }
  return groups;
}
function saveUserGroups(userId, groups) {
  writeJSON(local, dataKey(userId), groups);
}

/* Plain factory function — no ES6 classes yet in the syllabus. */
function createGroup(name, members = [], expenses = [], settlements = []) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    members,
    expenses,
    settlements,
  };
}

/* ======================================================================
   ACTIVE GROUP — which group this tab is currently working in
   (SessionStorage: a per-tab "where am I right now" pointer, not
   durable data, so it belongs in SessionStorage rather than LocalStorage).
   ====================================================================== */
function getActiveGroupId() {
  const raw = session.getItem(ACTIVE_GROUP_KEY);
  return raw ? Number(raw) : null;
}
function setActiveGroupId(id) {
  session.setItem(ACTIVE_GROUP_KEY, String(id));
}
function clearActiveGroupId() {
  session.removeItem(ACTIVE_GROUP_KEY);
}

/* Call this at the top of every group-scoped page (Members, Add Expense,
   Ledger, Balances, Settlement). Redirects to dashboard.html if there's
   no active group selected, or if it no longer exists. */
function requireActiveGroup(user) {
  const groups = getUserGroups(user.id);
  const groupId = getActiveGroupId();

  let activeGroup = null;
  for (const g of groups) {           // for...of loop
    if (g.id === groupId) { activeGroup = g; break; }
  }

  if (!activeGroup) {
    setFlash("Select a group first.");
    window.location.href = "dashboard.html";
    return null;
  }
  return { groups, group: activeGroup };
}

/* A softer version of requireActiveGroup — used on pages (like the
   profile page) that don't NEED a group to work, but still want to show
   the group-scoped nav links if one happens to be active. Never
   redirects; just returns the group or null. */
function peekActiveGroup(user) {
  const groups = getUserGroups(user.id);
  const groupId = getActiveGroupId();
  for (const g of groups) {
    if (g.id === groupId) return g;
  }
  return null;
}

/* ======================================================================
   BALANCE CALCULATION
   balance > 0 → the group owes this member (creditor)
   balance < 0 → this member owes the group (debtor)
   ====================================================================== */
function computeBalances(group) {
  const balances = {};
  for (const m of group.members) {
    balances[m] = 0;
  }

  for (const expense of group.expenses) {
    const { payer, amount, shares } = expense;
    if (payer in balances) balances[payer] += amount;
    for (const member in shares) {          // for...in over the shares object
      if (member in balances) balances[member] -= shares[member];
    }
  }

  for (const settlement of group.settlements || []) {
    const { from, to, amount } = settlement;
    if (from in balances) balances[from] += amount;
    if (to in balances) balances[to] -= amount;
  }

  for (const m in balances) {
    balances[m] = round2(balances[m]);
  }
  return balances;
}

function recordSettlement(group, from, to, amount) {
  group.settlements.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    from, to, amount: round2(amount),
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  });
}

/* ======================================================================
   MINIMUM-TRANSACTION SETTLEMENT (greedy max-creditor / max-debtor match)
   ====================================================================== */
function optimizeSettlement(balances) {
  const debtors = [];
  const creditors = [];

  for (const name in balances) {      // for...in over a plain object
    const bal = balances[name];
    if (bal < -0.004) debtors.push({ name, amt: -bal });
    else if (bal > 0.004) creditors.push({ name, amt: bal });
  }

  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = round2(Math.min(debtors[i].amt, creditors[j].amt));
    transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    debtors[i].amt = round2(debtors[i].amt - pay);
    creditors[j].amt = round2(creditors[j].amt - pay);
    if (debtors[i].amt <= 0.004) i++;
    if (creditors[j].amt <= 0.004) j++;
  }
  return transfers;
}

/* ======================================================================
   SHARE BUILDERS for the three split modes. `participants` is whichever
   members are ticked in "Split among" — not necessarily everyone.
   ====================================================================== */
function buildShares(mode, amount, participants, inputs) {
  if (mode === "equal") {
    const share = round2(amount / participants.length);
    const shares = {};
    for (let i = 0; i < participants.length; i++) {
      const m = participants[i];
      shares[m] = i === participants.length - 1
        ? round2(amount - share * (participants.length - 1))
        : share;
    }
    return { ok: true, shares };
  }

  if (mode === "exact") {
    const shares = {};
    let sum = 0;
    for (const m of participants) {
      const v = round2(parseFloat(inputs[m]) || 0);
      shares[m] = v;
      sum = round2(sum + v);
    }
    if (Math.abs(sum - amount) > 0.01)
      return { ok: false, msg: `Exact shares add up to ${fmt(sum)}, but the bill is ${fmt(amount)}.` };
    return { ok: true, shares };
  }

  /* percentage */
  let pctSum = 0;
  for (const m of participants) {
    pctSum += parseFloat(inputs[m]) || 0;
  }
  if (Math.abs(pctSum - 100) > 0.01)
    return { ok: false, msg: `Percentages add up to ${round2(pctSum)}% — they must total 100%.` };

  const shares = {};
  let running = 0;
  for (let i = 0; i < participants.length; i++) {
    const m = participants[i];
    if (i === participants.length - 1) {
      shares[m] = round2(amount - running);
    } else {
      shares[m] = round2((amount * (parseFloat(inputs[m]) || 0)) / 100);
      running = round2(running + shares[m]);
    }
  }
  return { ok: true, shares };
}

/* ======================================================================
   SHARED NAVBAR — every page has an empty <div id="navbar"></div> near
   the top of <body>; this fills it in so the header/nav markup only
   has to be written once, here, instead of copy-pasted into 7 files.
   ====================================================================== */
const NAV_LINKS = [
  { page: "dashboard", href: "dashboard.html", label: "Dashboard", scoped: false },
  { page: "group", href: "group.html", label: "Group hub", scoped: true },
  { page: "members", href: "members.html", label: "Members", scoped: true },
  { page: "expense", href: "expense.html", label: "Add expense", scoped: true },
  { page: "ledger", href: "ledger.html", label: "Ledger", scoped: true },
  { page: "balances", href: "balances.html", label: "Balances", scoped: true },
  { page: "settlement", href: "settlement.html", label: "Settlement", scoped: true },
];

function renderNavbar(user, currentPage, activeGroup) {
  const box = document.getElementById("navbar");
  if (!box) return;

  const links = [];
  for (const link of NAV_LINKS) {
    if (link.page === currentPage) continue;    // never show a link to the page you're already on
    if (link.scoped && !activeGroup) continue;  // hide group-only links until a group is chosen
    links.push(`<a class="nav-link" href="${link.href}">${link.label}</a>`);
  }

  // Header only shows a small colored circle with the first letter of the
  // name — clicking it opens the profile page, where the full name, email,
  // and log-out actually live. Keeps the header itself uncluttered.
  const letter = firstLetter(user.username);
  const color = colorForName(user.username);

  box.innerHTML = `
    <div class="navbar-inner">
      <a class="brand-mini" href="dashboard.html">Split<span>Ledger</span></a>
      <nav class="nav-links">${links.join("")}</nav>
      <a class="avatar-link" href="profile.html" style="background:${color}" title="${user.username}'s profile">${letter}</a>
    </div>
    ${activeGroup ? `
      <div class="breadcrumb">
        Currently editing <b>${activeGroup.name}</b>
        <a href="dashboard.html" id="btn-switch-group">Switch group</a>
      </div>` : ""}
  `;
}
