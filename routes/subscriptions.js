const express = require('express'); const router = express.Router(); router.get('/', (req, res) => { res.json({ message: 'Route subscriptions - en développement' }); }); module.exports = router;
