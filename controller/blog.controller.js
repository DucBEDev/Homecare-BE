// Models
const Blog = require("../models/blog.model");

// Config
const systemConfig = require("../config/system");


// [GET] /admin/blogs
module.exports.index = async (req, res) => {
    try {
        const blogs = await Blog.find({ deleted: false });
    
        res.json({blogs: blogs});
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [POST] /admin/blogs/create
module.exports.createPost = async (req, res) => {
    try {
        const record = new Blog(req.body);
        await record.save();

        res.json({success: true});
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/blogs/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const record = await Blog.findOne({
            _id: req.params.id,
            deleted: false
        });

        res.json({
            success: true,
            record: record
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests'});
    }
}

// [PATCH] /admin/blogs/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        await Blog.updateOne(
            { _id: req.params.id },
            req.body
        );
        
        res.json({
            success: true
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests'});
    }
}

// [DELETE] /admin/blogs/deleteBlog/:id
module.exports.deleteBlog = async (req, res) => {
    try {
        await Blog.deleteOne( { _id: req.params.id } );
        
        res.json({
            success: true
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests'});
    }
}

// [PATCH] /admin/blogs/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Blog.updateOne(
            { _id: id },
            { status: status }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/blogs/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const record = await Blog.findOne({ _id: req.params.id });

        res.json({
            success: true,
            record: record
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}