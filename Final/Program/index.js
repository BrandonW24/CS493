const router = module.exports = require('express').Router();

//router.use('/lodgings', require('./lodgings'));
//router.use('/guests', require('./guests'));
router.use('/spaces',require('./spaces'));
router.use('/cars',require('./cars'));
router.use('/renters',require('./renters'));
router.use('/login', require('./login'));
