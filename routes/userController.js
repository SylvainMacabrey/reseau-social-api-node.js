var bcrypt = require('bcrypt');
var jwtUtils = require('../utils/jwt.utils');
var models = require('../models');
var asyncLib = require('async');

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const PASSWORD_REGEX = /^(?=.*\d).{4,8}$/;

module.exports = {

    /**********************************************
     * Fonction pour la création d'un utilisateur *
     **********************************************/ 
    register: (req, res) => {
        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;
        var bio = req.body.bio;
        // on vérifie si tout les parametres sont là
        if(email == null || username == null || password == null) {
            return res.status(400).json({'error': 'missing paramaters'});
        }
        if(username.length >= 13 || username.length <= 3) {
            return res.status(400).json({'error': 'wrong username (must be lenght 4-12)'});
        }
        if(!EMAIL_REGEX.test(email)) {
            return res.status(400).json({'error': 'email is not valid'});
        }
        if(!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({'error': 'password invalid (must be lenght 4-8 and include 1 number)'});
        }
        asyncLib.waterfall([
            // on recherche l'utilisateur via son email
            (done) => {
                models.User.findOne({
                    attributes: ['email'],
                    where: {email: email}
                })
                // ça marche, on passe à la suite
                .then((userFound) => {
                    done(null, userFound);
                })
                // erreur
                .catch((err) => {
                    return res.status(500).json({'error': 'unable to verify user'});
                });
            },
            // on vérifie si l'adresse mail n'est pas déja utilisée
            (userFound, done) => {
                if(!userFound) {
                    bcrypt.hash(password, 5, (err, bcryptedPassword) => {
                        done(null, userFound, bcryptedPassword);
                    });
                } else {
                    return res.status(409).json({'error': 'user already exist'});
                }
            },
            // on créer le nouveau utilsateur
            (userFound, bcryptedPassword, done) => {
                var newUser = models.User.create({
                    email: email,
                    username: username,
                    password: bcryptedPassword,
                    bio: bio,
                    isAdmin: 0
                })
                .then((newUser) => {
                    done(newUser);
                })
                .catch((err) => {
                    return res.status(500).json({'error': 'cannot add user'});
                });
            },            
        ], (newUser) => {
            if(newUser) {
                return res.status(201).json({'userId': newUser.id});
            } else {
                return res.status(500).json({'error': 'cannot add user'});
            }
        });
    },

    /************************************************
     * Fonction pour la connection d'un utilisateur *
     ************************************************/ 
    login: (req, res) => {
        var email = req.body.email;
        var password = req.body.password;
        // on vérifie si tout les parametres sont là
        if(email == null || password == null) {
            return res.status(400).json({'error': 'missing paramaters'});
        }
        asyncLib.waterfall([
            // on recherche l'utilisateur avec son email
            (done) => {
                models.User.findOne({
                    where: {email: email}
                })
                .then((userFound) => {
                    done(null, userFound);
                })
                .catch((err) => {
                    return res.status(500).json({'error': 'unable to verify user'});
                })
            },
            // si on le trouve, on décripte le mot de passe
            (userFound, done) => {
                if(userFound) {
                    bcrypt.compare(password, userFound.password, (errBycrypt, resBycrypt) => {
                        done(null, userFound, resBycrypt);
                    });
                } else {
                    return res.status(404).json({'error': 'user not exist'});
                }
            },
            // on vérifie le mot de passe
            (userFound, resBycrypt, done) => {
                if(resBycrypt) {
                    done(userFound);
                } else {
                    return res.status(403).json({ 'error': 'invalid password' });
                }
            },
        ], (userFound) => {
            if (userFound) {
                return res.status(201).json({
                    'userId': userFound.id,
                    'token': jwtUtils.generateTokenForUser(userFound)
                });
            } else {
                return res.status(500).json({ 'error': 'cannot log on user' });
            }
        });
    },

    /**************************************************
     * Fonction pour la récupération d'un utilisateur *
     **************************************************/ 
    getUserProfile: (req, res) => {
        //récupérer entête authorisation
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        if(userId < 0) return res.status(400).json({'error': 'wrong token'});
        // recherche de l'utilisateur via son id
        models.User.findOne({
            attributes: [ 'id', 'email', 'username', 'bio' ],
            where: {id: userId}
        }).then(function(user) {
            if (user) {
                res.status(201).json(user);
            } else {
                res.status(404).json({ 'error': 'user not found' });
            }
        }).catch(function(err) {
            res.status(500).json({ 'error': 'cannot fetch user' });
        });
    },

    /********************************************
     * Fonction pour le profil d'un utilisateur *
     ********************************************/
    updateUserProfile: function(req, res) {
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        var bio = req.body.bio;
        asyncLib.waterfall([
            // on recherche l'utilisateur
            (done) => {
                models.User.findOne({
                    attributes: ['id', 'bio'],
                    where: {id: userId}
                }).then(function (userFound) {
                    done(null, userFound);
                })
                .catch(function(err) {
                    return res.status(500).json({ 'error': 'unable to verify user' });
                });
            },
            (userFound, done) => {
                if(userFound) {
                    userFound.update({
                        bio: (bio ? bio : userFound.bio)
                    }).then(function() {
                        done(userFound);
                    }).catch(function(err) {
                        res.status(500).json({ 'error': 'cannot update user' });
                    });
                } else {
                    res.status(404).json({ 'error': 'user not found' });
                }
            }
        ], (userFound) => {
            if (userFound) {
                return res.status(201).json(userFound);
            } else {
                return res.status(500).json({ 'error': 'cannot update user profile' });
            }
        });
    }

}