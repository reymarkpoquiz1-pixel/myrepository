import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { db } from '../config/database';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createLegislationValidation = [
  body('type').isIn(['ordinance', 'resolution']).withMessage('Type must be ordinance or resolution'),
  body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required and must be under 500 characters'),
  body('subjectMatter').trim().isLength({ min: 1 }).withMessage('Subject matter is required'),
  body('classification').optional().isIn(['general', 'special', 'emergency', 'appropriation', 'revenue', 'other']),
  body('category').optional().isIn(['administrative', 'fiscal', 'social', 'economic', 'infrastructure', 'environmental', 'other']),
  body('termYear').isInt({ min: 2020, max: 2030 }).withMessage('Valid term year required'),
  body('hasPenalClause').optional().isBoolean(),
  body('committeeId').optional().isUUID().withMessage('Valid committee ID required')
];

const updateLegislationValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 500 }),
  body('subjectMatter').optional().trim().isLength({ min: 1 }),
  body('classification').optional().isIn(['general', 'special', 'emergency', 'appropriation', 'revenue', 'other']),
  body('category').optional().isIn(['administrative', 'fiscal', 'social', 'economic', 'infrastructure', 'environmental', 'other']),
  body('status').optional().isIn(['draft', 'first_reading', 'second_reading', 'approved', 'vetoed', 'enacted', 'archived']),
  body('hasPenalClause').optional().isBoolean(),
  body('committeeId').optional().isUUID()
];

const searchValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['ordinance', 'resolution']),
  query('status').optional().isIn(['draft', 'first_reading', 'second_reading', 'approved', 'vetoed', 'enacted', 'archived']),
  query('classification').optional().isIn(['general', 'special', 'emergency', 'appropriation', 'revenue', 'other']),
  query('category').optional().isIn(['administrative', 'fiscal', 'social', 'economic', 'infrastructure', 'environmental', 'other']),
  query('termYear').optional().isInt({ min: 2020, max: 2030 }),
  query('committeeId').optional().isUUID()
];

// Helper function to generate document number
const generateDocumentNumber = async (type: string, termYear: number): Promise<string> => {
  const prefix = type === 'ordinance' ? 'ORD' : 'RES';
  const year = termYear.toString().slice(-2);
  
  // Get count of existing documents for this type and year
  const count = await db('legislation')
    .where({ type, term_year: termYear })
    .count('* as count')
    .first();
  
  const sequence = (parseInt(count?.count as string || '0') + 1).toString().padStart(3, '0');
  return `${prefix}-${year}-${sequence}`;
};

// GET /api/legislation - Search and list legislation
router.get('/', optionalAuth, searchValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    page = 1,
    limit = 20,
    type,
    status,
    classification,
    category,
    termYear,
    committeeId,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  // Build query
  let query = db('legislation as l')
    .select(
      'l.*',
      'u.first_name as author_first_name',
      'u.last_name as author_last_name',
      'c.name as committee_name'
    )
    .leftJoin('users as u', 'l.author_id', 'u.id')
    .leftJoin('committees as c', 'l.committee_id', 'c.id');

  // Apply filters
  if (type) query = query.where('l.type', type);
  if (status) query = query.where('l.status', status);
  if (classification) query = query.where('l.classification', classification);
  if (category) query = query.where('l.category', category);
  if (termYear) query = query.where('l.term_year', termYear);
  if (committeeId) query = query.where('l.committee_id', committeeId);

  // Apply search
  if (search) {
    query = query.where(function() {
      this.where('l.title', 'ilike', `%${search}%`)
        .orWhere('l.subject_matter', 'ilike', `%${search}%`)
        .orWhere('l.document_number', 'ilike', `%${search}%`);
    });
  }

  // Get total count for pagination
  const countQuery = query.clone();
  const totalCount = await countQuery.count('* as count').first();

  // Apply sorting and pagination
  query = query
    .orderBy(`l.${sortBy}`, sortOrder as 'asc' | 'desc')
    .limit(parseInt(limit as string))
    .offset(offset);

  const legislation = await query;

  // Transform data
  const transformedLegislation = legislation.map(item => ({
    id: item.id,
    documentNumber: item.document_number,
    type: item.type,
    title: item.title,
    subjectMatter: item.subject_matter,
    summary: item.summary,
    classification: item.classification,
    category: item.category,
    status: item.status,
    author: item.author_first_name && item.author_last_name ? {
      id: item.author_id,
      name: `${item.author_first_name} ${item.author_last_name}`
    } : null,
    committee: item.committee_name ? {
      id: item.committee_id,
      name: item.committee_name
    } : null,
    termYear: item.term_year,
    sessionNumber: item.session_number,
    dates: {
      introduction: item.introduction_date,
      firstReading: item.first_reading_date,
      secondReading: item.second_reading_date,
      approval: item.approval_date,
      enactment: item.enactment_date,
      effectivity: item.effectivity_date
    },
    hasPenalClause: item.has_penal_clause,
    penalClause: item.penal_clause,
    remarks: item.remarks,
    fileUrl: item.file_url,
    watermarkFileUrl: item.watermark_file_url,
    version: item.version,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }));

  res.json({
    data: transformedLegislation,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: parseInt(totalCount?.count as string || '0'),
      totalPages: Math.ceil(parseInt(totalCount?.count as string || '0') / parseInt(limit as string))
    }
  });
}));

// GET /api/legislation/:id - Get specific legislation
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const legislation = await db('legislation as l')
    .select(
      'l.*',
      'u.first_name as author_first_name',
      'u.last_name as author_last_name',
      'u.position as author_position',
      'c.name as committee_name',
      'c.description as committee_description'
    )
    .leftJoin('users as u', 'l.author_id', 'u.id')
    .leftJoin('committees as c', 'l.committee_id', 'c.id')
    .where('l.id', id)
    .first();

  if (!legislation) {
    return res.status(404).json({ error: 'Legislation not found' });
  }

  // Get electronic signatures if any
  const signatures = await db('electronic_signatures')
    .select(
      'es.*',
      'u.first_name',
      'u.last_name',
      'u.position'
    )
    .leftJoin('users as u', 'es.signer_id', 'u.id')
    .where({
      'es.document_id': id,
      'es.document_type': 'legislation',
      'es.is_valid': true
    });

  const response = {
    id: legislation.id,
    documentNumber: legislation.document_number,
    type: legislation.type,
    title: legislation.title,
    subjectMatter: legislation.subject_matter,
    content: legislation.content,
    summary: legislation.summary,
    classification: legislation.classification,
    category: legislation.category,
    status: legislation.status,
    author: legislation.author_first_name && legislation.author_last_name ? {
      id: legislation.author_id,
      name: `${legislation.author_first_name} ${legislation.author_last_name}`,
      position: legislation.author_position
    } : null,
    committee: legislation.committee_name ? {
      id: legislation.committee_id,
      name: legislation.committee_name,
      description: legislation.committee_description
    } : null,
    termYear: legislation.term_year,
    sessionNumber: legislation.session_number,
    dates: {
      introduction: legislation.introduction_date,
      firstReading: legislation.first_reading_date,
      secondReading: legislation.second_reading_date,
      approval: legislation.approval_date,
      enactment: legislation.enactment_date,
      effectivity: legislation.effectivity_date
    },
    hasPenalClause: legislation.has_penal_clause,
    penalClause: legislation.penal_clause,
    remarks: legislation.remarks,
    fileUrl: legislation.file_url,
    watermarkFileUrl: legislation.watermark_file_url,
    version: legislation.version,
    signatures: signatures.map(sig => ({
      id: sig.id,
      signer: {
        id: sig.signer_id,
        name: `${sig.first_name} ${sig.last_name}`,
        position: sig.position
      },
      signatureType: sig.signature_type,
      signedAt: sig.signed_at
    })),
    createdAt: legislation.created_at,
    updatedAt: legislation.updated_at
  };

  res.json(response);
}));

// POST /api/legislation - Create new legislation
router.post('/', authMiddleware, requireRole(['admin', 'secretary', 'council_member']), createLegislationValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    type,
    title,
    subjectMatter,
    content,
    summary,
    classification,
    category,
    termYear,
    sessionNumber,
    hasPenalClause,
    penalClause,
    remarks,
    committeeId
  } = req.body;

  // Generate document number
  const documentNumber = await generateDocumentNumber(type, termYear);

  // Create legislation
  const [legislationId] = await db('legislation').insert({
    document_number: documentNumber,
    type,
    title,
    subject_matter: subjectMatter,
    content,
    summary,
    classification: classification || 'general',
    category: category || 'other',
    term_year: termYear,
    session_number: sessionNumber,
    has_penal_clause: hasPenalClause || false,
    penal_clause: penalClause,
    remarks,
    committee_id: committeeId,
    author_id: req.user!.id,
    created_by: req.user!.id,
    updated_by: req.user!.id
  }).returning('id');

  // Get created legislation
  const newLegislation = await db('legislation')
    .where('id', legislationId)
    .first();

  res.status(201).json({
    message: 'Legislation created successfully',
    legislation: {
      id: newLegislation.id,
      documentNumber: newLegislation.document_number,
      type: newLegislation.type,
      title: newLegislation.title,
      status: newLegislation.status
    }
  });
}));

// PUT /api/legislation/:id - Update legislation
router.put('/:id', authMiddleware, requireRole(['admin', 'secretary', 'council_member']), updateLegislationValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const updateData = req.body;

  // Check if legislation exists
  const existingLegislation = await db('legislation')
    .where('id', id)
    .first();

  if (!existingLegislation) {
    return res.status(404).json({ error: 'Legislation not found' });
  }

  // Check permissions (only author, admin, or secretary can edit)
  if (existingLegislation.author_id !== req.user!.id && 
      !['admin', 'secretary'].includes(req.user!.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to edit this legislation' });
  }

  // Update legislation
  await db('legislation')
    .where('id', id)
    .update({
      ...updateData,
      updated_by: req.user!.id,
      updated_at: new Date()
    });

  res.json({ message: 'Legislation updated successfully' });
}));

// DELETE /api/legislation/:id - Delete legislation (soft delete)
router.delete('/:id', authMiddleware, requireRole(['admin', 'secretary']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if legislation exists
  const legislation = await db('legislation')
    .where('id', id)
    .first();

  if (!legislation) {
    return res.status(404).json({ error: 'Legislation not found' });
  }

  // Soft delete by updating status to archived
  await db('legislation')
    .where('id', id)
    .update({
      status: 'archived',
      updated_by: req.user!.id,
      updated_at: new Date()
    });

  res.json({ message: 'Legislation archived successfully' });
}));

// GET /api/legislation/:id/track - Track legislation status
router.get('/:id/track', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const legislation = await db('legislation')
    .select('id', 'document_number', 'title', 'status', 'created_at')
    .where('id', id)
    .first();

  if (!legislation) {
    return res.status(404).json({ error: 'Legislation not found' });
  }

  // Get status history (you might want to create a separate table for this)
  const statusHistory = [
    {
      status: 'draft',
      date: legislation.created_at,
      description: 'Legislation created'
    }
  ];

  // Add other status dates if they exist
  if (legislation.status !== 'draft') {
    // You would query for actual status change dates here
    statusHistory.push({
      status: legislation.status,
      date: new Date(),
      description: `Status updated to ${legislation.status}`
    });
  }

  res.json({
    documentNumber: legislation.document_number,
    title: legislation.title,
    currentStatus: legislation.status,
    statusHistory
  });
}));

// GET /api/legislation/second-reading/list - Get ordinances ready for second reading
router.get('/second-reading/list', optionalAuth, asyncHandler(async (req, res) => {
  const { termYear } = req.query;

  let query = db('legislation as l')
    .select(
      'l.id',
      'l.document_number',
      'l.title',
      'l.subject_matter',
      'l.has_penal_clause',
      'l.penal_clause',
      'l.created_at',
      'u.first_name as author_first_name',
      'u.last_name as author_last_name'
    )
    .leftJoin('users as u', 'l.author_id', 'u.id')
    .where('l.type', 'ordinance')
    .where('l.status', 'first_reading');

  if (termYear) {
    query = query.where('l.term_year', termYear);
  }

  const ordinances = await query.orderBy('l.created_at', 'desc');

  const response = ordinances.map(ord => ({
    id: ord.id,
    documentNumber: ord.document_number,
    title: ord.title,
    subjectMatter: ord.subject_matter,
    hasPenalClause: ord.has_penal_clause,
    penalClause: ord.penal_clause,
    author: `${ord.author_first_name} ${ord.author_last_name}`,
    createdAt: ord.created_at
  }));

  res.json(response);
}));

export default router;