require('dotenv').config()
// contractors-media
console.log(process.env.NODE_ENV)
const dev = {
  API_URL: `http://localhost:${process.env.PORT}`,
  APP_SECRET: process.env.APP_SECRET || '',
  SITE_NAME: 'Contractorapp',
  SITE_IMAGE: 'Logo.png',
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL || 'your DB url',
  JWT_VALIDITY: '90d',
  LOGIN_HARD_LIMIT_ADMIN: 5,
  LOGIN_HARD_LIMIT: 1,
  S3_MEDIA_BUCKET_NAME: process.env.S3_MEDIA_BUCKET_NAME,
  AWS_MEDIA_ACCESS_KEY: process.env.AWS_MEDIA_ACCESS_KEY,
  AWS_MEDIA_SECRET_KEY: process.env.AWS_MEDIA_SECRET_KEY,
  JWT_SECRET: process.env.JWT_SECRET
}

const prod = {
  API_URL: `http://localhost:${process.env.PORT}/`,
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/',
  JWT_VALIDITY: '90d',
  JWT_SECRET: process.env.JWT_SECRET,
  LOGIN_HARD_LIMIT_ADMIN: 5,
  LOGIN_HARD_LIMIT: 1,
  S3_MEDIA_BUCKET_NAME: process.env.S3_MEDIA_BUCKET_NAME,
  AWS_MEDIA_ACCESS_KEY: process.env.AWS_MEDIA_ACCESS_KEY,
  AWS_MEDIA_SECRET_KEY: process.env.AWS_MEDIA_SECRET_KEY
}

module.exports = (process.env.NODE_ENV === 'production') ? prod : dev
