const express = require("express");
const router = express.Router();

const {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
} = require("../controllers/expenseController");

// POST /api/expenses - Create an expense
router.post("/", createExpense);

// GET /api/expenses - Get all expenses
router.get("/", getExpenses);

// GET /api/expenses/:id - Get one expense
router.get("/:id", getExpenseById);

// PUT /api/expenses/:id - Update an expense
router.put("/:id", updateExpense);

// DELETE /api/expenses/:id - Delete an expense
router.delete("/:id", deleteExpense);

module.exports = router;
