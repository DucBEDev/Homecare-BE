const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: { 
        type: String, 
        ref: 'Conversation', 
        required: true 
    },
    senderId: { 
        type: String, 
        required: true 
    },
    senderType: { 
        type: String, 
        enum: ['staff', 'customer', 'helper'], 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'read'], 
        default: 'sent' 
    }
});

// Add indexes for better performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });

const Message = mongoose.model("Message", MessageSchema, "messages");

module.exports = Message;