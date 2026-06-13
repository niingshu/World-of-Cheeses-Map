//entry point of application, backend talk to mongoose, frontend fetch 
require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routerPath = './routes/cheeses.js';
const cheeseRouter = require(routerPath)
const savedRouter = require('./routes/saved.js')

const app = express();
const PORT = process.env.PORT || 3000; //3000 is fallback

//connect to mongodb
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error: ', err));

//middleware
app.use(cors()); //allows frontend to talk to this 
app.use(express.json()); //allows server to accept json in request

//routes, prefix all routes in cheeseRouter with '/api/cheeses'
app.use('/api/cheeses', cheeseRouter)
app.use('/api/saved', savedRouter)

app.get('/', (req,res) => {
    res.send('Cheese API is running')
});

//start server 
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})