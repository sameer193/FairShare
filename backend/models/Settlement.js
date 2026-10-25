
const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
    {
        groupId: {
            type: String,
            required: true,
            trim: true
        },

        from: {
            type: String,
            required: true,
            trim: true
        },

        to: {
            type: String,
            required: true,
            trim: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01
        },

        note: {
            type: String,
            trim: true,
            default: ""
        },

        settledAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Settlement", settlementSchema);
