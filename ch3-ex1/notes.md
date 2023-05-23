3.2.2 Processing the authorization response
page 49

```
app.get("/callback", function (req, res) {
  // because request is coming in as redirect from the auth server, and not as a HTTP response to our direct request.
  var code = req.query.code;

  // creating HTTP POST
  var form_data = qs.stringify({
    grant_type: 'authorization_code',
    code:code,
    redirect_uri: client.redirect_uris[0] // as per oauth specification, if request is used in auth request, we must do the same in token request.
  })

});
```

### Why we use req instead of res

Because request is coming in as redirect from the auth server, and not as a HTTP response to our direct request.

### Why we would redirect_uri when we don't redirect

As per oauth specification, if request is used in auth request, we must do the same in token request.

This prevents an attacker from using a compromised redirect URI with an otherwise well-meaning client by injecting an authorization code from one session into another.
