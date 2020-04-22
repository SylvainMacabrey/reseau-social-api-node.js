var models = require('../models');
var asyncLib = require('async');
var jwtUtils = require('../utils/jwt.utils');

module.exports = {

    /***********************************
     * Fonction pour poster un message *
     ***********************************/ 
    createMessage: (req, res) => {
        //récupérer entête authorisation
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
        //params
        var title = req.body.title;
        var content = req.body.content;
        if(title == null || content == null) {
            return res.status(400).json({'error': 'missing paramaters'});
        }
        if(title.length >= 31 || title.length <= 4) {
            return res.status(400).json({'error': 'wrong title (must be lenght 5-30)'});
        }
        if(content.length <= 4) {
            return res.status(400).json({'error': 'wrong content (must be lenght 5)'});
        }
        asyncLib.waterfall([
            // on recherche l'utilisateur via son id
            (done) => {
                models.User.findOne({
                    where: {id: userId}
                })
                .then((userFound) => {
                    done(null, userFound);
                })
                .catch((err) => {
                    return res.status(500).json({'error': 'unable to verify user'});
                });
            },
            // on créer le message
            (userFound, done) => {
                if(userFound) {
                    models.Message.create({
                        title: title,
                        content: content,
                        likes: 0,
                        UserId: userFound.id
                    })
                    .then((newMessage) => {
                        done(newMessage);
                    });
                } else {
                    return res.status(500).json({'error': 'user not found'});
                }
            }
        ], (newMessage) => {
            if(newMessage) {
                return res.status(201).json(newMessage);
            } else {
                return res.status(500).json({'error': 'cannot post message'});
            }
        });
    },

    /****************************************
     * Fonction pour récupérer les messages *
     ****************************************/ 
    listMessages: (req, res) => {
        var fields  = req.query.fields;
        var limit   = parseInt(req.query.limit);
        var offset  = parseInt(req.query.offset);
        var order   = req.query.order;
        if (limit > 50) {
            limit = 50;
        }
        // trouver les messages
        models.Message.findAll({
            order: [(order != null) ? order.split(':') : ['title', 'ASC']],
            attributes: (fields !== '*' && fields != null) ? fields.split(',') : null,
            limit: (!isNaN(limit)) ? limit : null,
            offset: (!isNaN(offset)) ? offset : null,
            include: [{
                model: models.User,
                attributes: ['username']
            }]
        }).then((messages) => {
            if (messages) {
              res.status(200).json(messages);
            } else {
              res.status(404).json({"error": "no messages found"});
            }
        }).catch((err) => {
            console.log(err);
            res.status(500).json({"error": "invalid fields"});
        });
    }

};