
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        groupId: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01
        },

        paidBy: {
            type: String,
            required: true,
            trim: true
        },

        splitType: {
            type: String,
            enum: ["equal", "exact", "percentage"],
            default: "equal"
        },

        participants: [
            {
                memberId: {
                    type: String,
                    required: true
                },
                shareAmount: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expense", expenseSchema);
