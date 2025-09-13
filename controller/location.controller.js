// Models
const Location = require("../models/location.model");

// Config
const systemConfig = require("../config/system");


// [GET] /admin/locations/province
module.exports.getProvinces = async (req, res) => {
    try {
        const { search } = req.query;

        const matchStage = { status: "active" };

        if (search) {
            matchStage.Name = { $regex: search, $options: "i" };
        }

        const pipeline = [
            { $match: matchStage },

            ...(search
                ? [{
                    $addFields: {
                        isPrefix: {
                            $cond: [
                                { $regexMatch: { input: "$name", regex: `^${search}`, options: "i" } },
                                1,
                                0
                            ]
                        }
                    }
                }]
                : []),

            { $sort: search ? { isPrefix: -1, Name: 1 } : { Name: 1 } },

            { $project: { provinceId: "$_id", provinceName: "$name" } }
        ];

        const provinces = await Location.aggregate(pipeline);

        res.json({
            success: true,
            result: provinces
        });
    } catch (err) {
        console.error("getProvinces error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// [GET] /admin/locations/ward/:provinceId
module.exports.getWardsByProvince = async (req, res) => {
    try {
        const { provinceId } = req.params;
        const { search } = req.query;

        // Lấy city và districts
        const province = await Location.findById(provinceId).select("wards");

        if (!province) {
            return res.status(404).json({ message: "Province not found" });
        }

        let wards = province.wards || [];

        if (search) {
            const keyword = search.toLowerCase();

            // Lọc theo keyword
            wards = wards.filter(d =>
                d.name.toLowerCase().includes(keyword)
            );

            // Sắp xếp: ưu tiên bắt đầu bằng keyword
            wards.sort((a, b) => {
                const aStarts = a.name.toLowerCase().startsWith(keyword) ? 1 : 0;
                const bStarts = b.name.toLowerCase().startsWith(keyword) ? 1 : 0;

                if (bStarts !== aStarts) return bStarts - aStarts;
                return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
            });
        } else {
            wards.sort((a, b) =>
                a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
            );
        }

        return res.status(200).json({
            success: true,
            result: wards.map(d => ({ wardName: d.name, wardCode: d._id }))
        });
    } catch (err) {
        console.error("getWardsByProvince error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
