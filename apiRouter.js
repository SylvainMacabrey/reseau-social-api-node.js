var express = require('express');
var userController = require('./routes/userController');
var messageController = require('./routes/messageController');
var likeController = require('./routes/likeController');

//Routes
exports.router = (() => {

    var apiRouter = express.Router();

    // Users routes
    apiRouter.route('/users/register/').post(userController.register);
    apiRouter.route('/users/login/').post(userController.login);
    apiRouter.route('/users/me').get(userController.getUserProfile);
    apiRouter.route('/users/me').put(userController.updateUserProfile);

    // Messages routes
    apiRouter.route('/messages/new/').post(messageController.createMessage);
    apiRouter.route('/messages/').get(messageController.listMessages);

    // Likes routes
    apiRouter.route('/messages/:messageId/vote/like/').post(likeController.likePost);
    apiRouter.route('/messages/:messageId/vote/dislike/').post(likeController.dislikePost);

    return apiRouter;
})();