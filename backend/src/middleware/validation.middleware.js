const { z } = require('zod');

/**
 * Sanitizes free-text questions to strip non-printable ASCII control characters
 * while preserving standard whitespace, newlines, and unicode text.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  // Remove non-printable control characters (except newline, tab, carriage return)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function extractErrorMessages(error) {
  const issues = error.issues || error.errors || [];
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map(e => {
      const pathStr = Array.isArray(e.path) && e.path.length > 0 ? `${e.path.join('.')}: ` : '';
      return `${pathStr}${e.message}`;
    });
  }
  return [error.message || 'Validation failed'];
}

/**
 * Higher-order middleware to validate req.body against a Zod schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed; // replace with sanitized & validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError || error.issues) {
        const errorMessages = extractErrorMessages(error);
        return res.status(400).json({
          error: 'Invalid request payload',
          details: errorMessages
        });
      }
      return res.status(400).json({ error: 'Malformed request data' });
    }
  };
}

/**
 * Higher-order middleware to validate req.params against a Zod schema
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError || error.issues) {
        const errorMessages = extractErrorMessages(error);
        return res.status(400).json({
          error: 'Invalid path parameters',
          details: errorMessages
        });
      }
      return res.status(400).json({ error: 'Malformed path parameters' });
    }
  };
}

/**
 * Higher-order middleware to validate req.query against a Zod schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError || error.issues) {
        const errorMessages = extractErrorMessages(error);
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: errorMessages
        });
      }
      return res.status(400).json({ error: 'Malformed query parameters' });
    }
  };
}

// -------------------------------------------------------------
// Schemas
// -------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address format').max(255, 'Email must not exceed 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password must not exceed 128 characters'),
  name: z.string().trim().max(100, 'Name must not exceed 100 characters').optional()
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format').max(255, 'Email must not exceed 255 characters'),
  password: z.string().min(1, 'Password is required').max(128, 'Password must not exceed 128 characters')
});

const engineerQuerySchema = z.object({
  question: z.string().optional(),
  prompt: z.string().optional(),
  session: z.string().trim().max(100).optional().nullable(),
  session_id: z.string().trim().max(100).optional().nullable(),
  driver_id: z.string().trim().max(50).optional().nullable(),
  grand_prix: z.string().trim().max(100).optional().nullable(),
  season: z.union([z.number(), z.string()]).optional().nullable(),
  conversation_id: z.string().trim().max(100).optional().nullable(),
  context: z.record(z.any()).optional()
}).refine(data => {
  const q = data.question || data.prompt;
  return typeof q === 'string' && q.trim().length >= 2;
}, {
  message: 'Question or prompt is required and must be at least 2 characters',
  path: ['question']
}).refine(data => {
  const q = data.question || data.prompt;
  const sanitized = sanitizeText(q);
  return sanitized.length <= 2000;
}, {
  message: 'Question text exceeds maximum length limit of 2,000 characters',
  path: ['question']
}).transform(data => {
  const rawText = data.question || data.prompt;
  const sanitized = sanitizeText(rawText);
  return {
    ...data,
    question: sanitized,
    prompt: sanitized
  };
});

const strategyQuerySchema = z.object({
  question: z.string({ required_error: 'Question is required for strategy queries' })
    .transform(sanitizeText)
    .refine(val => val.length >= 2, 'Question must be at least 2 characters')
    .refine(val => val.length <= 2000, 'Question text exceeds maximum length limit of 2,000 characters'),
  session: z.string().trim().max(100).optional().nullable(),
  session_id: z.string().trim().max(100).optional().nullable(),
  driver_id: z.string().trim().max(50).optional().nullable(),
  grand_prix: z.string().trim().max(100).optional().nullable(),
  season: z.union([z.number(), z.string()]).optional().nullable(),
  conversation_id: z.string().trim().max(100).optional().nullable(),
  context: z.record(z.any()).optional()
});

const ghostBattleDataSchema = z.object({
  session_id: z.string().trim().min(1, 'session_id is required').max(100, 'session_id too long'),
  driver_ids: z.array(z.string().trim().min(1).max(50))
    .min(2, 'Minimum 2 drivers required')
    .max(22, 'Maximum 22 drivers allowed')
});

const sessionLoadSchema = z.object({
  year: z.union([z.number().int().min(1950).max(2030), z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number')]),
  gp: z.string().trim().min(1, 'Grand Prix name is required').max(100, 'Grand Prix name too long'),
  session: z.string().trim().min(1, 'Session type is required').max(50, 'Session type too long')
});

const uuidParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Valid investigation UUID is required')
});

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  sanitizeText,
  registerSchema,
  loginSchema,
  engineerQuerySchema,
  strategyQuerySchema,
  ghostBattleDataSchema,
  sessionLoadSchema,
  uuidParamSchema
};
