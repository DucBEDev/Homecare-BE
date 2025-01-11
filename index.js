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
    origin: ['https://admin.homekare.site', 'https://homecare-beta.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Connect to mongoose DB
const database = require("./config/database")
database.connect();

// Connect to use Method-override library. Because form element only have method POST, using this library to use method like DELETE, etc.
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

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

// Connect to pug
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

// Configuration public file
app.use(express.static(`${__dirname}/public`));

// TinyMCE library for text editing
const path = require('path');
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));

// App locals variables
const systemConfig = require("./config/system");
app.locals.prefixAdmin = systemConfig.prefixAdmin;

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
