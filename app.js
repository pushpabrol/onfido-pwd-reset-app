
import express from "express"
import path from "path"
import bodyParser from "body-parser"
import session from "express-session"
import cookieSession from 'cookie-session';
import sessions from "client-sessions";

import cookieParser from "cookie-parser"

import dotenv from "dotenv"
const __dirname = path.resolve()
dotenv.config({ path: path.join(__dirname, './.env') })
const LOG = process.env.DEBUG === "true" ? console.log.bind(console) : function () { };
LOG(process.env);
import onfido from "./routes/onfido.js"

//const cookieSecret = process.env.APP_SECRET

const app = express()

//app.set("trust proxy", "1")
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
//app.use(cookieParser(cookieSecret))

app.use(sessions({
  cookieName: 'session', // cookie name dictates the key name added to the request object
  secret: process.env.COOKIE_SESSION_SECRET, // should be a large unguessable string
  duration: .15 * 60 * 60 * 1000, // how long the session will stay valid in ms
  cookie: {
    path: '/redirect-rule', // cookie will only be sent to requests under '/api'
    ephemeral: true, // when true, cookie expires when the browser closes
    httpOnly: true, // when true, cookie is not accessible from javascript
    secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
  }
}));


app.set("views", path.join(__dirname, "/views"))
app.set("view engine", "pug")
app.use(express.static(path.join(__dirname, "/public")))

app.use("/redirect-rule", onfido)

app.use((req, res, next) => {
  next(new Error("Not Found"))
})

if (app.get("env") === "development") {
  app.use((err, req, res) => {
    res.status(500).render("error", {
      message: err.message,
      error: err
    })
  })
}

app.use((err, req, res) => {
  res.status(500).render("error", {
    message: err.message
  })
})

// Express requires the next function (or specific function signature) to include the 4 arguments: https://github.com/expressjs/generator/issues/78
// as such, we are telling eslint to ignore the no-unused-vars rule for the error handler middleware
//eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).render("error", {
    message: err.message
  })
})


app.listen(process.env.PORT || 3000, () => {
  LOG(`Listening on ${process.env.PORT}`)
})
