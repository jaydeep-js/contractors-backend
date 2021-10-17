const router = require('express').Router()

const checkListServices = require('./services')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')
const { check } = require('express-validator')

// admin routes
/*

updateS3ResToApi({key:"addChecklist", urlsArray})

action(){

  switch(key){

    case "addChecklist":{
      axios.post("url",data).then().catch()

      break
    }

    case default:
      break

  }

}

*/

router.post('/admin/add', [
  check('sTitle').not().isEmpty(),
  check('sImage').not().isEmpty(),
  check('bIsOptional').isBoolean(),
  check('bIsActive').isBoolean(),
  check('eMediaType').isIn(['P', 'V'])
], isAdminAuthenticated, checkListServices.adminAdd)

router.get('/admin/pre-signed-url', [
  check('sFileName').not().isEmpty(),
  check('sContentType').not().isEmpty()
], isAdminAuthenticated, checkListServices.adminGetSignedUrl)

router.put('/admin/:id', isAdminAuthenticated, checkListServices.adminUpdate)
router.get('/admin/list', isAdminAuthenticated, checkListServices.adminList)
router.get('/admin/:id', isAdminAuthenticated, checkListServices.adminGetDetails)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
