"use strict";
/* ==============================================================
   profile.js — where the name/email/logout that used to sit in
   the header now live, reached only by clicking the avatar.
   ============================================================== */

const currentUser = requireLogin();

if (currentUser) {
  const activeGroup = peekActiveGroup(currentUser); // doesn't redirect if there isn't one
  renderNavbar(currentUser, "profile", activeGroup);
  showFlashIfAny();

  const avatarEl = document.getElementById("profile-avatar");
  avatarEl.textContent = firstLetter(currentUser.username);
  avatarEl.style.background = colorForName(currentUser.username);

  document.getElementById("profile-name").textContent = currentUser.username;
  document.getElementById("profile-email").textContent = currentUser.email;

  if (currentUser.createdAt) {
    const since = new Date(currentUser.createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    document.getElementById("profile-since").textContent = `Member since ${since}`;
  }

  document.getElementById("btn-logout").addEventListener("click", logout);
}
