const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true
    },
    type: { 
        type: String, 
        enum: ['staff', 'customer', 'helper'], 
        required: true 
    }
});

const ConversationSchema = new mongoose.Schema({
    participants: [ParticipantSchema],
    conversationType: { 
        type: String, 
        enum: ['helper', 'customer', 'staff'], 
        required: true 
    },
    lastMessage: { 
        type: String, 
        default: '' 
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
});

// Add indexes for better performance
ConversationSchema.index({ 'participants.id': 1 });
ConversationSchema.index({ lastUpdated: -1 });

// Virtual populate for messages
ConversationSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'conversationId'
});

ConversationSchema.set('toJSON', { virtuals: true });
ConversationSchema.set('toObject', { virtuals: true });

const Conversation = mongoose.model("Conversation", ConversationSchema, "conversations");

module.exports = Conversation;
