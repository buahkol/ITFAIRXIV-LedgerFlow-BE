require('dotenv').config(); 
const express = require('express');
const transactionRoutes = require('./routes/transactionRoute');
const budgetRoutes = require('./routes/budgetRoute'); // BARU
const financeRoutes = require('./routes/financeRoute'); // BARU
const { generateAuthToken } = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); 
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget', budgetRoutes); // BARU
app.use('/api/finance', financeRoutes); // BARU

app.post('/api/auth/login/:userId', (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid User ID." });
    }
    const token = generateAuthToken(userId);
    res.json({ message: "Dummy login successful.", token: token, userId: userId });
});


app.get('/', (req, res) => {
    res.send('LedgerFlow Backend API is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});