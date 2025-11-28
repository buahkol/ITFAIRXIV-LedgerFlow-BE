require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoute');
const transactionRoutes = require('./routes/transactionRoute');
const budgetRoutes = require('./routes/budgetRoute');
const financeRoutes = require('./routes/financeRoute');

const app = express();
const PORT = 5000;

// CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/finance', financeRoutes);

// ROOT TEST
app.get('/', (req, res) => {
  res.send('LedgerFlow Backend API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

console.log("JWT_SECRET ===>", process.env.JWT_SECRET);

