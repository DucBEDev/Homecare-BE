const mongoose = require("mongoose");

const helperSchema = new mongoose.Schema({
    helper_id: String,
    fullName: String,
    password: String,
    startDate: {
        type: Date,
        default: Date.now()
    },
    baseFactor: {
        type: Number,
        default: 1
    }, // Hệ số lương cơ bản
    birthDate: Date,
    phone: String,
    birthPlace: String,
    address: String,
    workingArea: {
        province: String,
        districts: {
            type: Array,
            default: []
        }
    },  
    jobs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service"
        }
    ], 
    yearOfExperience: {
        type: Number,
        default: 0
    },
    experienceDescription: String,
    avatar: String,
    healthCertificates: {
        type: Array,
        default: []
    },
    gender: String,
    nationality: String,
    educationLevel: String,
    height: Number,
    weight: Number,
    status: {
        type: String,
        default: "active" 
    },
    workingStatus: {
        type: String,
        default: "offline"
    },
    deleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        account_id: String,
        createdAt: {
            type: Date,
            default: Date.now()
        }
    },
    updatedBy: [
        {
            account_id: String,
            updatedAt: Date
        }
    ],
    deletedBy: {
        account_id: String,
        deletedAt: Date
    }
}, {
    timestamps: true
});

const Helper = mongoose.model("Helper", helperSchema, "helpers");

module.exports = Helper;