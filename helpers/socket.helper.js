const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const Staff = require('../models/staff.model');
const Customer = require('../models/customer.model');
const Helper = require('../models/helper.model');

// Store connected users for chat
const connectedChatUsers = new Map();

// Helper function để populate sender info cho chat
const populateSenderInfo = async (senderId, senderType) => {
    try {
        let senderInfo = null;
        if (senderType === 'staff') {
            const staff = await Staff.findById(senderId).select('fullName avatar -_id');
            if (staff) {
                senderInfo = {
                    fullName: staff.fullName,
                    avatar: staff.avatar,
                };
            }
        } else if (senderType === 'customer') {
            const customer = await Customer.findById(senderId).select('fullName avatar -_id');
            if (customer) {
                senderInfo = {
                    fullName: customer.fullName,
                    avatar: customer.avatar,
                };
            }
        } else if (senderType === 'helper') {
            const helper = await Helper.findById(senderId).select('fullName avatar -_id');
            if (helper) {
                senderInfo = {
                    fullName: helper.fullName,
                    avatar: helper.avatar,
                };
            }
        }
        return senderInfo;
    } catch (error) {
        console.log(`Error populating sender ${senderType}:`, error);
        return null;
    }
};

/**
 * Setup chat change streams để theo dõi thay đổi trong chat collections
 * @param {Object} io - Socket.IO instance
 */
const setupChatChangeStreams = (io) => {
    const db = mongoose.connection;
    
    // Theo dõi tin nhắn mới
    const messages = db.collection("messages");
    const messagesChangeStream = messages.watch();

    messagesChangeStream.on("change", async (change) => {
        if (change.operationType === "insert") {
            const newMessage = change.fullDocument;
            console.log("New message created:", newMessage._id);
            
            // Populate sender info
            const senderInfo = await populateSenderInfo(newMessage.senderId, newMessage.senderType);
            
            const messageWithSender = {
                ...newMessage,
                senderInfo
            };

            // Emit tin nhắn mới cho tất cả clients
            io.emit('new_message', messageWithSender);
        }
    });

    // Theo dõi thay đổi lastMessage trong conversation
    const conversations = db.collection("conversations");
    const conversationChangeStream = conversations.watch([
        {
            $match: {
                "operationType": "update",
                "updateDescription.updatedFields.lastMessage": { $exists: true }
            }
        }
    ]);

    conversationChangeStream.on("change", (change) => {
        if (change.operationType === "update") {
            const updatedFields = change.updateDescription.updatedFields;
            
            console.log("Conversation lastMessage updated:", change.documentKey._id);
            
            // Emit conversation update cho tất cả clients
            io.emit("conversation_updated", {
                conversationId: change.documentKey._id,
                lastMessage: updatedFields.lastMessage,
                lastUpdated: updatedFields.lastUpdated || new Date()
            });
        }
    });

    // Handle lỗi
    messagesChangeStream.on("error", (error) => {
        console.error("Messages change stream error:", error);
    });

    conversationChangeStream.on("error", (error) => {
        console.error("Conversation change stream error:", error);
    });

    console.log("Chat change streams setup completed!");
};

/**
 * Setup chat socket handlers - Đơn giản hóa chỉ giữ những events cần thiết
 * @param {Object} io - Socket.IO instance
 */
// const setupChatSocketHandlers = (io) => {
//     io.on('connection', (socket) => {
        
//         // User join chat (optional - nếu muốn track online users)
//         socket.on('join_chat', (userData) => {
//             const { userId, userType } = userData;
//             connectedChatUsers.set(socket.id, { userId, userType });
//             console.log(`${userType} ${userId} joined chat`);
//         });

//         // Join conversation room (nếu muốn gửi tin nhắn chỉ cho conversation cụ thể)
//         socket.on('join_conversation', (conversationId) => {
//             socket.join(`conversation_${conversationId}`);
//             console.log(`Socket joined conversation ${conversationId}`);
//         });

//         // Leave conversation room
//         socket.on('leave_conversation', (conversationId) => {
//             socket.leave(`conversation_${conversationId}`);
//             console.log(`Socket left conversation ${conversationId}`);
//         });

//         // Disconnect
//         socket.on('disconnect', () => {
//             const userData = connectedChatUsers.get(socket.id);
//             if (userData) {
//                 connectedChatUsers.delete(socket.id);
//                 console.log(`${userData.userType} ${userData.userId} disconnected`);
//             }
//         });
//     });
// };

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
                    console.log("request status changed:", {
                        request_id: change.documentKey._id,
                        newStatus: updatedFields.status
                    });

                    // Emit thay đổi trạng thái request cho Admin FE
                    io.emit("request_status_changed", {
                        request_id: change.documentKey._id,
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
        
        // Setup chat change streams
        setupChatChangeStreams(io);
    });
};

/**
 * Setup socket connection handlers
 * @param {Object} io - Socket.IO instance
 */
// const setupSocketConnections = (io) => {
//     io.on("connection", (socket) => {
//         console.log("Admin FE connected:", socket.id);
        
//         // Có thể thêm các event handlers khác tại đây
//         socket.on("join_room", (room) => {
//         socket.join(room);
//             console.log(`Socket ${socket.id} joined room: ${room}`);
//         });

//         socket.on("leave_room", (room) => {
//         socket.leave(room);
//             console.log(`Socket ${socket.id} left room: ${room}`);
//         });

//         socket.on("disconnect", () => {
//             // Handle chat user disconnect
//             const userData = connectedChatUsers.get(socket.id);
//             if (userData) {
//                 const { userId, userType } = userData;
//                 connectedChatUsers.delete(socket.id);
                
//                 // Emit offline status
//                 socket.broadcast.emit('user_offline', { userId, userType });
//                 console.log(`Chat user ${userId} (${userType}) disconnected`);
//             }
            
//             console.log("Admin FE disconnected:", socket.id);
//         });
//     });
    
//     // Setup chat socket handlers
//     setupChatSocketHandlers(io);
// };

/**
 * Khởi tạo tất cả socket functionality
 * @param {Object} io - Socket.IO instance
 */
const initializeSocket = (io) => {
    setupSocketChangeStreams(io);
    // setupSocketConnections(io);
};

module.exports = {
    initializeSocket,
    setupSocketChangeStreams,
    // setupSocketConnections,
    setupChatChangeStreams,
    // setupChatSocketHandlers,
    connectedChatUsers
};