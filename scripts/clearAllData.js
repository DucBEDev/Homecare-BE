require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Service = require('../models/service.model');
const Helper = require('../models/helper.model');
const Customer = require('../models/customer.model');
const Staff = require('../models/staff.model');
const Location = require('../models/location.model');
const Blog = require('../models/blog.model');
const Policy = require('../models/policy.model');
const Question = require('../models/question.model');
const CostFactorType = require('../models/costFactorType.model');
const Role = require('../models/role.model');
const Request = require('../models/request.model');
const RequestDetail = require('../models/requestDetail.model');
const Discount = require('../models/discount.model');

async function clearAllData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/homecare');
        console.log('Connected to MongoDB');

        // Delete all data from collections (except general)
        console.log('Clearing all collections...');
        
        await Service.deleteMany({});
        console.log('✓ Services collection cleared');
        
        await Helper.deleteMany({});
        console.log('✓ Helpers collection cleared');
        
        await Customer.deleteMany({});
        console.log('✓ Customers collection cleared');
        
        await Staff.deleteMany({});
        console.log('✓ Staff collection cleared');
        
        await Location.deleteMany({});
        console.log('✓ Locations collection cleared');
        
        await Blog.deleteMany({});
        console.log('✓ Blogs collection cleared');
        
        await Policy.deleteMany({});
        console.log('✓ Policies collection cleared');
        
        await Question.deleteMany({});
        console.log('✓ Questions collection cleared');
        
        await DeviceToken.deleteMany({});
        console.log('✓ Device tokens collection cleared');
        
        await CostFactorType.deleteMany({});
        console.log('✓ Cost factor types collection cleared');
        
        await Role.deleteMany({});
        console.log('✓ Roles collection cleared');
        
        await Request.deleteMany({});
        console.log('✓ Requests collection cleared');
        
        await RequestDetail.deleteMany({});
        console.log('✓ Request details collection cleared');
        
        await Discount.deleteMany({});
        console.log('✓ Discounts collection cleared');

        console.log('\n🎉 All collections have been cleared successfully!');
        console.log('Note: General settings collection was not cleared as requested.');
        
    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

async function runClear() {
    await clearAllData();
}

// Run the clear function if this file is executed directly
if (require.main === module) {
    runClear();
}

module.exports = clearAllData;
