
const Group = require("../models/Group");

// CREATE a member
const createMember = async (req, res) => {
    try {
        const { groupId, name } = req.body;

        if (
            !groupId ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Group ID and member name are required."
            });
        }

        const cleanName = name.trim();

        if (cleanName.length > 24) {
            return res.status(400).json({
                success: false,
                message: "Member name cannot exceed 24 characters."
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

        const alreadyExists = group.members.some(
            member => member.toLowerCase() === cleanName.toLowerCase()
        );

        if (alreadyExists) {
            return res.status(409).json({
                success: false,
                message: "This member already exists in the group."
            });
        }

        group.members.push(cleanName);
        await group.save();

        return res.status(201).json({
            success: true,
            message: "Member added successfully.",
            data: {
                groupId: group._id,
                name: cleanName
            }
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to create member."
        });
    }
};

// READ members
const getMembers = async (req, res) => {
    try {
        const { groupId } = req.query;
        const filter = {
            createdBy: req.user.userId
        };

        if (groupId) {
            filter._id = groupId;
        }

        const groups = await Group.find(filter)
            .select("_id name members");

        if (groupId && groups.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Group not found."
            });
        }

        const members = groups.flatMap(group =>
            group.members.map(name => ({
                groupId: group._id,
                groupName: group.name,
                name
            }))
        );

        return res.status(200).json({
            success: true,
            count: members.length,
            data: members
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to fetch members."
        });
    }
};

// READ one member by group ID and member name
const getMemberById = async (req, res) => {
    try {
        const { groupId, name } = req.query;

        if (!groupId || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group ID and member name are required."
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

        const member = group.members.find(
            item => item.toLowerCase() === name.trim().toLowerCase()
        );

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                groupId: group._id,
                groupName: group.name,
                name: member
            }
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to fetch member."
        });
    }
};

// UPDATE a member's name
const updateMember = async (req, res) => {
    try {
        const { groupId, oldName, name } = req.body;

        if (
            !groupId ||
            typeof oldName !== "string" ||
            !oldName.trim() ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Group ID, old name, and new name are required."
            });
        }

        const cleanOldName = oldName.trim();
        const cleanName = name.trim();

        if (cleanName.length > 24) {
            return res.status(400).json({
                success: false,
                message: "Member name cannot exceed 24 characters."
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

        const memberIndex = group.members.findIndex(
            member => member.toLowerCase() === cleanOldName.toLowerCase()
        );

        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Member not found."
            });
        }

        const duplicate = group.members.some(
            (member, index) =>
                index !== memberIndex &&
                member.toLowerCase() === cleanName.toLowerCase()
        );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "This member already exists in the group."
            });
        }

        group.members[memberIndex] = cleanName;
        await group.save();

        return res.status(200).json({
            success: true,
            message: "Member updated successfully.",
            data: {
                groupId: group._id,
                name: cleanName
            }
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to update member."
        });
    }
};

// DELETE a member
const deleteMember = async (req, res) => {
    try {
        const { groupId, name } = req.body;

        if (
            !groupId ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Group ID and member name are required."
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

        const memberIndex = group.members.findIndex(
            member => member.toLowerCase() === name.trim().toLowerCase()
        );

        if (memberIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Member not found."
            });
        }

        group.members.splice(memberIndex, 1);
        await group.save();

        return res.status(200).json({
            success: true,
            message: "Member deleted successfully."
        });
    } catch (error) {
        const status = error.name === "CastError" ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: status === 400
                ? "Invalid group ID."
                : "Failed to delete member."
        });
    }
};

module.exports = {
    createMember,
    getMembers,
    getMemberById,
    updateMember,
    deleteMember
};
