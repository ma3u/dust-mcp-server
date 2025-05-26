import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get max file size from environment or use default (10MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Note: User authentication will be implemented in Milestone 2
    // For now, all files go to the 'anonymous' directory
    const userDir = path.join(UPLOAD_DIR, 'anonymous');

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with original extension
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check file type
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain',
    'application/json',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Error handling middleware for multer errors
 */
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File too large',
          message: `File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file',
          message: 'Field name does not match the expected field name',
        });
      default:
        return res.status(400).json({
          error: 'Upload failed',
          message: err.message,
        });
    }
  } else if (err) {
    // Handle other errors
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }

  // No error, continue
  next();
};

/**
 * Middleware to add file metadata to request
 */
export const addFileMetadata = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return next();
  }

  // Add file metadata to request
  (req as any).fileMetadata = {
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedAt: new Date(),
    userId: 'anonymous', // User authentication will be implemented in Milestone 2
  };

  next();
};

/**
 * Function to get file path from file ID
 * @param fileId File ID
 * @param userId User ID (defaults to 'anonymous' until Milestone 2 implements authentication)
 * @returns Full path to the file
 */
export const getFilePath = (
  fileId: string,
  userId: string = 'anonymous'
): string => {
  // Get all files in user directory
  const userDir = path.join(UPLOAD_DIR, userId);

  if (!fs.existsSync(userDir)) {
    throw new Error(`User directory not found: ${userDir}`);
  }

  const files = fs.readdirSync(userDir);

  // Find file with matching ID (filename without extension)
  const file = files.find((f) => path.basename(f, path.extname(f)) === fileId);

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  return path.join(userDir, file);
};

/**
 * Function to delete a file
 * @param fileId File ID
 * @param userId User ID (defaults to 'anonymous' until Milestone 2 implements authentication)
 * @returns true if file was deleted, false otherwise
 */
export const deleteFile = (
  fileId: string,
  userId: string = 'anonymous'
): boolean => {
  try {
    const filePath = getFilePath(fileId, userId);
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    // [MCP POLICY] STDIO logging is disabled. Error is ignored or only logged to file.
    return false;
  }
};
