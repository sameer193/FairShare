const express = require("express")
const cors = require("cors")
require("dotenv").config()

const connectDB = require("./config/db")
const expenseRoutes = require("./routes/expenseRoutes")
const groupRoutes = require("./routes/groupRoutes")
const memberRoutes = require("./routes/memberRoutes")
const authRoutes = require("./routes/authRoutes")
const protect = require("./middleware/authMiddleware")
const settlementRoutes = require("./routes/settlementRoutes")

const app = express()

app.use(cors())
app.use(express.json())

// API routes
app.use("/api/expenses", protect, expenseRoutes)
app.use("/api/groups", protect, groupRoutes)
app.use("/api/members", protect, memberRoutes)
app.use("/api/settlements", protect, settlementRoutes)
app.use("/api/auth", authRoutes)

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "FairShare backend is running!"
    })
})

// Protected authentication test
app.get("/api/protected-test", protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Authentication successful!",
        userId: req.user.userId
    })
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`FairShare server running on port ${PORT}`)
    });
};

startServer()
