
const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 24
        }
    },
    { timestamps: true }
);

// Prevent duplicate member names within the same group.
memberSchema.index(
    { groupId: 1, name: 1 },
    { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Member", memberSchema);
