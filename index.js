// Connect to env
require("dotenv").config();

// Connect to ExpressJS
const express = require('express');
const app = express();
const port = process.env.PORT;

// Parse JSON bodies (as sent by API clients)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Config CORS to connect FE and BE
const cors = require('cors');
app.use(cors({
    origin: ['https://admin.homekare.site', 'https://home-care-fe.vercel.app', 'http://localhost:3000'],
    credentials: true
}));

// Connect to mongoose DB
const database = require("./config/database")
database.connect();

// Library to handle Date-Time
const moment = require("moment");
app.locals.moment = moment;

// Session và Cookie config
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(cookieParser("keyboard cat"));
app.use(session({ cookie: { maxAge: 60000}}));

// Connect to routes
const routeAdmin = require('./routes/index.route')
routeAdmin(app);

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
