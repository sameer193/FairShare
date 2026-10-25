
const express = require("express");
const router = express.Router();

const {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    deleteGroup
} = require("../controllers/groupController");

// POST /api/groups - Create a group
router.post("/", createGroup);

// GET /api/groups - Get all groups
router.get("/", getGroups);

// GET /api/groups/:id - Get one group
router.get("/:id", getGroupById);

// PUT /api/groups/:id - Update a group
router.put("/:id", updateGroup);

// DELETE /api/groups/:id - Delete a group
router.delete("/:id", deleteGroup);

module.exports = router;
