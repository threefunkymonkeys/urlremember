relativeDate = require "relative-date"
require "date-utils"

## Configuration

config =
  if !process.env.NODE_ENV or "development" == process.env.NODE_ENV
    try
      JSON.parse require("fs").readFileSync(__dirname + "/config.json")
    catch e
      console.error "Configuration file required for development"
      throw e
  else
    port: 3000
    db: process.env.DUOSTACK_DB_MONGODB

## Model

mongoose = require "mongoose"
mongoose.connect( config.db )

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

ResourceSchema = new Schema
  url:
    type: String
    unique: true
  title:
    type: String
  created:
    type: Date
    default: Date.now
    index: true
  visits:
    type: Number
    default: 0

ResourceSchema.static
  unread: (callback) ->
    this.find({}).where('visits', 0).sort('created', -1).execFind(callback)

  visited: (callback) ->
    this.find({}).where('visits', { '$gt': 0 }).sort('visits', -1).limit(25).execFind(callback)

  remember: (url, callback) ->
    [url, title...] = url.split " "
    title = if title
      title.join ' '
    else
      'Untitled'

    Resource.findOne { url }, (err, doc) ->
      console.error if err
      resource = if doc
        doc.title = title
        doc
      else
        resource = new Resource { url, title }
      resource.save callback


mongoose.model 'Resource', ResourceSchema
Resource = mongoose.model 'Resource'

## Server

express = require "express"
app = express.createServer()

app.configure ->
  app.set "views", __dirname + "/views"
  unless false
    app.set "view engine", "jade"
  else
    app.set "view engine", "haml"
    app.register ".haml", require("hamljs")
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express.static(__dirname + "/public")

app.configure "development", ->
  app.use express.errorHandler
    dumpExceptions: true
    showStack: true

app.configure "production", ->
  app.use express.errorHandler()

app.get "/", (req, res) ->
  Resource.unread (err, resources) ->
    res.render "index",
      { resources, err, relativeDate }

app.post "/remember", (req, res) ->
  unless req.body.url
    res.redirect "/"
    return

  Resource.remember req.body.url, (err) ->
    unless err
      res.redirect "/"
    else
      console.error err
      res.render "index", req.params

app.get "/forget/:id", (req, res) ->
  Resource.remove { _id: req.params.id }, (err) ->
    res.redirect "/"

app.get "/visit/:url", (req, res) ->
  Resource.update { url: req.params.url }, { visits: 1 }, (err) ->
    console.error err if err
    res.redirect req.params.url

app.get "/visited", (req, res) ->
  Resource.visited (err, resources) -> res.render "visited", { resources, err, relativeDate }

app.listen config.serverPort

console.log "Listening http://0.0.0.0:%d", config.serverPort
