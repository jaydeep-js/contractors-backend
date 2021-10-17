const mongoose = require('mongoose')
const Schema = mongoose.Schema

const checkListSchema = new Schema({
  sTitle: { type: String, required: true, trim: true },
  sImage: { type: String },
  eMediaType: { type: String, enum: ['P', 'V'], default: 'P' },
  bIsActive: { type: Boolean, default: true },
  bIsOptional: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

module.exports = mongoose.model('CheckList', checkListSchema)
