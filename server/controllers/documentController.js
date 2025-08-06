const Document = require('../models/Document');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

// @desc    Upload new document
// @route   POST /api/documents/upload
// @access  Private (Admin only)
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, description, requiredSignatures, priority, dueDate, tags } = req.body;

    // Parse required signatures (should be array of user IDs)
    let parsedRequiredSignatures = [];
    if (requiredSignatures) {
      try {
        parsedRequiredSignatures = JSON.parse(requiredSignatures);
      } catch (error) {
        parsedRequiredSignatures = [requiredSignatures];
      }
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (error) {
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }

    const document = await Document.create({
      title,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filePath: req.file.path,
      uploadedBy: req.user.id,
      requiredSignatures: parsedRequiredSignatures,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: parsedTags
    });

    // Populate the document with user details
    await document.populate('uploadedBy', 'firstName lastName email');
    await document.populate('requiredSignatures', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    
    // Delete uploaded file if document creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error uploading document'
    });
  }
};

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'councilor') {
      query.requiredSignatures = req.user.id;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('requiredSignatures', 'firstName lastName email')
      .populate('signatures.userId', 'firstName lastName email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching documents'
    });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('requiredSignatures', 'firstName lastName email')
      .populate('signatures.userId', 'firstName lastName email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check access rights
    if (req.user.role === 'councilor') {
      const hasAccess = document.requiredSignatures.some(
        user => user._id.toString() === req.user.id
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this document'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching document'
    });
  }
};

// @desc    Sign document
// @route   POST /api/documents/:id/sign
// @access  Private (Councilor)
const signDocument = async (req, res) => {
  try {
    const { signatureData } = req.body;
    
    if (!signatureData) {
      return res.status(400).json({
        success: false,
        message: 'Signature data is required'
      });
    }

    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is required to sign this document
    const isRequiredSigner = document.requiredSignatures.includes(req.user.id);
    if (!isRequiredSigner) {
      return res.status(403).json({
        success: false,
        message: 'You are not required to sign this document'
      });
    }

    // Check if user has already signed
    const hasAlreadySigned = document.signatures.some(
      sig => sig.userId.toString() === req.user.id
    );
    
    if (hasAlreadySigned) {
      return res.status(400).json({
        success: false,
        message: 'You have already signed this document'
      });
    }

    // Add signature
    document.signatures.push({
      userId: req.user.id,
      userName: req.user.fullName,
      signatureData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    // Update document status
    if (document.signatures.length >= document.requiredSignatures.length) {
      document.status = 'completed';
    } else if (document.status === 'pending') {
      document.status = 'in_progress';
    }

    await document.save();

    // Populate the document for response
    await document.populate('uploadedBy', 'firstName lastName email');
    await document.populate('requiredSignatures', 'firstName lastName email');
    await document.populate('signatures.userId', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Document signed successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Sign document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error signing document'
    });
  }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check access rights
    if (req.user.role === 'councilor') {
      const hasAccess = document.requiredSignatures.includes(req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this document'
        });
      }
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading document'
    });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private (Admin only)
const updateDocument = async (req, res) => {
  try {
    const { title, description, requiredSignatures, priority, dueDate, tags, status } = req.body;
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Update fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (requiredSignatures) document.requiredSignatures = requiredSignatures;
    if (priority) document.priority = priority;
    if (dueDate) document.dueDate = new Date(dueDate);
    if (tags) document.tags = tags;
    if (status) document.status = status;

    await document.save();

    // Populate for response
    await document.populate('uploadedBy', 'firstName lastName email');
    await document.populate('requiredSignatures', 'firstName lastName email');
    await document.populate('signatures.userId', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating document'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (Admin only)
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting document'
    });
  }
};

// @desc    Get document statistics
// @route   GET /api/documents/stats
// @access  Private (Admin only)
const getDocumentStats = async (req, res) => {
  try {
    const stats = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Document.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalDocuments = await Document.countDocuments();
    const completedDocuments = await Document.countDocuments({ status: 'completed' });
    const pendingDocuments = await Document.countDocuments({ status: 'pending' });
    const inProgressDocuments = await Document.countDocuments({ status: 'in_progress' });

    res.status(200).json({
      success: true,
      data: {
        total: totalDocuments,
        completed: completedDocuments,
        pending: pendingDocuments,
        inProgress: inProgressDocuments,
        statusStats: stats,
        priorityStats
      }
    });
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching document statistics'
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  signDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats
};