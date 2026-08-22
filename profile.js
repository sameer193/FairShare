"use strict";

/*
    profile.js

    This file controls the user's profile page.

    It displays:
    1. User avatar
    2. Username
    3. Email
    4. Account creation date

    It also handles logout.
*/

// ================================================================
// 1. CHECK LOGIN
// ================================================================

const currentUser = requireLogin();

if (currentUser) {
  // ============================================================
  // 2. GET ACTIVE GROUP
  // ============================================================

  /*
      Profile page does not require a group.

      But if a group is currently selected,
      we still want the navigation bar to know about it.
  */

  let activeGroup = peekActiveGroup(currentUser);

  // ============================================================
  // 3. NAVBAR
  // ============================================================

  renderNavbar(currentUser, "profile", activeGroup);

  showFlashIfAny();

  // ============================================================
  // 4. USER AVATAR
  // ============================================================

  let avatar = document.getElementById("profile-avatar");

  // Show first letter of username.
  avatar.textContent = firstLetter(currentUser.username);

  // Set avatar background color.
  avatar.style.background = colorForName(currentUser.username);

  // ============================================================
  // 5. SHOW USERNAME
  // ============================================================

  document.getElementById("profile-name").textContent = currentUser.username;

  // ============================================================
  // 6. SHOW EMAIL
  // ============================================================

  document.getElementById("profile-email").textContent = currentUser.email;

  // ============================================================
  // 7. SHOW ACCOUNT CREATION DATE
  // ============================================================

  if (currentUser.createdAt) {
    let date = new Date(currentUser.createdAt);

    let formattedDate = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    document.getElementById("profile-since").textContent =
      "Member since " + formattedDate;
  }

  // ============================================================
  // 8. LOGOUT BUTTON
  // ============================================================

  document.getElementById("btn-logout").addEventListener("click", function () {
    logout();
  });
}
