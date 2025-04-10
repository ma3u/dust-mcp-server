import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
    throw new Error('Failed to create uploads directory');
  }
}

export default (server: McpServer) => {
  // Define file upload tool
  server.tool(
    "upload_document",
    "Upload a document (PDF or image) for processing",
    {
      fileContent: z.string({
        description: "Base64-encoded file content"
      }),
      fileName: z.string({
        description: "Original file name with extension (e.g., 'lab_results.pdf')"
      }),
      fileType: z.enum(["report", "correspondence", "data_analysis", "general"], {
        description: "Type of document being uploaded"
      }),
      description: z.string({
        description: "Brief description of the document"
      }).optional()
    },
    async (params) => {
      try {
        // Ensure uploads directory exists
        await ensureUploadsDir();
        
        // Decode base64 content
        const fileBuffer = Buffer.from(params.fileContent, 'base64');
        
        // Generate a unique ID for the file
        const documentId = uuidv4();
        
        // Get file extension
        const fileExtension = path.extname(params.fileName);
        
        // Create a unique filename
        const uniqueFileName = `${documentId}${fileExtension}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFileName);
        
        // Calculate file hash for integrity verification
        const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
        
        // Write the file to disk
        await fs.writeFile(filePath, fileBuffer);
        
        // Create metadata for the file
        const metadata = {
          documentId,
          originalName: params.fileName,
          fileType: params.fileType,
          description: params.description || '',
          filePath,
          fileSize: fileBuffer.length,
          fileHash,
          uploadDate: new Date().toISOString(),
          processingStatus: 'pending'
        };
        
        // Save metadata to a JSON file
        const metadataPath = path.join(UPLOADS_DIR, `${documentId}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Return success response
        return {
          content: [{
            type: "text",
            text: `Document uploaded successfully. Document ID: ${documentId}`
          }],
          metadata: {
            documentId,
            fileName: params.fileName,
            fileType: params.fileType,
            fileSize: fileBuffer.length,
            uploadDate: metadata.uploadDate
          }
        };
      } catch (error) {
        console.error('Error uploading document:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to upload document: ${errorMessage}`);
      }
    }
  );

  // Define document list tool
  server.tool(
    "list_documents",
    "List all uploaded documents",
    {
      fileType: z.enum(["report", "correspondence", "data_analysis", "general", "all"], {
        description: "Type of documents to list"
      }).optional(),
      limit: z.number({
        description: "Maximum number of documents to return"
      }).optional(),
      sortBy: z.enum(["uploadDate", "fileName", "fileSize"], {
        description: "Field to sort by"
      }).optional()
    },
    async (params) => {
      try {
        // Ensure uploads directory exists
        await ensureUploadsDir();
        
        // Read all JSON metadata files
        const files = await fs.readdir(UPLOADS_DIR);
        const metadataFiles = files.filter(file => file.endsWith('.json'));
        
        // Read and parse each metadata file
        const documents = await Promise.all(
          metadataFiles.map(async (file) => {
            const metadataPath = path.join(UPLOADS_DIR, file);
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            return JSON.parse(metadataContent);
          })
        );
        
        // Filter by file type if specified
        let filteredDocuments = documents;
        if (params.fileType && params.fileType !== 'all') {
          filteredDocuments = documents.filter(doc => doc.fileType === params.fileType);
        }
        
        // Sort documents
        const sortField = params.sortBy || 'uploadDate';
        filteredDocuments.sort((a, b) => {
          if (sortField === 'uploadDate') {
            return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
          } else if (sortField === 'fileName') {
            return a.originalName.localeCompare(b.originalName);
          } else if (sortField === 'fileSize') {
            return b.fileSize - a.fileSize;
          }
          return 0;
        });
        
        // Apply limit if specified
        if (params.limit && params.limit > 0) {
          filteredDocuments = filteredDocuments.slice(0, params.limit);
        }
        
        // Format documents for display
        const formattedDocuments = filteredDocuments.map(doc => ({
          documentId: doc.documentId,
          fileName: doc.originalName,
          fileType: doc.fileType,
          description: doc.description,
          fileSize: `${(doc.fileSize / 1024).toFixed(2)} KB`,
          uploadDate: doc.uploadDate,
          processingStatus: doc.processingStatus
        }));
        
        // Return documents list
        return {
          content: [{
            type: "text",
            text: `Found ${formattedDocuments.length} document(s).`
          }],
          metadata: {
            documents: formattedDocuments,
            totalCount: formattedDocuments.length,
            fileType: params.fileType || 'all',
            sortBy: sortField
          }
        };
      } catch (error) {
        console.error('Error listing documents:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to list documents: ${errorMessage}`);
      }
    }
  );
}
