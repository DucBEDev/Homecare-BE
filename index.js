// Load biến môi trường
require("dotenv").config();

// ExpressJS setup
const express = require("express");
const app = express();
const port = process.env.PORT || 4000;

// HTTP server (cần để attach Socket.IO)
const http = require("http");
const server = http.createServer(app);

// Socket.IO setup
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "https://admin.homekare.site",      
      "https://home-care-fe.vercel.app", 
      "http://localhost:3000"            
    ],
    credentials: true,
  },
});

// Parse JSON body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS
const cors = require("cors");
app.use(cors({
  origin: [
    "https://admin.homekare.site",      
    "https://home-care-fe.vercel.app", 
    "http://localhost:3000"            
  ],
  credentials: true,
}));

// Kết nối MongoDB
const database = require("./config/database");
const mongoose = require("mongoose");

database.connect();

// Lấy mongoose connection để tạo change stream
const db = mongoose.connection;
db.once("open", () => {
  const requests = db.collection("requests");
  const changeStream = requests.watch();

  changeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      const newRequest = change.fullDocument;
      console.log("New requests:", newRequest);

      io.emit("request", newRequest);
    }
  });
});

// Date-time lib
const moment = require("moment");
app.locals.moment = moment;

// Session + Cookie
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(cookieParser("keyboard cat"));
app.use(session({ cookie: { maxAge: 60000 } }));

// Routes
const routeAdmin = require("./routes/index.route");
routeAdmin(app);

// Cron jobs
require("./helpers/autoAssignHelper.helper");

// Socket.IO connection log
io.on("connection", (socket) => {
  console.log("Admin FE connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Admin FE disconnected:", socket.id);
  });
});

// Start server
server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
