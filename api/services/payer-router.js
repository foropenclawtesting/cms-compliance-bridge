const supabase = require('./supabaseClient');

/**
 * Payer Routing Utility
 * Now pulls from the Cloud Payer Directory to support Self-Healing
 */
exports.lookup = async (payerName) => {
    if (!payerName) return null;
    
    // 1. Check Cloud Directory first (The Self-Healed Source)
    const { data: dir } = await supabase
        .from('payer_directory')
        .select('*')
        .ilike('payer_name', `%${payerName}%`)
        .limit(1)
        .single();

    if (dir?.verified_fax) {
        return { name: dir.payer_name, fax: dir.verified_fax, source: 'CLOUD_DIR' };
    }

    // 2. Fallback to General Defaults
    return {
        name: payerName,
        fax: process.env.PHAXIO_RECIPIENT_NUMBER || "1-800-555-0199",
        department: "General Claims Review",
        source: 'DEFAULT_FALLBACK'
    };
};

