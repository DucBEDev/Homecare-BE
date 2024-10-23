const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    province: String, 
    districts: {
        type: Array,
        default: []
    },
    wards: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
});

const Location = mongoose.model("Location", locationSchema, "locations");

module.exports = Location;
