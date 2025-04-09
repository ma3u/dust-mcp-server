# Decision Record: SDK Integration and File Upload Processing

## Date

2025-04-09

## Context

The MCP server needs to integrate with existing SDKs rather than creating custom API interfaces. Additionally, instead of direct health device integration, we'll implement file upload capabilities for health data in PDF or image formats.

## SDK Integration Strategy

### Overview

We will leverage existing SDKs to minimize development effort and ensure compatibility with established systems:

1. **MCP TypeScript SDK**: For implementing the Model Context Protocol
2. **Dust.tt SDK**: For agent communication and configuration
3. **Express.js**: For HTTP/SSE transport and file upload handling

We already created the MCP basic code with the MCP tool. Please use the tool as in README described.

### Integration Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        MCP Server                             │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ MCP TypeScript  │  │ Express.js      │  │ File Upload     ││
│  │ SDK Integration │  │ Integration     │  │ Processing      ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Core Service Layer                         │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Tool Management │  │ Session Manager │  │ PDF/Image       ││
│  │                 │  │                 │  │ Processor       ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Dust Integration Layer                     │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Dust.tt SDK     │  │ Agent Context   │  │ Response        ││
│  │ Integration     │  │ Builder         │  │ Formatter       ││
│  │                 │  │                 │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

## SDK Implementation Details

### 1. MCP TypeScript SDK Integration

We will use the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) to implement the Model Context Protocol.

```typescript
import { createServer, Tool, ToolCall } from '@modelcontextprotocol/sdk';

// Initialize MCP server
const server = createServer({
  name: 'Health Data MCP Server',
  version: '1.0.0',
  description: 'MCP server for health data processing and Dust agent integration'
});

// Register tools
server.tool(
  'process_health_document',
  'Process a health document (PDF or image)',
  {
    documentId: z.string({
      description: 'ID of the uploaded document'
    }),
    documentType: z.enum(['lab_report', 'medical_record', 'nutrition_log']),
    options: z.object({
      extractText: z.boolean().optional(),
      performOCR: z.boolean().optional(),
      highlightAbnormal: z.boolean().optional()
    }).optional()
  },
  async (params) => {
    // Implementation using document processing service
  }
);

// Start the server
server.listen(process.env.PORT || 3000);
```

### 2. Dust.tt SDK Integration

We will use the Dust.tt SDK to communicate with Dust agents.

```typescript
import { DustAPI } from '@dust-tt/dust-sdk';

// Initialize Dust client
const dustClient = new DustAPI({
  apiKey: process.env.DUST_API_KEY!,
  workspaceId: process.env.DUST_WORKSPACE_ID!
});

// Example function to interact with a Dust agent
async function queryHealthAgent(agentId: string, message: string, context: any) {
  try {
    const response = await dustClient.runAgent({
      agentId,
      input: {
        message,
        context
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error querying Dust agent:', error);
    throw new Error('Failed to communicate with health agent');
  }
}
```

### 3. Express.js Integration for File Upload

We will use Express.js with Multer for handling file uploads.

```typescript
import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

// File filter
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
  }
};

// Initialize upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const documentId = path.basename(req.file.filename, path.extname(req.file.filename));
    
    // Queue document for processing
    await documentProcessingQueue.add({
      documentId,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      userId: req.user.id
    });
    
    return res.status(200).json({
      documentId,
      status: 'processing',
      message: 'Document uploaded and queued for processing'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
});
```

## File Processing Pipeline

### Document Processing Flow

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  User Uploads    │────▶│  Document     │────▶│ File Type     │
│  PDF/Image       │     │  Storage      │     │ Detection     │
│                  │     └───────────────┘     └───────┬───────┘
└──────────────────┘                                   │
                                                      │
                   ┌─────────────────────────────────┐│
                   │                                 ││
                   ▼                                 ▼│
┌──────────────────┐     ┌───────────────┐     ┌──────▼───────┐
│                  │     │               │     │              │
│  PDF Text        │     │ OCR Processing│◀────│ Image        │
│  Extraction      │     │ (Tesseract)   │     │ Processing   │
│                  │     └───────┬───────┘     └──────────────┘
└────────┬─────────┘             │
         │                       │
         ▼                       ▼
┌────────▼───────────────────────▼───────┐
│                                        │
│  Text Normalization & Cleaning         │
│                                        │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│                                        │
│  Document Classification               │
│  (Lab Report, Medical Record, etc.)    │
│                                        │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│                                        │
│  Information Extraction                │
│  (Based on document type)              │
│                                        │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│                                        │
│  Data Structuring & Storage            │
│                                        │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│                                        │
│  Dust Agent Context Preparation        │
│                                        │
└────────────────────────────────────────┘
```

### Document Processing Implementation

```typescript
import * as pdf from 'pdf-parse';
import * as fs from 'fs/promises';
import { createWorker } from 'tesseract.js';
import { classify, extractInformation } from './document-processors';

interface DocumentProcessingJob {
  documentId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
  userId: string;
}

class DocumentProcessor {
  async processDocument(job: DocumentProcessingJob): Promise<any> {
    try {
      let text: string;
      
      // Extract text based on file type
      if (job.mimeType === 'application/pdf') {
        text = await this.extractPdfText(job.filePath);
      } else if (job.mimeType.startsWith('image/')) {
        text = await this.performOCR(job.filePath);
      } else {
        throw new Error(`Unsupported file type: ${job.mimeType}`);
      }
      
      // Clean and normalize text
      const normalizedText = this.normalizeText(text);
      
      // Classify document
      const documentType = await classify(normalizedText);
      
      // Extract structured information
      const extractedData = await extractInformation(normalizedText, documentType);
      
      // Store processed data
      await this.storeProcessedData(job.userId, job.documentId, documentType, extractedData);
      
      return {
        documentId: job.documentId,
        documentType,
        extractedData
      };
    } catch (error) {
      console.error(`Error processing document ${job.documentId}:`, error);
      throw error;
    }
  }
  
  private async extractPdfText(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
  
  private async performOCR(filePath: string): Promise<string> {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    
    return text;
  }
  
  private normalizeText(text: string): string {
    // Remove excessive whitespace
    let normalized = text.replace(/\s+/g, ' ').trim();
    
    // Remove page numbers and headers/footers
    normalized = normalized.replace(/Page \d+ of \d+/gi, '');
    
    // Additional normalization logic...
    
    return normalized;
  }
  
  private async storeProcessedData(userId: string, documentId: string, documentType: string, data: any): Promise<void> {
    // Implementation to store in database
  }
}
```

### Document Classification and Information Extraction

```typescript
// Example implementation for lab report classification and extraction
export async function classify(text: string): Promise<string> {
  // Simple rule-based classification
  if (/blood test|complete blood count|metabolic panel|lipid panel/i.test(text)) {
    return 'lab_report';
  } else if (/medical record|patient history|clinical notes/i.test(text)) {
    return 'medical_record';
  } else if (/nutrition|food log|dietary|meal plan/i.test(text)) {
    return 'nutrition_log';
  } else {
    return 'unknown';
  }
}

export async function extractInformation(text: string, documentType: string): Promise<any> {
  switch (documentType) {
    case 'lab_report':
      return extractLabReportData(text);
    case 'medical_record':
      return extractMedicalRecordData(text);
    case 'nutrition_log':
      return extractNutritionLogData(text);
    default:
      return { rawText: text };
  }
}

function extractLabReportData(text: string): any {
  const results: any = {
    tests: [],
    patient: {},
    date: null,
    lab: null
  };
  
  // Extract date using regex
  const dateMatch = text.match(/(?:Date|Collected|Reported):\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (dateMatch) {
    results.date = dateMatch[1];
  }
  
  // Extract patient information
  const patientMatch = text.match(/(?:Patient|Name):\s*([A-Za-z\s,]+)/i);
  if (patientMatch) {
    results.patient.name = patientMatch[1].trim();
  }
  
  // Extract test results using regex patterns
  const testPatterns = [
    // Glucose pattern
    {
      name: 'Glucose',
      pattern: /Glucose[:\s]+(\d+(?:\.\d+)?)\s*(mg\/dL|mmol\/L)/i,
      process: (matches: RegExpMatchArray) => ({
        name: 'Glucose',
        value: parseFloat(matches[1]),
        unit: matches[2],
        referenceRange: extractReferenceRange(text, 'Glucose')
      })
    },
    // Cholesterol pattern
    {
      name: 'Cholesterol',
      pattern: /(?:Total )?Cholesterol[:\s]+(\d+(?:\.\d+)?)\s*(mg\/dL|mmol\/L)/i,
      process: (matches: RegExpMatchArray) => ({
        name: 'Cholesterol',
        value: parseFloat(matches[1]),
        unit: matches[2],
        referenceRange: extractReferenceRange(text, 'Cholesterol')
      })
    },
    // Add more test patterns...
  ];
  
  // Process each test pattern
  for (const testPattern of testPatterns) {
    const match = text.match(testPattern.pattern);
    if (match) {
      results.tests.push(testPattern.process(match));
    }
  }
  
  return results;
}

function extractReferenceRange(text: string, testName: string): { low?: number, high?: number } {
  // Look for reference range near the test name
  const rangeRegex = new RegExp(
    `${testName}[^\\n]*?(?:Reference Range|Normal Range|Range):\\s*(\\d+(?:\\.\\d+)?)\\s*-\\s*(\\d+(?:\\.\\d+)?)`,
    'i'
  );
  
  const match = text.match(rangeRegex);
  if (match) {
    return {
      low: parseFloat(match[1]),
      high: parseFloat(match[2])
    };
  }
  
  return {};
}

// Similar functions for other document types...
```

## MCP Tool Integration

### Document Processing Tool

```typescript
server.tool(
  'process_health_document',
  'Process a health document (PDF or image)',
  {
    documentId: z.string({
      description: 'ID of the uploaded document'
    }),
    documentType: z.enum(['lab_report', 'medical_record', 'nutrition_log']),
    options: z.object({
      extractText: z.boolean().optional(),
      performOCR: z.boolean().optional(),
      highlightAbnormal: z.boolean().optional()
    }).optional()
  },
  async (params) => {
    const documentProcessor = new DocumentProcessor();
    
    // Retrieve document information
    const documentInfo = await documentRepository.findById(params.documentId);
    
    if (!documentInfo) {
      throw new Error(`Document not found: ${params.documentId}`);
    }
    
    // Process the document
    const result = await documentProcessor.processDocument({
      documentId: params.documentId,
      filePath: documentInfo.filePath,
      mimeType: documentInfo.mimeType,
      originalName: documentInfo.originalName,
      userId: documentInfo.userId
    });
    
    return {
      content: [{
        type: "text",
        text: `Document processed successfully. Found ${result.extractedData.tests?.length || 0} test results.`
      }],
      metadata: {
        documentId: params.documentId,
        documentType: result.documentType,
        extractedData: result.extractedData
      }
    };
  }
);
```

### Dust Agent Query Tool

```typescript
server.tool(
  'query_health_agent',
  'Query a Dust health agent with document context',
  {
    agentId: z.string({
      description: 'ID of the Dust agent to query'
    }),
    documentId: z.string({
      description: 'ID of the processed document to use as context'
    }),
    query: z.string({
      description: 'Question or query for the agent'
    })
  },
  async (params) => {
    // Retrieve processed document
    const processedDocument = await documentRepository.findProcessedById(params.documentId);
    
    if (!processedDocument) {
      throw new Error(`Processed document not found: ${params.documentId}`);
    }
    
    // Build context for the agent
    const context = {
      documentType: processedDocument.documentType,
      extractedData: processedDocument.extractedData,
      metadata: processedDocument.metadata
    };
    
    // Query the Dust agent
    const response = await queryHealthAgent(
      params.agentId,
      params.query,
      context
    );
    
    return {
      content: [{
        type: "text",
        text: response.output
      }],
      metadata: {
        agentId: params.agentId,
        documentId: params.documentId,
        query: params.query
      }
    };
  }
);
```

## Security and Privacy Considerations

### File Upload Security

1. **File Validation**
   - Validate file types and extensions
   - Implement size limits
   - Scan for malware

2. **Storage Security**
   - Use secure file permissions
   - Generate random filenames
   - Implement access controls

3. **Processing Isolation**
   - Run processing in isolated environments
   - Implement timeouts for processing
   - Handle errors gracefully

### Data Privacy

1. **Document Storage**
   - Encrypt sensitive documents
   - Implement retention policies
   - Support secure deletion

2. **Access Controls**
   - Restrict access to uploaded documents
   - Implement user-based permissions
   - Maintain access logs

3. **Data Minimization**
   - Extract only necessary information
   - Anonymize data when possible
   - Implement purpose limitation

## Decision

Based on the SDK integration and file upload processing design, we will:

1. Use the official MCP TypeScript SDK for protocol implementation
2. Integrate with the Dust.tt SDK for agent communication
3. Implement Express.js with Multer for file uploads
4. Create a document processing pipeline for PDFs and images
5. Develop MCP tools for document processing and agent queries
6. Implement security and privacy measures for file handling

## Consequences

- Using existing SDKs reduces development effort and ensures compatibility
- File upload approach provides flexibility for users to submit health data
- Document processing pipeline extracts structured data from unstructured documents
- Security measures protect sensitive health information
- Integration with Dust agents enables natural language health interactions

## Open Questions

- How will we handle documents with poor quality or formatting?
- What's the optimal approach for scaling document processing?
- How should we validate the accuracy of extracted information?

## References

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/mcp-sdk-typescript)
- [Dust.tt SDK Documentation](https://docs.dust.tt)
- [Express.js Multer Documentation](https://github.com/expressjs/multer)
