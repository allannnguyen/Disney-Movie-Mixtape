var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '28c6280aa0a141bfa15533802deede36'; // Your client id
var client_secret = 'b09c97c8d57f4f6e9b27b5a6ce71904a'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var stateKey = 'spotify_auth_state';
var app = express();
var path = require('path');

var dict = {
  bambi: {
    name: 'Bambi',
    bg: 'images/bambi_bg.jpg',
    icon: 'images/bambi_pic.jpg',
    desc: 'Bambi is a slow classic, which is reflected in your taste for chill songs.'
  },
  moana: {
    name: 'Moana',
    bg: 'images/moana_bg.jpg',
    icon: 'images/moana_pic.jpg',
    desc: ''
  },
  mulan: {
    name: 'Mulan',
    bg: 'images/mulan_bg.jpg',
    icon: 'images/mulan_pic.jpg',
    desc: ''
  },
  incredibles: {
    name: 'The Incredibles',
    bg: 'image/incredibles_bg.jpg',
    icon: 'image/incredibles_pic.jpg',
    desc: ''
  },
};
var result1;
var result2;
var access_token;
var refresh_token;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

/*
app.get('/results', function(req, res) {
  res.sendFile(path.join(__dirname + '/public/results.html'));
});
*/

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  // your application requests authorization
  var scope = 'user-top-read user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  // The application requests refresh and access tokens after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            access_token = body.access_token;
            refresh_token = body.refresh_token;

            res.redirect('/#' +
            querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            }));

        } else {
            res.redirect('/#' +
            querystring.stringify({
                error: 'invalid_token'
            }));
        }
    });
  }
});


/**
 * Shows the result based on list of user top tracks
 */
app.get('/results', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/results.html'));

    var track_sample = {
      url: 'https://api.spotify.com/v1/me/top/tracks',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + access_token
      },
      qs: {
          "time_range" : "short_term",
          "limit" : 1
      }
    };

    request.get(track_sample, function(error, response, body) {
        let bodyJson = JSON.parse(body);
        var items = bodyJson.items;
        var id = items[0].id;

        var song = {
            url: "https://api.spotify.com/v1/audio-features/" + id,
            headers: {
                'Authorization': 'Bearer ' + access_token
            }
        };

        request.get(song, function(error, response, body) {
            let bodyJson = JSON.parse(body);
            var val = bodyJson.valence;
            var energy = bodyJson.energy;

            if (val < 0.5) {
                if (energy < 0.7) {
                    result1 = dict.bambi;
                    console.log("Bambi");
                } else {
                    result1 = dict.mulan;
                    console.log("Mulan");
                }
            } else {
                if (energy < 0.7) {
                    result1 = dict.up;
                    console.log("Up");
                } else {
                    result1 = dict.incredibles;
                    console.log("incredibles");
                }
            }
        });
    });



});


/**
 * Gets a new account token for user
 */
app.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
