// utils/hashing.js
const crypto = require('crypto');

function generateBlockchainHash(accountId, amount, date, description) {
    const dataToHash = {
        accountId: accountId,
        amount: amount.toFixed(2),
        date: date.toISOString().slice(0, 19).replace('T', ' '),
        description: description.trim()
    };
    const hashString = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
    
    const shaSignature = crypto.createHash('sha256')
                                 .update(hashString)
                                 .digest('hex');
    return shaSignature;
}

module.exports = { generateBlockchainHash };