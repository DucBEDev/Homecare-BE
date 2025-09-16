const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

/**
 * Setup socket change streams để theo dõi thay đổi trong database
 * @param {Object} io - Socket.IO instance
 */
const setupSocketChangeStreams = (io) => {
    const db = mongoose.connection;
    
    db.once("open", () => {
        console.log("Setting up database change streams...");
        
        // 1. Theo dõi thay đổi trong collection requests (đơn hàng mới)
        const requests = db.collection("requests");
        const requestsChangeStream = requests.watch();

        requestsChangeStream.on("change", (change) => {
            if (change.operationType === "insert") {
                const newRequest = change.fullDocument;
                console.log("New request:", newRequest);
                
                // Emit đơn hàng mới cho Admin FE
                io.emit("new_request", newRequest);
            }
        });

        // 2. Theo dõi thay đổi trong collection helpers (workingStatus thay đổi)
        const helpers = db.collection("helpers");
        const helpersChangeStream = helpers.watch([
            {
                $match: {
                    "operationType": "update",
                    "updateDescription.updatedFields.workingStatus": { $exists: true }
                }
            }
        ]);

        helpersChangeStream.on("change", (change) => {
            if (change.operationType === "update") {
                const updatedFields = change.updateDescription.updatedFields;
                
                if (updatedFields.workingStatus) {
                    console.log("Helper working status changed:", {
                        helper_id: change.documentKey._id,
                        newStatus: updatedFields.workingStatus
                    });
                    
                    // Emit thay đổi trạng thái helper cho Admin FE
                    io.emit("helper_workingStatus_changed", {
                        helper_id: change.documentKey._id,
                        workingStatus: updatedFields.workingStatus,
                        timestamp: new Date()
                    });
                }
            }
        });

        // 3. Theo dõi thay đổi status trong collection requests (order status thay đổi)
        const requestsStatusChangeStream = requests.watch([
            {
                $match: {
                    "operationType": "update",
                    "updateDescription.updatedFields.status": { $exists: true }
                }
            }
        ]);

        requestsStatusChangeStream.on("change", (change) => {
            if (change.operationType === "update") {
                const updatedFields = change.updateDescription.updatedFields;
                
                if (updatedFields.status) {
                    console.log("Order status changed:", {
                        order_id: change.documentKey._id,
                        newStatus: updatedFields.status
                    });
                    
                    // Emit thay đổi trạng thái order cho Admin FE
                    io.emit("order_status_changed", {
                        order_id: change.documentKey._id,
                        status: updatedFields.status,
                        timestamp: new Date()
                    });
                }
            }
        });

        // 4. Theo dõi thay đổi trong collection requestDetails (status thay đổi)
        const requestDetails = db.collection("requestDetails");
        const requestDetailsChangeStream = requestDetails.watch([
            {
                $match: {
                    "operationType": "update",
                    "updateDescription.updatedFields.status": { $exists: true }
                }
            }
        ], { fullDocument: 'updateLookup' });

        requestDetailsChangeStream.on("change", async (change) => {
            if (change.operationType === "update") {
                const updatedFields = change.updateDescription.updatedFields;
                
                if (updatedFields.status) {
                    let helperInfo = null;
                    const fullDocument = change.fullDocument;
                    
                    if (fullDocument && fullDocument.helper_id) {
                        try {
                            console.log("Fetching helper info for helper_id:", fullDocument.helper_id);
                            const helper = await db.collection("helpers").findOne({ 
                                _id: new ObjectId(fullDocument.helper_id)
                            });
                            
                            if (helper) {
                                helperInfo = {
                                    helper_id: helper._id,
                                    fullName: helper.fullName,
                                };
                            }
                        } catch (error) {
                            console.error("Error fetching helper info:", error);
                        }
                    }

                    console.log("Request detail status changed:", {
                        requestDetail_id: change.documentKey._id,
                        newStatus: updatedFields.status,
                        helper: helperInfo
                    });
                    
                    // Emit thay đổi trạng thái request detail với thông tin helper cho Admin FE
                    io.emit("request_detail_status_changed", {
                        requestDetail_id: change.documentKey._id,
                        status: updatedFields.status,
                        helper: helperInfo,
                        timestamp: new Date()
                    });
                }
            }
        });

        // Handle lỗi cho các change streams
        requestsChangeStream.on("error", (error) => {
            console.error("Requests change stream error:", error);
        });

        requestsStatusChangeStream.on("error", (error) => {
            console.error("Requests status change stream error:", error);
        });

        helpersChangeStream.on("error", (error) => {
            console.error("Helpers change stream error:", error);
        });

        requestDetailsChangeStream.on("error", (error) => {
            console.error("Request details change stream error:", error);
        });

        console.log("All change streams setup completed!");
    });
};

/**
 * Setup socket connection handlers
 * @param {Object} io - Socket.IO instance
 */
const setupSocketConnections = (io) => {
    io.on("connection", (socket) => {
        console.log("Admin FE connected:", socket.id);
        
        // Có thể thêm các event handlers khác tại đây
        socket.on("join_room", (room) => {
        socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });

        socket.on("leave_room", (room) => {
        socket.leave(room);
            console.log(`Socket ${socket.id} left room: ${room}`);
        });

        socket.on("disconnect", () => {
            console.log("Admin FE disconnected:", socket.id);
        });
    });
};

/**
 * Khởi tạo tất cả socket functionality
 * @param {Object} io - Socket.IO instance
 */
const initializeSocket = (io) => {
    setupSocketChangeStreams(io);
    setupSocketConnections(io);
};

module.exports = {
    initializeSocket,
    setupSocketChangeStreams,
    setupSocketConnections
};