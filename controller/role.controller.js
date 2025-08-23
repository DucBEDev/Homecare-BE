// Models
const Role = require("../models/role.model");


// [GET] /admin/roles
module.exports.index = async (req, res) => {
    try {
        let find = {
            deleted: false
        };
    
        const records = await Role.find(find).select("title description");

        res.json({
            success: true,
            records: records
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [POST] /admin/roles/create
module.exports.createPost = async (req, res) => {
    try {
        const newRole = new Role(req.body);
        await newRole.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/roles/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const record = await Role.findOne(
            { 
                _id: req.params.id,
                deleted: false
            }
        ).select('title description');

        res.json({
            success: true,
            record: record
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [PATCH] /admin/roles/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        await Role.updateOne(
            { _id: req.params.id },
            req.body
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [DELETE] /admin/roles/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        await Role.updateOne(
            { _id: req.params.id },
            { deleted: true }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/roles/permissions
module.exports.permissions = async (req, res) => {
    try {
        let find = {
            deleted: false
        };
        const records = await Role.find(find).select("title permissions");

        res.json({
            success: true,
            records: records
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [PATCH] /admin/roles/permissions
module.exports.permissionsPatch = async (req, res) => {
    try {
        for (const item of req.body.permissions) {
            const id = item.id;
            const permissions = item.permissions;

            await Role.updateOne(
                { _id: id },
                { permissions: permissions }
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}