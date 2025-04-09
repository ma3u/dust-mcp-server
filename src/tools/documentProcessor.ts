import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Path to uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

// Ensure processed directory exists
async function ensureProcessedDir() {
  try {
    await fs.mkdir(PROCESSED_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating processed directory:', error);
    throw new Error('Failed to create processed directory');
  }
}

// Mock function for text extraction (in a real implementation, this would use OCR or PDF parsing libraries)
async function extractTextFromDocument(filePath: string, fileExtension: string): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // - For PDFs: Use a library like pdf-parse
  // - For images: Use OCR like Tesseract.js
  
  // For now, we'll return a mock response based on file type
  if (fileExtension.toLowerCase() === '.pdf') {
    return `[Mock PDF extraction] This document appears to contain lab results for various health metrics including cholesterol, glucose, and vitamin levels.`;
  } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension.toLowerCase())) {
    return `[Mock image OCR] Medical report showing patient vitals and doctor's notes regarding recent examination.`;
  } else {
    return `[Mock text extraction] Health document content extracted from ${path.basename(filePath)}.`;
  }
}

// Mock function for document classification
async function classifyDocument(text: string): Promise<string> {
  // In a real implementation, this would use NLP or ML to classify the document
  
  // Simple keyword-based classification for demonstration
  if (text.includes('lab results') || text.includes('cholesterol') || text.includes('glucose')) {
    return 'lab_report';
  } else if (text.includes('medical report') || text.includes('examination') || text.includes('doctor')) {
    return 'medical_record';
  } else if (text.includes('nutrition') || text.includes('diet') || text.includes('food')) {
    return 'nutrition_log';
  } else {
    return 'unknown';
  }
}

// Mock function for information extraction
async function extractInformation(text: string, documentType: string): Promise<any> {
  // In a real implementation, this would use NLP or ML to extract structured information
  
  // Return different mock data based on document type
  if (documentType === 'lab_report') {
    return {
      metrics: [
        { name: 'Total Cholesterol', value: '185', unit: 'mg/dL', reference: '< 200 mg/dL' },
        { name: 'HDL Cholesterol', value: '55', unit: 'mg/dL', reference: '> 40 mg/dL' },
        { name: 'LDL Cholesterol', value: '110', unit: 'mg/dL', reference: '< 130 mg/dL' },
        { name: 'Triglycerides', value: '120', unit: 'mg/dL', reference: '< 150 mg/dL' },
        { name: 'Glucose', value: '95', unit: 'mg/dL', reference: '70-99 mg/dL' }
      ],
      date: '2025-03-15',
      labName: 'HealthLab Services'
    };
  } else if (documentType === 'medical_record') {
    return {
      vitals: {
        bloodPressure: '120/80 mmHg',
        heartRate: '72 bpm',
        temperature: '98.6 °F',
        respiratoryRate: '16 breaths/min',
        oxygenSaturation: '98%'
      },
      diagnosis: 'Routine check-up, no significant findings',
      recommendations: 'Continue current health regimen, follow up in 6 months',
      date: '2025-03-20',
      provider: 'Dr. Smith'
    };
  } else if (documentType === 'nutrition_log') {
    return {
      meals: [
        { time: 'Breakfast', foods: ['Oatmeal', 'Blueberries', 'Almond milk'], calories: 320 },
        { time: 'Lunch', foods: ['Grilled chicken salad', 'Olive oil dressing'], calories: 450 },
        { time: 'Dinner', foods: ['Salmon', 'Quinoa', 'Steamed vegetables'], calories: 520 }
      ],
      totalCalories: 1290,
      macros: {
        protein: '95g',
        carbs: '120g',
        fat: '45g'
      },
      date: '2025-03-22'
    };
  } else {
    return {
      content: text,
      extractionNote: 'Could not determine specific structure for this document type'
    };
  }
}

export default (server: McpServer) => {
  // Define document processing tool
  server.tool(
    "process_health_document",
    "Process a health document to extract and structure its information",
    {
      documentId: z.string({
        description: "ID of the document to process"
      })
    },
    async (params) => {
      try {
        // Ensure processed directory exists
        await ensureProcessedDir();
        
        // Get document metadata
        const metadataPath = path.join(UPLOADS_DIR, `${params.documentId}.json`);
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Check if file exists
        const filePath = metadata.filePath;
        await fs.access(filePath);
        
        // Get file extension
        const fileExtension = path.extname(metadata.originalName);
        
        // Extract text from document
        const extractedText = await extractTextFromDocument(filePath, fileExtension);
        
        // Classify document if not already specified
        const documentType = metadata.fileType || await classifyDocument(extractedText);
        
        // Extract structured information
        const extractedInfo = await extractInformation(extractedText, documentType);
        
        // Create processing result
        const processingResult = {
          documentId: params.documentId,
          originalName: metadata.originalName,
          fileType: documentType,
          extractedText,
          structuredData: extractedInfo,
          processingDate: new Date().toISOString(),
          processingStatus: 'completed'
        };
        
        // Save processing result
        const resultPath = path.join(PROCESSED_DIR, `${params.documentId}.json`);
        await fs.writeFile(resultPath, JSON.stringify(processingResult, null, 2));
        
        // Update original metadata
        metadata.processingStatus = 'completed';
        metadata.processingDate = processingResult.processingDate;
        metadata.fileType = documentType;
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Return success response
        return {
          content: [{
            type: "text",
            text: `Document processed successfully. Document type: ${documentType}`
          }],
          metadata: {
            documentId: params.documentId,
            fileName: metadata.originalName,
            fileType: documentType,
            processingStatus: 'completed',
            processingDate: processingResult.processingDate,
            extractedInfo
          }
        };
      } catch (error) {
        console.error('Error processing document:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to process document: ${errorMessage}`);
      }
    }
  );

  // Define document retrieval tool
  server.tool(
    "get_health_document",
    "Retrieve a processed health document by ID",
    {
      documentId: z.string({
        description: "ID of the document to retrieve"
      }),
      includeRawText: z.boolean({
        description: "Whether to include the raw extracted text in the response"
      }).optional()
    },
    async (params) => {
      try {
        // Check if document has been processed
        const processedPath = path.join(PROCESSED_DIR, `${params.documentId}.json`);
        let processedData;
        
        try {
          const processedContent = await fs.readFile(processedPath, 'utf8');
          processedData = JSON.parse(processedContent);
        } catch (error) {
          // If processed file doesn't exist, check if the document exists at all
          const metadataPath = path.join(UPLOADS_DIR, `${params.documentId}.json`);
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            return {
              content: [{
                type: "text",
                text: `Document exists but has not been processed yet. Use the process_health_document tool first.`
              }],
              metadata: {
                documentId: params.documentId,
                fileName: metadata.originalName,
                fileType: metadata.fileType,
                processingStatus: metadata.processingStatus || 'pending',
                uploadDate: metadata.uploadDate
              }
            };
          } catch (metadataError) {
            throw new Error(`Document with ID ${params.documentId} not found`);
          }
        }
        
        // Prepare response
        const responseData: {
          documentId: any;
          fileName: any;
          fileType: any;
          processingDate: any;
          structuredData: any;
          extractedText?: string;
        } = {
          documentId: processedData.documentId,
          fileName: processedData.originalName,
          fileType: processedData.fileType,
          processingDate: processedData.processingDate,
          structuredData: processedData.structuredData
        };
        
        // Include raw text if requested
        if (params.includeRawText) {
          // Add extractedText if it exists
          if ('extractedText' in processedData) {
            responseData.extractedText = processedData.extractedText;
          }
        }
        
        // Return document data
        return {
          content: [{
            type: "text",
            text: `Retrieved processed document: ${processedData.originalName} (Type: ${processedData.fileType})`
          }],
          metadata: responseData
        };
      } catch (error) {
        console.error('Error retrieving document:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to retrieve document: ${errorMessage}`);
      }
    }
  );
}
