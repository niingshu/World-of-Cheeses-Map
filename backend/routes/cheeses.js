const express = require('express')
const router = express.Router()
const modelPath = '../models/Cheese' //path to Cheese
const Cheese = require(modelPath); //import the model

// GET/api/cheeses - List all with optional filters
router.get('/', async (req, res) => {
    try {
        const { country, region, name } = req.query;
        let query = {};

        if (country) {
            query.country = { $regex: country, $options: 'i' };
        }

        if (region) {
            //'i' makes case-insensitive
            query.region = { $regex: region, $options: 'i'};
        }

        if (name) {
            query.cheese = { $regex: name, $options: 'i'};
        }

        const cheeses = await Cheese.find(query)
        res.json(cheeses)
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cheese" });
    }
});

// GET/api/countries - distinct list of countries (filer dropdown)
router.get('/countries', async (req, res) => {
    try { 
        //distinct country returns an array of unique strings
        const countries = await Cheese.distinct('country');
        res.json(countries.sort()); //alphabetical ordered
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch countries" });
    }
});

// GET/api/:id - single cheese detail
router.get('/:id', async (req, res) => {
    try { 
        //send data of the cheese back to client 
        const cheese = await Cheese.findById(req.params.id);
        if (!cheese) {
            return res.status(404).json({ message: "Cheese not found" });
        }
        
        res.json(cheese)
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cheese detail" });
    }
});

module.exports = router;