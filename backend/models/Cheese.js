//either all commonjs
const mongoose = require('mongoose');
const { Schema } = mongoose;

//define the schema
const cheeseSchema = new Schema({
    //primary key dropped since mongodb creates _id automatically
    lat: Number,
    lon: Number,
    cheese: { type: String, required: true },
    url: { 
        type: String, 
        required: true,
        trim: true, //removes accidental whitespace
    },
    milk: { type: String, required: true },
    country: String,
    region: String,
    type: { type: String, required: true },
    texture: { type: String, required: true },
    color: { type: String, required: true },
    flavor: { type: String, required: true },
}, {
    timestamps: true //add createdAt updatedAt automatically
});

module.exports = mongoose.model('Cheese', cheeseSchema);
