const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['TODO', 'IN_PROGRESS', 'DONE'],
    default: 'TODO',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  type: {
    type: String,
    enum: ['Bug', 'Feature', 'Tech Debt'],
    default: 'Feature',
  },
  dueDate: {
    type: Date,
  },
  githubIssueUrl: {
    type: String,
    trim: true,
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true, // Crucial for multi-tenancy performance
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true, // Soft delete
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  activityCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Compound index on orgId and createdAt for efficient pagination
projectSchema.index({ orgId: 1, createdAt: -1 });

// Text index for Semantic Search and NLP Queries
projectSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
