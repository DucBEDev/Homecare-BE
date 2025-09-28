const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const Staff = require('../models/staff.model');
const Customer = require('../models/customer.model');
const Helper = require('../models/helper.model');

// Helper function để populate participant data
const populateParticipants = async (conversations) => {
    const populatedConversations = [];
    
    for (let conv of conversations) {
        const convObj = conv.toObject();
        const populatedParticipants = [];
        
        for (let participant of convObj.participants) {
            let populatedData = { ...participant };
            
            try {
                if (participant.type === 'staff') {
                    const staff = await Staff.findById(participant.id).select('fullName avatar phone -_id');
                    if (staff) {
                        populatedData.userFullName = staff.fullName;
                        populatedData.userAvatar = staff.avatar;
                        populatedData.userPhone = staff.phone;
                    }
                }
                else if (participant.type === 'customer') {
                    const customer = await Customer.findById(participant.id).select('fullName avatar phone -_id');
                    if (customer) {
                        populatedData.userFullName = customer.fullName;
                        populatedData.userAvatar = customer.avatar;
                        populatedData.userPhone = customer.phone;
                    }
                }
                else if (participant.type === 'helper') {
                    const helper = await Helper.findById(participant.id).select('fullName avatar phone -_id');
                    if (helper) {
                        populatedData.userFullName = helper.fullName;
                        populatedData.userAvatar = helper.avatar;
                        populatedData.userPhone = helper.phone;
                    }
                }
            } catch (error) {
                console.log(`Error populating ${participant.type}:`, error);
            }
            
            populatedParticipants.push(populatedData);
        }
        
        convObj.participants = populatedParticipants;
        populatedConversations.push(convObj);
    }
    
    return populatedConversations;
};

// [GET] /admin/chats/create-conversation?staffId=
module.exports.getCreateConversation = async (req, res) => {
    try {
        const staffId = req.query.staffId;

        const conversations = await Conversation.find({
            'participants.id': staffId,
            conversationType: 'staff'
        });

        const idsInConversations = conversations
            .map(conv => conv.participants
                .filter(p => p.type === 'staff')
                .map(p => p.id)
            )
            .flat();

        
        const staffListDontHaveConversation = await Staff.find({
            _id: { $nin: idsInConversations }
        }).select("fullName avatar phone");

        const updatedStaffList = staffListDontHaveConversation.filter(staff => staff._id.toString() !== staffId);

        return res.status(200).json({
            success: true,
            staffList: updatedStaffList
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

// [POST] /admin/chats/create-conversation
module.exports.createConversation = async (req, res) => {
    try {
        const { participants, conversationType } = req.body;
        
        const existingConversation = await Conversation.findOne({
            $and: [
                { 'participants.id': { $all: participants.map(p => p.id) } },
                { 'participants': { $size: participants.length } }
            ]
        });

        if (existingConversation) {
            return res.status(200).json({
                success: false,
                message: "Conversation already exists",
            });
        }

        const conversation = new Conversation({
            participants,
            conversationType
        });

        await conversation.save();
        
        res.status(201).json({
            success: true
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating conversation",
            error: error.message
        });
    }
};

// [GET] /admin/chats/get-conversations?staffId=&type=&page=&limit=
module.exports.getConversations = async (req, res) => {
    try {
        const { staffId, type } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!type || !['staff', 'customer', 'helper'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Type parameter is required and must be one of: staff, customer, helper"
            });
        }

        const conversations = await Conversation.find({
            $and: [
                {
                    'participants': {
                        $elemMatch: {
                            id: staffId,
                            type: 'staff'
                        }
                    }
                },
                {
                    conversationType: type
                }
            ]
        }, {
            'participants._id': 0
        })
        .sort({ lastUpdated: -1 })
        .skip(skip)
        .limit(limit); 

        const populatedConversations = await populateParticipants(conversations);

        const total = await Conversation.countDocuments({
            $and: [
                {
                    'participants': {
                        $elemMatch: {
                            id: staffId,
                            type: 'staff'
                        }
                    }
                },
                {
                    conversationType: type
                }
            ]
        });

        res.status(200).json({
            success: true,
            conversationData: populatedConversations,
            conversationType: type,
            totalConversations: total,
        });
    } catch (error) {
        console.log('Error in getConversations:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching conversations",
            error: error.message
        });
    }
};

// [GET] /admin/chats/conversation/:conversationId
module.exports.getConversationById = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await Conversation.findById(conversationId, {
            'participants._id': 0
        }).select("-lastMessage"); 
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }
        const populatedConversations = await populateParticipants([conversation]);
        res.status(200).json({
            success: true,
            data: populatedConversations[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching conversation",
            error: error.message
        });
    }
};

// [POST] /admin/chats/send-message
module.exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, senderId, senderType, content } = req.body;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Kiểm tra sender có phải là participant không
        const isParticipant = conversation.participants.some(
            p => p.id.toString() === senderId && p.type === senderType
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not a participant in this conversation"
            });
        }

        const message = new Message({
            conversationId,
            senderId,
            senderType,
            content
        });

        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: content,
            lastUpdated: new Date()
        });

        // Emit socket event nếu có io instance
        if (req.app.get('io')) {
            const io = req.app.get('io');
            
            // Populate sender info
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

            const messageWithSender = {
                ...message.toObject(),
                senderInfo
            };

            // Emit to conversation room
            io.to(`conversation_${conversationId}`).emit('new_message', messageWithSender);
        }

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error sending message",
            error: error.message
        });
    }
};

// [GET] /admin/chats/conversation/messages/:conversationId
module.exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 }); 

        const populatedMessages = [];
        for (let message of messages) {
            const messageObj = message.toObject();
            
            try {
                let senderInfo = null;
                if (message.senderType === 'staff') {
                    const staff = await Staff.findById(message.senderId).select('fullName avatar -_id');
                    if (staff) {
                        senderInfo = {
                            fullName: staff.fullName,
                            avatar: staff.avatar,
                        };
                    }
                } else if (message.senderType === 'customer') {
                    const customer = await Customer.findById(message.senderId).select('fullName avatar -_id');
                    if (customer) {
                        senderInfo = {
                            fullName: customer.fullName,
                            avatar: customer.avatar,
                        };
                    }
                } else if (message.senderType === 'helper') {
                    const helper = await Helper.findById(message.senderId).select('fullName avatar -_id');
                    if (helper) {
                        senderInfo = {
                            fullName: helper.fullName,
                            avatar: helper.avatar,
                        };
                    }
                }
                
                messageObj.senderInfo = senderInfo;
            } catch (error) {
                console.log(`Error populating sender ${message.senderType}:`, error);
                messageObj.senderInfo = null;
            }
            
            populatedMessages.push(messageObj);
        }

        res.status(200).json({
            success: true,
            messages: populatedMessages
        });
    } catch (error) {
        console.log('Error in getMessages:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching messages",
            error: error.message
        });
    }
};

// [PATCH] /admin/chats/conversation/read/:conversationId
module.exports.markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;

        await Message.updateMany(
            { 
                conversationId, 
                senderId: { $ne: userId },
                status: { $ne: 'read' }
            },
            { status: 'read' }
        );

        res.status(200).json({
            success: true,
            message: "Messages marked as read"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error marking messages as read",
            error: error.message
        });
    }
};

