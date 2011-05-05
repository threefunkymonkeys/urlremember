(function() {
  var ObjectId, Resource, ResourceSchema, Schema, app, config, express, mongoose, relativeDate;
  var __slice = Array.prototype.slice;
  relativeDate = require("relative-date");
  require("date-utils");
  config = (function() {
    if (!process.env.NODE_ENV || "development" === process.env.NODE_ENV) {
      try {
        return JSON.parse(require("fs").readFileSync(__dirname + "/config.json"));
      } catch (e) {
        console.error("Configuration file required for development");
        throw e;
      }
    } else {
      return {
        port: 3000,
        db: process.env.DUOSTACK_DB_MONGODB
      };
    }
  })();
  mongoose = require("mongoose");
  mongoose.connect(config.db);
  Schema = mongoose.Schema;
  ObjectId = Schema.ObjectId;
  ResourceSchema = new Schema({
    url: {
      type: String,
      unique: true
    },
    title: {
      type: String
    },
    created: {
      type: Date,
      "default": Date.now,
      index: true
    },
    visits: {
      type: Number,
      "default": 0
    }
  });
  ResourceSchema.static({
    unread: function(callback) {
      return this.find({}).where('visits', 0).sort('created', -1).execFind(callback);
    },
    visited: function(callback) {
      return this.find({}).where('visits', {
        '$gt': 0
      }).sort('visits', -1).limit(25).execFind(callback);
    },
    remember: function(url, callback) {
      var title, _ref;
      _ref = url.split(" "), url = _ref[0], title = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
      title = title ? title.join(' ') : 'Untitled';
      return Resource.findOne({
        url: url
      }, function(err, doc) {
        var resource;
        if (err) {
          console.error;
        }
        resource = doc ? (doc.title = title, doc) : resource = new Resource({
          url: url,
          title: title
        });
        return resource.save(callback);
      });
    }
  });
  mongoose.model('Resource', ResourceSchema);
  Resource = mongoose.model('Resource');
  express = require("express");
  app = express.createServer();
  app.configure(function() {
    app.set("views", __dirname + "/views");
    if (!false) {
      app.set("view engine", "jade");
    } else {
      app.set("view engine", "haml");
      app.register(".haml", require("hamljs"));
    }
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    return app.use(express.static(__dirname + "/public"));
  });
  app.configure("development", function() {
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  app.configure("production", function() {
    return app.use(express.errorHandler());
  });
  app.get("/", function(req, res) {
    return Resource.unread(function(err, resources) {
      return res.render("index", {
        resources: resources,
        err: err,
        relativeDate: relativeDate
      });
    });
  });
  app.post("/remember", function(req, res) {
    if (!req.body.url) {
      res.redirect("/");
      return;
    }
    return Resource.remember(req.body.url, function(err) {
      if (!err) {
        return res.redirect("/");
      } else {
        console.error(err);
        return res.render("index", req.params);
      }
    });
  });
  app.get("/forget/:id", function(req, res) {
    return Resource.remove({
      _id: req.params.id
    }, function(err) {
      return res.redirect("/");
    });
  });
  app.get("/visit/:url", function(req, res) {
    return Resource.update({
      url: req.params.url
    }, {
      visits: 1
    }, function(err) {
      if (err) {
        console.error(err);
      }
      return res.redirect(req.params.url);
    });
  });
  app.get("/visited", function(req, res) {
    return Resource.visited(function(err, resources) {
      return res.render("visited", {
        resources: resources,
        err: err,
        relativeDate: relativeDate
      });
    });
  });
  app.listen(config.serverPort);
  console.log("Listening http://0.0.0.0:%d", config.serverPort);
}).call(this);
