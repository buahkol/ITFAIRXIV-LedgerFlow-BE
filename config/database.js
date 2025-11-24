const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',    // <<< GANTI INI
    password: '12Idaluisonyeo', // <<< GANTI INI
    database: 'ledgerflowdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;