const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('../../config')
const bcrypt = require('bcrypt')
const saltRounds = 10
const salt = bcrypt.genSaltSync(saltRounds)
const Schema = mongoose.Schema

const adminSchema = new Schema({
  sName: { type: String, trim: true, required: true },
  sUsername: { type: String, trim: true, required: true },
  sEmail: { type: String, trim: true, required: true },
  sMobNum: { type: String, trim: true, required: true },
  sPassword: { type: String, trim: true, required: true },
  eStatus: { type: String, enum: ['Y', 'B', 'D'], default: 'Y' },
  aJwtTokens: [{
    sToken: { type: String },
    sPushToken: { type: String, trim: true },
    dTimeStamp: { type: Date, default: Date.now }
  }]
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

adminSchema.pre('save', function (next) {
  var admin = this
  let i
  if (admin.isModified('sName')) {
    const sName = admin.sName
    var splitFullName = sName.toLowerCase().split(' ')
    for (i = 0; i < splitFullName.length; i++) {
      splitFullName[i] = splitFullName[i].charAt(0).toUpperCase() + splitFullName[i].substring(1)
    }
    admin.sName = splitFullName.join(' ')
  }
  if (admin.isModified('sPassword')) {
    admin.sPassword = bcrypt.hashSync(admin.sPassword, salt)
  }
  if (admin.isModified('sEmail')) {
    admin.sEmail = admin.sEmail.toLowerCase()
  }
  next()
})

adminSchema.statics.filterData = function (admin) {
  const keys = ['__v', 'aJwtTokens', 'sPassword', 'dUpdatedAt']
  for (const k of keys) {
    if (admin) admin[k] = undefined
  }
  return admin
}

adminSchema.statics.findByToken = function (token) {
  var admin = this
  var decoded
  try {
    decoded = jwt.verify(token, config.JWT_SECRET)
  } catch (e) {
    return new Promise((resolve, reject) => reject(e))
  }
  var query = {
    _id: decoded._id,
    'aJwtTokens.sToken': token,
    eStatus: 'Y'
  }
  return admin.findOne(query)
}

adminSchema.index({ eStatus: 1, sEmail: 1, sMobNum: 1, sUsername: 1 })

module.exports = mongoose.model('Admin', adminSchema)
