
"use strict";

// ============================================================
// 1. CHECK LOGIN
// ============================================================

const currentUser = requireLogin();

if (currentUser) {

  renderNavbar(currentUser, "members", null);
  showFlashIfAny();

  const groupId = sessionStorage.getItem("FairShare-active-group");

  if (!groupId) {
    window.location.href = "dashboard.html";
  } else {

    let group = null;

    // ========================================================
    // 2. LOAD GROUP FROM BACKEND
    // ========================================================

    async function loadGroup() {

      try {

        const result = await apiRequest("/groups/" + groupId);

        if (!result.success || !result.data) {
          throw new Error("Group details could not be loaded.");
        }

        group = result.data;

        renderMembers();

      } catch (error) {

        console.error("Loading group failed:", error);

        showError("member-error", error.message);
      }
    }

    // ========================================================
    // 3. DISPLAY MEMBERS
    // ========================================================

    function renderMembers() {

      const box = document.getElementById("member-list");
      const members = group.members || [];

      if (members.length === 0) {

        box.innerHTML =
          '<div class="empty-state">' +
          "<b>No members yet</b>" +
          "Add the people sharing these bills above." +
          "</div>";

        return;
      }

      let chips = "";

      for (let i = 0; i < members.length; i++) {

        const member = members[i];

        chips +=
          '<span class="chip">' +
          '<span class="avatar">' +
          escapeHTML(initials(member)) +
          "</span>" +
          escapeHTML(member) +
          '<button type="button" data-remove="' +
          encodeURIComponent(member) +
          '" aria-label="Remove member">' +
          "×" +
          "</button>" +
          "</span>";
      }

      box.innerHTML = chips;
    }

    // Escape text before placing it into HTML.
    function escapeHTML(value) {

      return String(value).replace(/[&<>"']/g, function (character) {

        const replacements = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };

        return replacements[character];
      });
    }

    // ========================================================
    // 4. ADD MEMBERS
    // ========================================================

    async function addMembers() {

      const input = document.getElementById("member-name");
      const typedText = input.value.trim();

      if (!typedText) {

        showError("member-error", "Member name can't be empty.");

        return;
      }

      const names = typedText.split(",");
      const added = [];
      const skipped = [];

      for (let i = 0; i < names.length; i++) {

        const name = names[i].trim();

        if (!name) {
          continue;
        }

        if (name.length > 24) {
          skipped.push(name + " (name exceeds 24 characters)");
          continue;
        }

        // Check existing members, including earlier additions.
        const duplicate = (group.members || []).some(function (member) {
          return member.toLowerCase() === name.toLowerCase();
        });

        if (duplicate) {
          skipped.push(name);
          continue;
        }

        try {

          await apiRequest("/members", {
            method: "POST",
            body: JSON.stringify({
              groupId: groupId,
              name: name
            })
          });

          added.push(name);

          // Update local copy so duplicates in the same input
          // are not sent again.
          group.members.push(name);

        } catch (error) {

          skipped.push(name + " (" + error.message + ")");
        }
      }

      input.value = "";
      input.focus();

      // Reload the actual saved group from the backend.
      await loadGroup();

      if (added.length > 0 && skipped.length > 0) {

        toast(
          "Added " + added.length +
          " member(s). Skipped: " + skipped.join(", ")
        );

      } else if (added.length > 0) {

        toast(
          "Added " + added.length +
          (added.length === 1 ? " member." : " members.")
        );

      } else {

        showError(
          "member-error",
          "No members added. " + skipped.join(", ")
        );
      }
    }

    document
      .getElementById("btn-add-member")
      .addEventListener("click", addMembers);

    document
      .getElementById("member-name")
      .addEventListener("keydown", function (event) {

        if (event.key === "Enter") {
          event.preventDefault();
          addMembers();
        }
      });

    // ========================================================
    // 5. REMOVE MEMBER
    // ========================================================

    document
      .getElementById("member-list")
      .addEventListener("click", async function (event) {

        const button = event.target.closest("[data-remove]");

        if (!button) {
          return;
        }

        const name = decodeURIComponent(button.dataset.remove);

        const answer = confirm(
          'Remove "' + name + '" from this group?'
        );

        if (!answer) {
          return;
        }

        button.disabled = true;

        try {

          await apiRequest(
            "/members/" + encodeURIComponent(name),
            {
              method: "DELETE",
              body: JSON.stringify({
                groupId: groupId,
                name: name
              })
            }
          );

          await loadGroup();

          toast(name + " removed.");

        } catch (error) {

          showError("member-error", error.message);

          button.disabled = false;
        }
      });

    // Load the group when the page opens.
    loadGroup();
  }
}
