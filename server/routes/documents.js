const express = require('express');
const { body } = require('express-validator');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  signDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const signDocumentValidation = [
  body('signatureData').notEmpty().withMessage('Signature data is required')
];

// Public routes (none)

// Protected routes
router.use(protect);

// Routes for all authenticated users
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);
router.post('/:id/sign', signDocumentValidation, signDocument);

// Admin only routes
router.post('/upload', authorize('admin'), upload.single('document'), handleMulterError, uploadDocument);
router.put('/:id', authorize('admin'), updateDocument);
router.delete('/:id', authorize('admin'), deleteDocument);
router.get('/stats/overview', authorize('admin'), getDocumentStats);

module.exports = router;