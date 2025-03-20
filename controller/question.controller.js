// Models
const Question = require("../models/Question.model");

// [GET] /admin/questions
module.exports.index = async (req, res) => {
    try {
        const questions = await Question.find({ deleted: false });
    
        res.json({ questions: questions });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching questions' });
    }
};

// [POST] /admin/questions/create
module.exports.createPost = async (req, res) => {
    try {
        const record = new Question(req.body);
        await record.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating question' });
    }
};

// [GET] /admin/questions/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const record = await Question.findOne({
            _id: req.params.id,
            deleted: false
        });

        res.json({
            success: true,
            record: record
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching question' });
    }
};

// [PATCH] /admin/questions/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        await Question.updateOne(
            { _id: req.params.id },
            req.body
        );
        
        res.json({
            success: true
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating question' });
    }
};

// [DELETE] /admin/questions/delete/:id
module.exports.deleteQuestion = async (req, res) => {
    try {
        const id = req.params.id;

        await Question.updateOne(
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
        res.status(500).json({ error: 'An error occurred while deleting question' });
    }
};

// [PATCH] /admin/questions/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Question.updateOne(
            { _id: id },
            { status: status }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while changing question status' });
    }
};

// [GET] /admin/questions/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const record = await Question.findOne({ _id: req.params.id });

        res.json({
            success: true,
            record: record
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching question details' });
    }
};