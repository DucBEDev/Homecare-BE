const express = require("express");
const router = express.Router();

const controller = require("../controller/chat.controller");

router.get("/create-conversation", controller.getCreateConversation);
router.post("/create-conversation", controller.createConversation);
router.get("/get-conversations", controller.getConversations);
router.get("/conversation/messages/:conversationId", controller.getMessages);
router.get("/conversation/:conversationId", controller.getConversationById);
router.post("/send-message", controller.sendMessage);
router.patch("/conversation/read/:conversationId", controller.markMessagesAsRead)

module.exports = router;