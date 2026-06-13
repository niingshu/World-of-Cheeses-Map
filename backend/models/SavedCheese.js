const mongoose = require('mongoose');
const { Schema } = mongoose;

const savedCheeseSchema = new Schema({
    cheeseId: { type: Schema.Types.ObjectId, ref: 'Cheese', required: true, unique: true },
}, {
    timestamps: true
});

module.exports = mongoose.model('SavedCheese', savedCheeseSchema);