var express = require("express");
var request = require("sync-request");
var url = require("url");
var qs = require("qs");
var querystring = require("querystring");
var cons = require("consolidate");
var randomstring = require("randomstring");
var __ = require("underscore");
const { access } = require("fs");
__.string = require("underscore.string");

var app = express();

app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", "files/client");

// authorization server information
var authServer = {
  authorizationEndpoint: "http://localhost:9001/authorize",
  tokenEndpoint: "http://localhost:9001/token",
};

// client information

/*
 * Add the client information in here
 */
var client = {
  client_id: "oauth-client-1",
  client_secret: "oauth-client-secret-1",
  redirect_uris: ["http://localhost:9000/callback"],
};

var protectedResource = "http://localhost:9002/resource";

var state = null;

var access_token = null;
var scope = null;

app.get("/", function (req, res) {
  res.render("index", { access_token: access_token, scope: scope });
});

//  Send the user to the authorization server
app.get("/authorize", function (req, res) {
  // throw out old access_token
  access_token = null;
  // instantiate state to prevent cross-site attack
  state = randomstring.generate();

  var authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: client.redirect_uris[0],
    // state: state,
  });

  console.log("redirect", authorizeUrl);

  res.redirect(authorizeUrl);
});

// Parse the response from the authorization server and get a token
app.get("/callback", function (req, res) {
  if (req.query.state != state) {
    console.log(
      "State DOES NOT MATCH: expected %s got %s",
      state,
      req.query.state
    );
    res.render("error", { error: "State value did not match" });
    return;
  }

  // because request is coming in as redirect from the auth server, and not as a HTTP response to our direct request.
  var code = req.query.code;

  // creating HTTP POST
  var form_data = qs.stringify({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: client.redirect_uris[0], // as per oauth specification, if request is used in auth request, we must do the same in token request.
  });

  var headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      encodeClientCredentials(client.client_id, client.client_secret),
  };

  // token response
  var tokRes = request("POST", authServer.tokenEndpoint, {
    body: form_data,
    headers: headers,
  });

  console.log("Requesting access token for code %s", code);

  var body = JSON.parse(tokRes.getBody());

  access_token = body.access_token;
  console.log("Got access token: %s", access_token);

  res.render("index", { access_token: access_token });
});

// Use the access token to call the resource server
app.get("/fetch_resource", function (req, res) {
  if (!access_token) {
    res.render("error", { error: "Missing  access token" });
  }

  var headers = {
    Authorization: "Bearer " + access_token,
  };

  var resource = request("POST", protectedResource, { headers: headers });

  if (resource.statusCode >= 200 && resource.statusCode < 300) {
    var body = JSON.parse(resource.getBody());
    res.render("data", { resource: body });
    return;
  } else {
    res.render("error", {
      error: "Server returned response code: " + resource.statusCode,
    });
    return;
  }
});

var buildUrl = function (base, options, hash) {
  var newUrl = url.parse(base, true);
  delete newUrl.search;
  if (!newUrl.query) {
    newUrl.query = {};
  }
  __.each(options, function (value, key, list) {
    newUrl.query[key] = value;
  });
  if (hash) {
    newUrl.hash = hash;
  }

  return url.format(newUrl);
};

var encodeClientCredentials = function (clientId, clientSecret) {
  return Buffer.from(
    querystring.escape(clientId) + ":" + querystring.escape(clientSecret)
  ).toString("base64");
};

app.use("/", express.static("files/client"));

var server = app.listen(9000, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;
  // host = "127.0.0.1";
  console.log("OAuth Client is listening at http://%s:%s", host, port);
});
