const path = require('path')
require('dotenv').config(path.join(__dirname, '../../.env')); //load .env file from root 
const mongoose = require('mongoose');
const fs = require('fs');
const modelPath = '../models/Cheese' //path to Cheese
const Cheese = require(modelPath); //import the model

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI) //node read the mongoURI
    .then(() => console.log('Connected to MongoDB for seeding...'))
    .catch(err => console.error('Connection error: ', err));

const seedDatabase = async () => {
    try {
        //read cheeses_clean_geo.json, utf-8 ensures read as a string, not buffer
        const jsonPath = path.join(__dirname, 'processed', 'cheeses_clean_geo.json');;
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); //onetime setup script

        //clear existing data (if not cleaned)
        await Cheese.deleteMany({});
        console.log('Old cheese data cleared.'); 

        //single bulk insert 
        await Cheese.insertMany(data); //faster than looping through each and .save()
        console.log(`${data.length} cheeses successfully added to the database!`);

    } catch (error) {
        console.error('Error seeding data: ', error);
    }
    //close connection 
    mongoose.connection.close();

};

seedDatabase();