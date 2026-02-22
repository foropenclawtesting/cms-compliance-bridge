const supabase = require('./supabaseClient');

/**
 * Auth Middleware for Vercel Functions
 * Ensures the requester has a valid Supabase JWT
 */
exports.verifyUser = async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        res.status(401).json({ error: 'No authorization header provided' });
        return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return null;
    }

    return user;
};
