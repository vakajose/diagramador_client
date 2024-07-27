const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../lib/auth');

router.get('/', (req, res) => {
    //res.render('index');
    // res.send('hello word');
    res.redirect('/signin');
});

module.exports = router;