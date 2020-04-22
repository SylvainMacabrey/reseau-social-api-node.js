var models = require('../models');
var asyncLib = require('async');
var jwtUtils = require('../utils/jwt.utils');

module.exports = {

    /***********************************
     * Fonction pour like un message *
     ***********************************/ 
    likePost: (req, res) => {
        //récupérer entête authorisation
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        // params
        var messageId = parseInt(req.query.messageId);
        // on vérifie si l'id est valide
        if (messageId <= 0) {
            return res.status(400).json({ 'error': 'invalid parameters' });
        }
        asyncLib.waterfall([
            // on recherche le message via son id
            (done) => {
                models.Message.findOne({
                    where: {id: messageId}
                })
                .then(function(messageFound) {
                    done(null, messageFound);
                })
                .catch(function(err) {
                    return res.status(500).json({'error': 'unable to verify message'});
                });
            },
            // on recherche l'utilisateur via son id
            (messageFound, done) => {
                if(messageFound) {
                    models.User.findOne({
                        where: { id: userId }
                    })
                    .then(function(userFound) {
                        done(null, messageFound, userFound);
                    })
                    .catch(function(err) {
                        return res.status(500).json({'error': 'unable to verify user'});
                    });
                } else {
                    res.status(404).json({'error': 'post already liked'});
                }
            },
            // on vérifie si l'utilisateur a déja liker le post
            (messageFound, userFound, done) => {
                if(userFound) {
                    models.Like.findOne({
                        where: {
                            userId: userId,
                            messageId: messageId
                        }
                    })
                    .then((userAlreadyLikedFound) => {
                        done(null, messageFound, userFound, userAlreadyLikedFound);
                    })
                    .catch((err) => {
                        return res.status(500).json({'error': 'unable to verify is user already liked'});
                    });
                } else {
                    res.status(404).json({'error': 'user not exist'});
                } 
            },
            // on créer la relation entre le message et l'utilisateur likant le massage
            (messageFound, userFound, userAlreadyLikedFound, done) => {
                if(!userAlreadyLikedFound) {
                    messageFound.addUser(userFound, {
                        isLike: LIKED
                    })
                    .then((alreadyLikeFound) => {
                        done(null, messageFound, userFound);
                    })
                    .catch(function(err) {
                        return res.status(500).json({'error': 'unable to set user reaction'});
                    });
                } else {
                    if (userAlreadyLikedFound.isLike === DISLIKED) {
                    userAlreadyLikedFound.update({
                        isLike: LIKED,
                    })
                    .then(() => {
                        done(null, messageFound, userFound);
                    })
                    .catch((err) => {
                        res.status(500).json({ 'error': 'cannot update user reaction' });
                    });
                    } else {
                        res.status(409).json({ 'error': 'message already liked' });
                    }
                }
            },
            // on incremente le nombre de like du message
            (messageFound, userFound, done) => {
                messageFound.update({
                    likes: messageFound.likes + 1,
                })
                .then(() => {
                    done(messageFound);
                })
                .catch((err) => {
                    res.status(500).json({'error': 'cannot update message like counter'});
                });
            }
        ], (messageFound) => {
            if (messageFound) {
                return res.status(201).json(messageFound);
            } else {
                return res.status(500).json({'error': 'cannot update message'});
            }
        });
    },

    /***********************************
     * Fonction pour dislike un message *
     ***********************************/ 
    dislikePost: (req, res) => {
        //récupérer entête authorisation
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        // params
        var messageId = parseInt(req.query.messageId);
        // on vérifie si l'id est valide
        if (messageId <= 0) {
            return res.status(400).json({ 'error': 'invalid parameters' });
        }
        asyncLib.waterfall([
            // on recherche le message via son id
            (done) => {
                models.Message.findOne({
                    where: {id: messageId}
                })
                .then(function(messageFound) {
                    done(null, messageFound);
                })
                .catch(function(err) {
                    return res.status(500).json({'error': 'unable to verify message'});
                });
            },
            // on recherche l'utilisateur via son id
            (messageFound, done) => {
                if(messageFound) {
                    models.User.findOne({
                        where: { id: userId }
                    })
                    .then(function(userFound) {
                        done(null, messageFound, userFound);
                    })
                    .catch(function(err) {
                        return res.status(500).json({'error': 'unable to verify user'});
                    });
                } else {
                    res.status(404).json({'error': 'post already liked'});
                }
            },
            // on vérifie si l'utilisateur a déja liker le post
            (messageFound, userFound, done) => {
                if(userFound) {
                    models.Like.findOne({
                        where: {
                            userId: userId,
                            messageId: messageId
                        }
                    })
                    .then((userAlreadyLikedFound) => {
                        done(null, messageFound, userFound, userAlreadyLikedFound);
                    })
                    .catch((err) => {
                        return res.status(500).json({'error': 'unable to verify is user already liked'});
                    });
                } else {
                    res.status(404).json({'error': 'user not exist'});
                } 
            },
            // on détruit la relation entre le message et l'utilisateur dislikant le massage
            (messageFound, userFound, userAlreadyLikedFound, done) => {
                if(userAlreadyLikedFound) {
                    userAlreadyLikedFound.destroy()
                    .then(() => {
                        done(null, messageFound, userFound);
                    })
                    .catch(function(err) {
                        return res.status(500).json({'error': 'unable to set user reaction'});
                    });
                } else {
                    done(null, messageFound, userFound);
                }
            },
            // on incremente le nombre de like du message
            (messageFound, userFound, done) => {
                messageFound.update({
                    likes: messageFound.likes - 1,
                })
                .then(() => {
                    done(messageFound);
                })
                .catch((err) => {
                    res.status(500).json({'error': 'cannot update message like counter'});
                });
            }
        ], (messageFound) => {
            if (messageFound) {
                return res.status(201).json(messageFound);
            } else {
                return res.status(500).json({'error': 'cannot update message'});
            }
        });
    }

};