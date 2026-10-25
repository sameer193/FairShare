const Expense = require("../models/Expense");
const Group = require("../models/Group");

// CREATE an expense

const createExpense = async (req, res) => {
    try {
        const {
            groupId,
            description,
            amount,
            paidBy,
            splitType,
            participants
        } = req.body;

        // 1. Check required fields
        if (
            typeof groupId !== "string" || !groupId.trim() ||
            typeof description !== "string" || !description.trim() ||
            typeof paidBy !== "string" || !paidBy.trim() ||
            amount === undefined || amount === null
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required expense details."
            });
        }

        // 2. Check whether the logged-in user owns this group
        const group = await Group.findOne({
            _id: groupId.trim(),
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        // 3. Validate amount
        const numericAmount = Number(amount);

        // Verify that the payer belongs to this group
        const validPayer = group.members.some(
            member => member.toLowerCase() === paidBy.trim().toLowerCase()
        );

        if (!validPayer) {
            return res.status(400).json({
                success: false,
                message: "Payer must be a member of this group."
            });
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a number greater than zero."
            });
        }

        // 4. Validate split type
        const validSplitTypes = ["equal", "exact", "percentage"];
        const selectedSplitType = splitType || "equal";

        if (!validSplitTypes.includes(selectedSplitType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid split type."
            });
        }

        // 5. Validate participants
        if (
            participants !== undefined &&
            !Array.isArray(participants)
        ) {
            return res.status(400).json({
                success: false,
                message: "Participants must be an array."
            });
        }

        const participantList = participants || [];

        // Ensure every participant belongs to this group
        for (const participant of participantList) {
            if (
                !participant ||
                typeof participant.memberId !== "string" ||
                !participant.memberId.trim() ||
                participant.shareAmount === undefined ||
                participant.shareAmount === null ||
                participant.shareAmount === "" ||
                !Number.isFinite(Number(participant.shareAmount)) ||
                Number(participant.shareAmount) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Each participant must have a valid member ID and non-negative share amount."
                });
            }

            const validMember = group.members.some(
                member =>
                    member.toLowerCase() === participant.memberId.trim().toLowerCase()
            );

            if (!validMember) {
                return res.status(400).json({
                    success: false,
                    message: `Participant "${participant.memberId}" is not a member of this group.`
                });
            }
        }

        // 6. Create the expense
        const expense = await Expense.create({
            groupId: groupId.trim(),
            description: description.trim(),
            amount: numericAmount,
            paidBy: paidBy.trim(),
            splitType: selectedSplitType,
            participants: participantList.map(participant => ({
                memberId: participant.memberId.trim(),
                shareAmount: Number(participant.shareAmount)
            }))
        });

        // 7. Return success response
        return res.status(201).json({
            success: true,
            message: "Expense created successfully.",
            data: expense
        });

    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID."
            });
        }

        console.error("Create expense error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create expense."
        });
    }
};



// READ all expenses, optionally filtered by group

const getExpenses = async (req, res) => {
    try {
        const { groupId } = req.query;

        // Find only groups owned by the logged-in user
        const ownedGroups = await Group.find({
            createdBy: req.user.userId
        }).select("_id");

        const ownedGroupIds = ownedGroups.map(group =>
            group._id.toString()
        );

        // Start with expenses belonging to owned groups
        const filter = {
            groupId: { $in: ownedGroupIds }
        };

        // If a group ID is provided, validate ownership
        if (groupId) {
            const ownsGroup = ownedGroupIds.includes(groupId);

            if (!ownsGroup) {
                return res.status(404).json({
                    success: false,
                    message: "Group not found."
                });
            }

            filter.groupId = groupId;
        }

        const expenses = await Expense.find(filter).sort({
            createdAt: -1
        });

        return res.status(200).json({
            success: true,
            count: expenses.length,
            data: expenses
        });

    } catch (error) {
        console.error("Get expenses error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch expenses."
        });
    }
};


// READ one expense

const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        // Check whether the expense belongs to a group owned by this user
        const group = await Group.findOne({
            _id: expense.groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: expense
        });

    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid expense ID."
                : "Failed to fetch expense."
        });
    }
};


// UPDATE an expense

const updateExpense = async (req, res) => {
    try {
        // Find the expense
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        // Verify that the expense's group belongs to this user
        const group = await Group.findOne({
            _id: expense.groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        // Allow only these fields to be updated
        const allowedFields = [
            "description",
            "amount",
            "paidBy",
            "splitType",
            "participants"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        // Validate description
        if (updates.description !== undefined) {
            if (
                typeof updates.description !== "string" ||
                !updates.description.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Description cannot be empty."
                });
            }

            updates.description = updates.description.trim();
        }

        // Validate amount
        if (updates.amount !== undefined) {
            const amount = Number(updates.amount);

            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be greater than zero."
                });
            }

            updates.amount = amount;
        }

        // Validate payer
        if (updates.paidBy !== undefined) {
            if (
                typeof updates.paidBy !== "string" ||
                !updates.paidBy.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Paid by must not be empty."
                });
            }

            updates.paidBy = updates.paidBy.trim();
        }

        // Validate split type
        if (updates.splitType !== undefined) {
            const validSplitTypes = ["equal", "exact", "percentage"];

            if (!validSplitTypes.includes(updates.splitType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid split type."
                });
            }
        }

        // Validate participants
        if (updates.participants !== undefined) {
            if (!Array.isArray(updates.participants)) {
                return res.status(400).json({
                    success: false,
                    message: "Participants must be an array."
                });
            }

            for (const participant of updates.participants) {
                if (
                    !participant ||
                    typeof participant.memberId !== "string" ||
                    !participant.memberId.trim() ||
                    participant.shareAmount === undefined ||
                    participant.shareAmount === null ||
                    participant.shareAmount === "" ||
                    !Number.isFinite(Number(participant.shareAmount)) ||
                    Number(participant.shareAmount) < 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid participant details."
                    });
                }
            }

            updates.participants = updates.participants.map(participant => ({
                memberId: participant.memberId.trim(),
                shareAmount: Number(participant.shareAmount)
            }));
        }

        // Apply the update
        Object.assign(expense, updates);
        await expense.save();

        return res.status(200).json({
            success: true,
            message: "Expense updated successfully.",
            data: expense
        });

    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        console.error("Update expense error:", error.message);

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid expense ID or data."
                : "Failed to update expense."
        });
    }
};

// DELETE an expense

const deleteExpense = async (req, res) => {
    try {
        // Find the expense
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        // Check whether the expense belongs to this user's group
        const group = await Group.findOne({
            _id: expense.groupId,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        // Delete the expense after confirming ownership
        await expense.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Expense deleted successfully."
        });

    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        console.error("Delete expense error:", error.message);

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid expense ID."
                : "Failed to delete expense."
        });
    }
};


module.exports = {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
};
