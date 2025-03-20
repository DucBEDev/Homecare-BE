// Models
const Policy = require("../models/Policy.model");

// [GET] /admin/policies
module.exports.index = async (req, res) => {
    try {
        const policies = await Policy.find({ deleted: false });
    
        res.json({ policies: policies });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching policies' });
    }
};

// [POST] /admin/policies/create
module.exports.createPost = async (req, res) => {
    try {
        const record = new Policy(req.body);
        await record.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating policy' });
    }
};

// [GET] /admin/policies/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const record = await Policy.findOne({
            _id: req.params.id,
            deleted: false
        });

        res.json({
            success: true,
            record: record
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching policy' });
    }
};

// [PATCH] /admin/policies/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        await Policy.updateOne(
            { _id: req.params.id },
            req.body
        );
        
        res.json({
            success: true
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating policy' });
    }
};

// [DELETE] /admin/policies/delete/:id
module.exports.deletePolicy = async (req, res) => {
    try {
        const id = req.params.id;

        await Policy.updateOne(
            { _id: id },
            { 
                status: "inactive",
                deleted: true
            }
        );
        
        res.json({
            success: true
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting policy' });
    }
};

// [PATCH] /admin/policies/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Policy.updateOne(
            { _id: id },
            { status: status }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while changing policy status' });
    }
};

// [GET] /admin/policies/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const record = await Policy.findOne({ _id: req.params.id });

        res.json({
            success: true,
            record: record
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching policy details' });
    }
};