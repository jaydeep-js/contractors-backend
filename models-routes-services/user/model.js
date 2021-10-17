const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const config = require('../../config')
const bcrypt = require('bcrypt')
const saltRounds = 10
const salt = bcrypt.genSaltSync(saltRounds)
const Schema = mongoose.Schema

const userSchema = new Schema({
  sName: { type: String, trim: true, required: true },
  sUsername: { type: String, trim: true, required: true, unique: true },
  oStatistics: {
    nTotalSites: { type: Number, default: 0 },
    nOngoingSites: { type: Number, default: 0 },
    nPendingSites: { type: Number, default: 0 },
    nCompletedSites: { type: Number, default: 0 },
    nRemarks: { type: Number, default: 0 } // Number of times
  },
  sEmail: { type: String, trim: true, required: true, unique: true },
  sMobNum: { type: String, trim: true, required: true, unique: true },
  eType: { type: String, enum: ['S', 'L'], default: 'L' }, // S : supervisor , L :Labourer
  sPassword: { type: String, trim: true, required: true },
  eStatus: { type: String, enum: ['Y', 'N', 'D'], default: 'Y' },
  aJwtTokens: [{
    sToken: { type: String },
    sPushToken: { type: String, trim: true },
    dTimeStamp: { type: Date, default: Date.now }
  }]
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

userSchema.pre('save', function (next) {
  var user = this
  let i
  if (user.isModified('sName')) {
    const sName = user.sName
    var splitFullName = sName.toLowerCase().split(' ')
    for (i = 0; i < splitFullName.length; i++) {
      splitFullName[i] = splitFullName[i].charAt(0).toUpperCase() + splitFullName[i].substring(1)
    }
    user.sName = splitFullName.join(' ')
  }
  if (user.isModified('sPassword')) {
    user.sPassword = bcrypt.hashSync(user.sPassword, salt)
  }
  if (user.isModified('sEmail')) {
    user.sEmail = user.sEmail.toLowerCase()
  }
  next()
})

userSchema.statics.filterData = function (user) {
  const keys = ['__v', 'aJwtTokens', 'dUpdatedAt', 'oStatistics']
  for (const k of keys) {
    if (user) user[k] = undefined
  }
  return user
}

userSchema.statics.findByToken = function (token) {
  var User = this
  var decoded
  try {
    decoded = jwt.verify(token, config.JWT_SECRET)
  } catch (e) {
    return new Promise((resolve, reject) => {
      reject(e)
    })
  }
  var query = {
    _id: decoded._id,
    'aJwtTokens.sToken': token,
    eStatus: 'Y'
  }
  return User.findOne(query)
}

module.exports = mongoose.model('User', userSchema)
