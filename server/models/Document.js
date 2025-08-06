const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  signatureData: {
    type: String, // Base64 encoded signature
    required: true
  },
  signedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  }
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  signatures: [signatureSchema],
  requiredSignatures: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  version: {
    type: Number,
    default: 1
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for completion percentage
documentSchema.virtual('completionPercentage').get(function() {
  if (this.requiredSignatures.length === 0) return 0;
  return Math.round((this.signatures.length / this.requiredSignatures.length) * 100);
});

// Virtual for checking if document is fully signed
documentSchema.virtual('isFullySigned').get(function() {
  return this.signatures.length >= this.requiredSignatures.length;
});

// Index for better query performance
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ 'requiredSignatures': 1 });
documentSchema.index({ status: 1, createdAt: -1 });

// Ensure virtual fields are serialised
documentSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Document', documentSchema);