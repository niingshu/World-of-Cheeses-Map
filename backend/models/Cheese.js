//either all commonjs
const mongoose = require('mongoose');
const { Schema } = mongoose;

//define the schema
const cheeseSchema = new Schema({
    //primary key dropped since mongodb creates _id automatically
    lat: Number,
    lon: Number,
    cheese: { type: String, required: true },
    img: String, //can be null (no pic scraped)
    url: { 
        type: String, 
        required: true,
        trim: true, //removes accidental whitespace
    },
    milk: String,
    country: String,
    region: String,
    type: String,
    texture: String,
    color: String,
    flavor: String,
}, {
    timestamps: true //add createdAt updatedAt automatically
});

module.exports = mongoose.model('Cheese', cheeseSchema);
