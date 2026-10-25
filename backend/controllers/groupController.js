
const Group = require("../models/Group");

// CREATE a group

const createGroup = async (req, res) => {
    try {
        const { name, description, members } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group name is required."
            });
        }

        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in to create a group."
            });
        }

        if (
            members !== undefined &&
            !Array.isArray(members)
        ) {
            return res.status(400).json({
                success: false,
                message: "Members must be an array."
            });
        }

        const group = await Group.create({
            name: name.trim(),
            description:
                typeof description === "string" ? description.trim() : "",
            createdBy: req.user.userId,
            members: members || []
        });

        return res.status(201).json({
            success: true,
            message: "Group created successfully.",
            data: group
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create group."
        });
    }
};


// READ all groups

const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({
            createdBy: req.user.userId
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve groups."
        });
    }
};


// READ one group

const getGroupById = async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.id,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: group
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to retrieve group."
        });
    }
};


// UPDATE a group

const updateGroup = async (req, res) => {
    try {
        const allowedFields = ["name", "description", "members"];
        const updates = {};

        // Accept only fields that are allowed to change
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        if (
            updates.name !== undefined &&
            (typeof updates.name !== "string" || !updates.name.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Group name must be a non-empty string."
            });
        }

        if (updates.name !== undefined) {
            updates.name = updates.name.trim();
        }

        if (
            updates.description !== undefined &&
            typeof updates.description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Description must be a string."
            });
        }

        if (
            updates.members !== undefined &&
            (!Array.isArray(updates.members) ||
                !updates.members.every(
                    member => typeof member === "string" && member.trim()
                ))
        ) {
            return res.status(400).json({
                success: false,
                message: "Members must be an array of non-empty names."
            });
        }

        if (updates.members !== undefined) {
            updates.members = updates.members.map(member => member.trim());
        }

        const group = await Group.findOneAndUpdate(
            {
                _id: req.params.id,
                createdBy: req.user.userId
            },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Group updated successfully.",
            data: group
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to update group."
        });
    }
};


// DELETE a group

const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Group deleted successfully."
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to delete group."
        });
    }
};


module.exports = {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    deleteGroup
};
