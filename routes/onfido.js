import express from "express"
import  url from "url"
import path from "path"

import { Onfido, Region } from "@onfido/api"
import jwt from "jsonwebtoken"

import dotenv from "dotenv"
const __dirname = path.resolve()
console.log(__dirname);
dotenv.config({ path: path.join(__dirname, './.env') })

const onfidoClient = new Onfido({
  apiToken: process.env.ONFIDO_API_TOKEN,
  region:
    process.env.ONFIDO_REGION === "EU"
      ? Region.EU
      : process.env.ONFIDO_REGION === "US"
      ? Region.US
      : process.env.ONFIDO_REGION === "CA"
      ? Region.CA
      : Region.EU
})
const router = express.Router()

router.get("/path/:sessionToken", (req, res) => {
  console.log(req.params)
  const query = url.parse(req.url, true).query
  const sessionToken = req.params.sessionToken
  const auth0State = String(query.state)
  req.session.auth0State = auth0State
  const payload = jwt.verify(sessionToken, process.env.APP_SECRET, {
    ignoreExpiration: true
  })

  if (!payload.exp) {
    res.status(403).render("error", {
      message: "Session Token is expired."
    })
  }

  req.session.auth0Payload = payload

  const { applicant } = payload
  req.session.applicant = applicant
  return onfidoClient.sdkToken
    .generate({
      applicantId: applicant,
      referrer: process.env.ONFIDO_REFERRER_PATTERN
    })
    .then(sdkToken => {
      res.status(200).render("onfido", {
        sdkToken
      })
    })
    .catch(error => {
      console.log(error)
      res.status(500).render("error", {
        message: error
      })
    })
})

router.get("/", (req, res) => {
  const query = url.parse(req.url, true).query
  const sessionToken = String(query.session_token)
  const auth0State = String(query.state)
  req.session.auth0State = auth0State
  const payload = jwt.verify(sessionToken, process.env.APP_SECRET, {
    ignoreExpiration: true
  })


  if (!payload.exp) {
    res.status(403).render("error", {
      message: "Session Token is expired."
    })
  }

  req.session.auth0Payload = payload

  const { applicant } = payload
  req.session.applicant = applicant
  return onfidoClient.sdkToken
    .generate({
      applicantId: applicant,
      referrer: process.env.ONFIDO_REFERRER_PATTERN
    })
    .then(sdkToken => {
      res.status(200).render("onfido", {
        sdkToken
      })
    })
    .catch(error => {
      console.log(error)
      res.status(500).render("error", {
        message: error
      })
    })
})

router.post("/", (req, res) => {
  const { auth0State, auth0Payload, checkId } = req.session
  const complete = req.body.onfidoComplete
  if (complete) {
    //eslint-disable-next-line
    //@ts-ignore
    return onfidoClient.check
      .find(checkId)
      .then(response => {
        const sessionToken = {
          checkStatus: response.status,
          checkResult: response.result,
          applicant: response.applicantId,
          ...auth0Payload,
          state: auth0State
        }
        const signed = jwt.sign(sessionToken, process.env.APP_SECRET)
        console.log(auth0Payload)
        //eslint-disable-next-line
        //@ts-ignore
        const continueUrl = `${auth0Payload.iss}continue/reset-password?state=${auth0State}&session_token=${signed}`
        //const continueUrl = `${auth0Payload.iss}continue?state=${auth0State}`
        res.redirect(continueUrl)
      })
      .catch(error => {
        res.status(500).render("error", { message: error })
      })
  } else {
    return onfidoClient.check
      .find(checkId)
      .then(response => {
        const sessionToken = {
          checkStatus: response.status,
          checkResult: response.result,
          ...auth0Payload,
          state: auth0State
        }
        const signed = jwt.sign(sessionToken, process.env.APP_SECRET)
        console.log(auth0Payload)
        const continueUrl = `${auth0Payload.iss}continue/reset-password?state=${auth0State}&session_token=${signed}`
        res.redirect(continueUrl)
      })
      .catch(error => {
        res.status(500).render("error", { message: error })
      })
  }
})

router.get("/check", (req, res) => {
  console.log(req.session);
  const { applicant } = req.session
  const reportNames = process.env.ONFIDO_REPORT_NAMES.split(",")
  return onfidoClient.check
    .create({ applicantId: applicant, reportNames })
    .then(response => {
      req.session.checkId = response.id
      res.status(200).json({ status: response.status })
    })
    .catch(error => {
      res.status(500).json({ message: error })
    })
})

router.get("/status", (req, res) => {
  const { checkId } = req.session
  return onfidoClient.check
    .find(checkId)
    .then(response => {
      res.status(200).json({ status: response.status })
    })
    .catch(error => {
      res.status(500).json({ message: error })
    })
})

export default router
