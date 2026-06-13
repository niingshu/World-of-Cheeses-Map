const express = require('express');
const router = express.Router();
const SavedCheese = require('../models/SavedCheese');

router.get('/', async (req, res) => {
    try {
        const saved = await SavedCheese.find().populate('cheeseId');
        const cheeses = saved
            .filter(s => s.cheeseId)
            .map(s => s.cheeseId);
        res.json(cheeses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch saved cheeses' });
    }
});

router.post('/:cheeseId', async (req, res) => {
    try {
        const existing = await SavedCheese.findOne({ cheeseId: req.params.cheeseId });
        if (existing) return res.json({ saved: true });
        await SavedCheese.create({ cheeseId: req.params.cheeseId });
        res.status(201).json({ saved: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save cheese' });
    }
});

router.delete('/:cheeseId', async (req, res) => {
    try {
        await SavedCheese.deleteOne({ cheeseId: req.params.cheeseId });
        res.json({ saved: false });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove cheese' });
    }
});

module.exports = router;
