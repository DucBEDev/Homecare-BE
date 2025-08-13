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
                                { $regexMatch: { input: "$Name", regex: `^${search}`, options: "i" } },
                                1,
                                0
                            ]
                        }
                    }
                }]
                : []),

            { $sort: search ? { isPrefix: -1, Name: 1 } : { Name: 1 } },

            { $project: { provinceId: "$_id", provinceName: "$Name" } }
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

// [GET] /admin/locations/district/:provinceId
module.exports.getDistrictsByProvince = async (req, res) => {
    try {
        const { provinceId } = req.params;
        const { search } = req.query;

        // Lấy city và districts
        const province = await Location.findById(provinceId).select("Districts");

        if (!province) {
            return res.status(404).json({ message: "Province not found" });
        }

        let districts = province.Districts || [];

        if (search) {
            const keyword = search.toLowerCase();

            // Lọc theo keyword
            districts = districts.filter(d =>
                d.Name.toLowerCase().includes(keyword)
            );

            // Sắp xếp: ưu tiên bắt đầu bằng keyword
            districts.sort((a, b) => {
                const aStarts = a.Name.toLowerCase().startsWith(keyword) ? 1 : 0;
                const bStarts = b.Name.toLowerCase().startsWith(keyword) ? 1 : 0;

                if (bStarts !== aStarts) return bStarts - aStarts;
                return a.Name.localeCompare(b.Name, "vi", { sensitivity: "base" });
            });
        } else {
            districts.sort((a, b) =>
                a.Name.localeCompare(b.Name, "vi", { sensitivity: "base" })
            );
        }

        return res.status(200).json({
            success: true,
            result: districts.map(d => ({ districtName: d.Name, districtCode: d._id }))
        });
    } catch (err) {
        console.error("getDistrictsByCity error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// [GET] /admin/locations/ward/:provinceId/:districtId
module.exports.getWardsByDistrict = async (req, res) => {
    try {
        const { provinceId, districtId } = req.params;
        const { search } = req.query;

        const province = await Location.findById(provinceId).select("Districts");
        if (!province) {
            return res.status(404).json({ message: "Province not found" })
        }

        const district = province.Districts.find(d => d._id.toString() === districtId);
        if (!district) {
            return res.status(404).json({ message: "District not found" })
        }

        let wards = district.Wards || [];

        if (search) {
            const keyword = search.toLowerCase();

            wards = wards.filter(w =>
                w.Name.toLowerCase().includes(keyword)
            );

            wards.sort((a, b) => {
                const aStarts = a.Name.toLowerCase().startsWith(keyword) ? 1 : 0;
                const bStarts = b.Name.toLowerCase().startsWith(keyword) ? 1 : 0;

                if (bStarts !== aStarts) return bStarts - aStarts;
                return a.Name.localeCompare(b.Name, "vi", { sensitivity: "base" });
            });
        } else {
            wards.sort((a, b) =>
                a.Name.localeCompare(b.Name, "vi", { sensitivity: "base" })
            );
        }

        res.json({
            success: true,
            result: wards.map(w => ({ wardName: w.Name, wardCode: w._id }))
        });
    } catch (err) {
        console.error("getWardsByDistrict error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
