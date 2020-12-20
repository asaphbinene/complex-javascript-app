const express = require("express");
const session = require("express-session");
const KatbinMongoStore = require("connect-mongo")(session);

const flash = require("connect-flash");
const markdown = require("marked");
const csrf = require("csurf");
const app = express();
const sanitizeHTML = require("sanitize-html");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/api", require("./router-api"));

let katbinSessions = session({
  secret: "Je suis le mari de MadoMboli",
  store: new KatbinMongoStore({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});

app.use(katbinSessions);
app.use(flash());

//A middleware to reduice duplication
app.use(function (req, res, next) {
  //Applying the markdown function to our app by the bellow function
  res.locals.filterUserHTML = function (content) {
    return sanitizeHTML(markdown(content), {
      allowedTags: [
        "p",
        "br",
        "ul",
        "li",
        "lo",
        "strong",
        "bold",
        "i",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      allowedAttributes: {},
    });
  };
  //pushing all generated error from the app to userinterface
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  //make current user id available
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
  }
  //Making current user data available
  res.locals.user = req.session.user;
  next();
});

const router = require("./router");

app.use(express.static("public"));
app.use('/favicon.ico', express.static('images/favicon.ico'));
app.set("views", "views");
app.set("view engine", "ejs");

app.use(csrf());
app.use(function(req, res, next){
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/", router);

app.use(function(err, req, res, next){
  if(err){
    if(err.code == "EBADCSRFTOKEN"){
      req.flash("errors", "Cross site request forgery detected.");
      req.session.save(() => res.redirect("/"));
    }else{
      res.render("404")
    }
  }
})

// create socket connection
const server = require('http').createServer(app);

const io = require('socket.io')(server);

io.use(function(socket, next){
  katbinSessions(socket.request, socket.request.res, next)
})

io.on('connection', function(socket){
 if (socket.request.session.user){
  let user = socket.request.session.user;

  socket.emit('Welcome', {username: user.username, avatar: user.avatar});

  socket.on('chatMessageFromBrowser', function(data){
    socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})
  })
 }
})

module.exports = server;
