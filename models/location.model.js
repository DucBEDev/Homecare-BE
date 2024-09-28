const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    province: String, 
    districts: [
        {
            district: String
        }
    ]
}, {
    timestamps: true
});

const Location = mongoose.model("Location", locationSchema, "locations");

module.exports = Location;
