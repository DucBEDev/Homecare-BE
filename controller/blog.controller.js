// Models
const Blog = require("../models/blog.model");

// Config
const systemConfig = require("../config/system");


// [GET] /admin/blogs
module.exports.index = async (req, res) => {
    const blogs = await Blog.find({ deleted: false });

    res.render("pages/blogs/index", {
        title: "Quản lý bài viết",
        blogs: blogs
    });
}

// [GET] /admin/blogs/create
module.exports.create = async (req, res) => {
    res.render("pages/blogs/create", {
        title: "Thêm bài viết"
    });
}

// [POST] /admin/staffs/create
module.exports.createPost = async (req, res) => {
    const record = new Blog(req.body);
    await record.save();

    req.flash('success', 'Khởi tạo bài viết thành công');
    res.redirect(`${systemConfig.prefixAdmin}/blogs`);
}
