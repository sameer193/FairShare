const express = require("express")
const router = express.Router()

const {
    createMember,
    getMembers,
    getMemberById,
    updateMember,
    deleteMember
} = require("../controllers/memberController")

// Create a member
router.post("/", createMember)

// Get all members or filter by groupId
router.get("/", getMembers)

// Get one member by ID
router.get("/:id", getMemberById)

// Update a member
router.put("/:id", updateMember)

// Delete a member
router.delete("/:id", deleteMember)

module.exports = router
