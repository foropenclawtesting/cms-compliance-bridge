const payers = require('./data/payers.json');

/**
 * Payer Routing Utility
 */
exports.lookup = (payerName) => {
    if (!payerName) return null;
    
    const normalized = payerName.toLowerCase();
    const match = payers.payers.find(p => 
        normalized.includes(p.name.toLowerCase()) || 
        p.aliases.some(a => normalized.includes(a.toLowerCase()))
    );

    return match || {
        name: payerName,
        fax: process.env.PHAXIO_RECIPIENT_NUMBER || "1-800-555-0199",
        department: "General Claims Review"
    };
};
