// Connect to env
require("dotenv").config();

// Connect to ExpressJS
const express = require('express');
const app = express();
const port = process.env.PORT;

// Connect to mongoose DB
const database = require("./config/database")
database.connect();

// Connect to use Method-override library. Because form element only have method POST, using this library to use method like DELETE, etc.
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

// Library to handle Date-Time
const moment = require("moment");
app.locals.moment = moment;

// Connect to parse the body when data is sent onto server by using body-parser library
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false} ));

// Connect to Express Flash library to show notification when changing things
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const session = require("express-session");

app.use(cookieParser("keyboard cat"));
app.use(session({ cookie: { maxAge: 60000}}));
app.use(flash());

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
