'use strict';

var boom = require('boom');
var uuid = require('uuid');
var bcrypt = require('bcrypt');
var config = require('config');

/**
 * Validate user credentials against records in the mock-db
 * @param {string} username - unencrypted username
 * @param {string} password - unencrypted password
 * @param {function} callback - callback function with signature `function(err, isValid) {...}`
 */
var validateUser = function (username, password, callback) {
    var userDB = { john: config.defaultUser };
    var user = userDB[username];
    if (!user) {
        return callback(null, false);
    }

    bcrypt.compare(password, user.password, function (err, isValid) {
        callback(err, isValid, { id: user.id, name: user.username });
    });
};

/**
 * Generate a new key pair for a user
 * @param {string} username - unencrypted username
 * @param {function} callback - callback function with signature `function(err, credentials) {...}`
 *   where credentials is an object with the following properties:
 *   `id, key, algorithm, issueTime, expireTime`
 */
var generateHawkCredentials = function(username, callback) {
    var credentials;
    try {
        credentials = {
            id: uuid.v4(),
            key: uuid.v4(),
            algorithm: config.algorithm,
            issueTime: +new Date(),
            expireTime: +new Date() + config.hawkKeyLifespan
        };
    }
    catch (err) {
        callback(err, null);
        return;
    }
    callback(null, credentials);
    return;
};

exports.register = function (server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    var client = options.redisClient;
    server.auth.strategy('pwd', 'basic', { validateFunc: validateUser });
    server.route({
        method: 'GET',
        path: '/login',
        config: {
            auth: 'pwd',
            handler: function (request, reply) {
                var username = request.auth.credentials.name;
                var serveHawkCredentials = function(err, credentials) {
                    if (err) {
                        reply(boom.wrap(err, 500));
                    } else {
                        client.sadd(username, credentials.id);
                        client.hmset(credentials.id, credentials);
                        reply(credentials);
                    }
                };
                // Generate new key pair and serve back to user
                generateHawkCredentials(username, serveHawkCredentials);
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'login'
};