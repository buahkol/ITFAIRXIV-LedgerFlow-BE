// app.js

const express = require('express');
const transactionRoutes = require('./routes/transactionRoute');

const app = express();
const PORT = 3000;

app.use(express.json()); 
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
    res.send('LedgerFlow Backend API is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});