const express = require("express");
const cors = require("cors");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const { userController } = require("./routes/user.routes");
const { firebaseController } = require("./routes/poll.firebase.routes");
const { Connection, firebase } = require("./config/db");
const authController = require("./routes/signin.routes");
const { convertPollData } = require("./utils/utils");
const { pollController } = require("./routes/poll.routes");
const { templateController } = require("./routes/template.routes");
const app = express();
const PORT = process.env.PORT || 8080;
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const swaggerUI = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerJsDocs = YAML.load("./api.yaml");

const fireDb = firebase.database();
const ref = fireDb.ref("polls");

app.use(express.json());
app.use(cors());

// google oAuth
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "bla bla bla",
  })
);

//  Set up Google OAuth 2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID:
        "207569143898-5g5hp5q12aku0ks5j32pnmcfmtsc9jjd.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "https://deploying-eo0h.onrender.com/auth/google/callback",
    },
    (accessToken, refreshToken, profile, cb) => {
      // Callback function after successful authentication
      return cb(null, profile);
    }
  )
);

// Set up Passport.js session management
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

// Set up routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const userEmail = req.user.emails[0].value;
    const userName = req.user.displayName;
    res.redirect(`http://localhost:3000/?name=${userName}&email=${userEmail}`);
  }
);

app.get("/", (req, res) => {
  res.send("Welcome to homepage");
});

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerJsDocs));
app.use("/user", userController); // signup
app.use("/firebase", firebaseController);
app.use("/auth", authController); // login
app.use("/poll", pollController);
app.use("/template", templateController);

// ---------------Socket.io setup to get live changes ------->
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("getPollData", (pollId) => {
    const pollRef = fireDb.ref(`polls/${pollId}`);
    pollRef.on(
      "value",
      async (snapshot) => {
        const pollData = snapshot.val();
        if (!pollData) {
          socket.emit("pollDeleted");
          return;
        }
        const newPollData = await convertPollData(pollData);
        socket.emit("pollData", newPollData);
      },
      (error) => {
        console.error(`Error getting poll data with ID ${pollId}: `, error);
      }
    );
  });
});

app.get("/socket.io/socket.io.js", (req, res) => {
  res.sendFile(__dirname + "/node_modules/socket.io/client-dist/socket.io.js");
});

io.attach(server);

server.listen(PORT, async () => {
  try {
    await Connection;
    await firebase;
    console.log("Server is connected to database");
    console.log(`server is running on ${PORT}`);
  } catch (err) {
    console.log(err);
  }
});