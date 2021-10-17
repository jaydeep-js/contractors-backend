const router = require('express').Router()
const userAuthServices = require('./services')
const { body } = require('express-validator')
const { jsonStatus, status, messages } = require('../../../helper/api.responses')
const { setLanguage, isUserAuthenticated } = require('../../../middlewares/middleware')

router.post('/login', [
  body('sLogin').not().isEmpty(),
  body('sPassword').not().isEmpty()
], setLanguage, userAuthServices.login)

router.post('/logout', isUserAuthenticated, userAuthServices.logout)

router.post('/validate', setLanguage, userAuthServices.validate)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router

/*

We can add logs for user signin and admin modify changes

*/
