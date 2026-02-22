const express = require('express');
const apiPoller = require('./services/api-poller');
const appealGenerator = require('./services/appeal-generator');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'cms-compliance-bridge' });
});

const fs = require('fs');
const path = require('path');

// ... existing code ...

const LEADS_PATH = '/Users/server/openclaw/data/leads.json';

// Fetch current leads
app.get('/leads', (req, res) => {
    if (fs.existsSync(LEADS_PATH)) {
        const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
        res.json(leads);
    } else {
        res.status(404).json({ error: 'Leads file not found' });
    }
});

// Trigger CMS API Polling
app.post('/poll', async (req, res) => {
    try {
        const { payerId, claimId } = req.body;
        if (!payerId) return res.status(400).json({ error: 'payerId is required' });
        
        const result = await apiPoller.checkDenials(payerId, claimId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate Appeal
app.post('/generate-appeal', (req, res) => {
    try {
        const { payerId, claimId, reason, timestamp } = req.body;
        if (!payerId || !claimId || !reason) {
            return res.status(400).json({ error: 'payerId, claimId, and reason are required' });
        }
        
        const appeal = appealGenerator.draft({ payerId, claimId, reason, timestamp: timestamp || new Date() });
        res.json({ appeal });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`CMS Compliance Bridge running on port ${PORT}`);
});
