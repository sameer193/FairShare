
const express = require("express");
const router = express.Router();

const Settlement = require("../models/Settlement");
const Group = require("../models/Group");

// Get settlements for the logged-in user's group.
router.get("/", async function (req, res) {
    try {
        const groupId = req.query.groupId;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required."
            });
        }

        const group = await Group.findOne({
            _id: groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        const settlements = await Settlement.find({
            groupId: group._id.toString()
        }).sort({ settledAt: -1 });

        res.json({
            success: true,
            count: settlements.length,
            data: settlements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not load settlements."
        });
    }
});

// Record a settlement payment.
router.post("/", async function (req, res) {
    try {
        const { groupId, from, to, amount, note } = req.body;

        if (!groupId || !from || !to || from === to ||
            !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Provide a group, two different members, and a valid amount."
            });
        }

        const group = await Group.findOne({
            _id: groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        if (!group.members.includes(from) || !group.members.includes(to)) {
            return res.status(400).json({
                success: false,
                message: "Both members must belong to this group."
            });
        }

        const settlement = await Settlement.create({
            groupId: group._id.toString(),
            from,
            to,
            amount: Number(Number(amount).toFixed(2)),
            note: note || ""
        });

        res.status(201).json({
            success: true,
            message: "Settlement recorded successfully.",
            data: settlement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not record settlement."
        });
    }
});

// Delete a settlement payment.
router.delete("/:id", async function (req, res) {
    try {
        const groupId = req.query.groupId;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required."
            });
        }

        const group = await Group.findOne({
            _id: groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        const settlement = await Settlement.findOneAndDelete({
            _id: req.params.id,
            groupId: group._id.toString()
        });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                message: "Settlement not found."
            });
        }

        res.json({
            success: true,
            message: "Settlement removed successfully."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not delete settlement."
        });
    }
});

module.exports = router;
