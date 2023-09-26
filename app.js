
import express from "express"
import path from "path"
import bodyParser from "body-parser"
import session from "express-session"
import cookieSession from 'cookie-session';

import cookieParser from "cookie-parser"

import dotenv from "dotenv"
const __dirname = path.resolve()
dotenv.config({ path: path.join(__dirname, './.env') })

console.log(process.env);
import onfido from "./routes/onfido.js"

const cookieSecret = process.env.APP_SECRET

const app = express()

//app.set("trust proxy", "1")
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser(cookieSecret))

// app.use(
//   session({
//     secret: cookieSecret,
//     resave: true,
//     saveUninitialized: true,
//     cookie: { secure: app.get("env") === "development" ? false : true }
//   })
// )


app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
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
  console.log(`Listening on ${process.env.PORT}`)
})
