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

// Trigger CMS API Polling
app.post('/poll', async (req, res) => {
    const result = await apiPoller.checkDenials(req.body.payerId);
    res.json(result);
});

// Generate Appeal
app.post('/generate-appeal', (req, res) => {
    const appeal = appealGenerator.draft(req.body.denialDetails);
    res.json({ appeal });
});

app.listen(PORT, () => {
    console.log(`CMS Compliance Bridge running on port ${PORT}`);
});
