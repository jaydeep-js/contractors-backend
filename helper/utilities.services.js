/* eslint-disable no-prototype-builtins */
/**
 * Utilities Services is for common, simple & reusable methods,
 * @method {removenull} is for removing null key:value pair from the passed object
 * @method {sendmail} is for generating trasport and sending mail with specified mailOptions Object And returns a promise ex: { from:'', to:'',subject: '', html: '' }
 */

const fs = require('fs')
const { messages, status, jsonStatus } = require('./api.responses')
const errorLogs = fs.createWriteStream('error.log', { flags: 'a' })
const { Buffer } = require('buffer')

const removenull = (obj) => {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || obj[propName] === '') delete obj[propName]
  }
}

const removeDuplicates = (arr) => {
  if (toString.call(arr) === '[object Array]') {
    return [...new Set(arr)]
  }
  return []
}

const catchError = (name, error, req, res) => {
  console.log(name, error)
  errorLogs.write(`${name} => ${new Date().toString()} => ${error.toString()}\r\n`)
  return res.status(status.InternalServerError).jsonp({
    status: jsonStatus.InternalServerError,
    message: messages[req.userLanguage].error
  })
}

const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && object.hasOwnProperty(key)) {
      obj[key] = object[key]
    }
    return obj
  }, {})
}

const checkAlphanumeric = (input) => {
  var letters = /^[0-9a-zA-Z]+$/
  if (input.match(letters)) return true
  else return false
}

const randomStr = (len, type) => {
  let char = ''
  if (type === 'referral' || type === 'private') {
    char = '0123456789abcdefghijklmnopqrstuvwxyz'
  } else if (type === 'otp') {
    // char = '0123456789'
    char = '1'
  }
  let val = ''
  for (var i = len; i > 0; i--) {
    val += char[Math.floor(Math.random() * char.length)]
  }

  if (val.toString().length === len) {
    return val
  } else {
    randomStr(len, type)
  }
}

const capitalizeString = (val) => {
  var capVal = val.toLowerCase().split(' ')
  for (let i = 0; i < capVal.length; i++) {
    capVal[i] = capVal[i].charAt(0).toUpperCase() + capVal[i].substring(1)
  }
  return capVal.join(' ')
}

const isValidEmail = (email) => (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email))
const isValidMobileNumber = (mobileNumber) => (/^[6-9]\d{9}$/.test(mobileNumber))

const isUrl = (s) => {
  const regex = new RegExp(/^(ftp|http|https):\/\/[^ "]+$/)
  return s && s.match(regex)
}

const isValidDate = (date) => {
  return Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())
}

const checkLength = (str, minLen, maxLen) => !!(str.length >= minLen && str.length <= maxLen)

const getByteArray = (inputString) => {
  const buffer = Buffer.from(inputString, 'utf16le')
  return buffer
}

const randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const processSearchTerm = (search) => {
  return search.replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/\*/g, '\\*')
    .replace(/\+/g, '\\+')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\)/g, '\\)')
    .replace(/\(/g, '\\(')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
}

const getPaginationParams = (queryParams) => {
  let { start = 0, limit = 10, sort = 'dCreatedAt', order = 'desc', search = '', sd = null, ed = Date.now() } = queryParams
  start = (start && parseInt(start)) || 0
  limit = (limit && parseInt(limit)) || 10
  let sortBy = 'dCreatedAt'
  let orderBy = -1
  if (order && order === 'asc') {
    orderBy = order === 'asc' ? 1 : -1
  }
  if (sort) sortBy = sort
  const sorting = { [sortBy]: orderBy }

  search = search ? processSearchTerm(search) : ''

  return { sorting, search, start, limit, sd, ed }
}

const sortKeys = (obj = null) => obj ? Object.keys(obj).sort().reduce((acc, key) => { if (obj[key]) acc[key] = obj[key]; return acc }, {}) : {}

module.exports = {
  removenull,
  removeDuplicates,
  catchError,
  pick,
  checkAlphanumeric,
  randomStr,
  capitalizeString,
  isUrl,
  checkLength,
  getByteArray,
  randomInteger,
  processSearchTerm,
  isValidDate,
  getPaginationParams,
  isValidEmail,
  isValidMobileNumber,
  sortKeys
}
