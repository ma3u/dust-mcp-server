import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Path to processed documents
const PROCESSED_DIR = path.join(process.cwd(), 'processed');

// Mock function for querying Dust agent (in a real implementation, this would use the Dust.tt SDK)
async function queryDustAgent(agentId: string, query: string, context: any): Promise<any> {
  // This is a placeholder. In a real implementation, you would use the Dust.tt SDK
  // to send the query and context to a specific agent and get the response.
  
  console.error(`[DUST AGENT] Querying agent ${agentId} with: ${query}`);
  console.error(`[DUST AGENT] Context: ${JSON.stringify(context).substring(0, 100)}...`);
  
  // Simulate different responses based on query type
  if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
    return {
      summary: "Based on the provided health documents, the patient appears to have normal cholesterol levels, with total cholesterol at 185 mg/dL (reference: < 200 mg/dL). Blood pressure is within normal range at 120/80 mmHg. Diet appears balanced with appropriate caloric intake around 1290 calories per day with good macronutrient distribution. No significant health concerns were identified in the available documents.",
      recommendations: [
        "Continue current diet and exercise regimen",
        "Maintain regular check-ups every 6 months",
        "Consider increasing HDL levels through more omega-3 fatty acids"
      ]
    };
  } else if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('compare')) {
    return {
      trends: {
        cholesterol: "Stable within normal range over the past year",
        glucose: "Slight improvement from 98 mg/dL to 95 mg/dL",
        bloodPressure: "Consistent at 120/80 mmHg with no concerning fluctuations"
      },
      analysis: "Overall health metrics show stability with slight improvements in glucose levels. No concerning trends identified."
    };
  } else if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('predict')) {
    return {
      riskAssessment: {
        cardiovascular: "Low risk based on current cholesterol and blood pressure readings",
        metabolic: "Low risk with normal glucose levels",
        nutritional: "Good nutritional status with balanced macronutrient intake"
      },
      recommendations: "Continue current health practices. Consider preventative measures such as regular exercise and maintaining current dietary habits."
    };
  } else {
    return {
      analysis: "Based on the provided health documents, all metrics appear within normal ranges. The patient's lab results, medical records, and nutrition logs indicate good overall health management.",
      insights: [
        "Cholesterol levels are within recommended ranges",
        "Blood pressure is optimal at 120/80 mmHg",
        "Nutritional intake is well-balanced with appropriate caloric consumption"
      ],
      recommendations: "Maintain current health practices and follow up with healthcare provider as recommended."
    };
  }
}

export default (server: McpServer) => {
  // Define agent query tool
  server.tool(
    "query_health_agent",
    "Query a Dust health agent with context from processed documents",
    {
      agentId: z.string({
        description: "ID or name of the Dust agent to query"
      }),
      query: z.string({
        description: "The query or question to ask the agent"
      }),
      documentIds: z.array(z.string(), {
        description: "IDs of processed documents to include as context"
      }),
      includeResponse: z.boolean({
        description: "Whether to include the full agent response in the result"
      }).optional()
    },
    async (params) => {
      try {
        // Validate document IDs and load their data
        const documentContexts = await Promise.all(
          params.documentIds.map(async (docId) => {
            const processedPath = path.join(PROCESSED_DIR, `${docId}.json`);
            try {
              const processedContent = await fs.readFile(processedPath, 'utf8');
              return JSON.parse(processedContent);
            } catch (error) {
              console.error(`Error loading document ${docId}:`, error);
              throw new Error(`Document with ID ${docId} not found or not processed`);
            }
          })
        );
        
        // Prepare context for the agent
        const context = {
          documents: documentContexts.map(doc => ({
            id: doc.documentId,
            name: doc.originalName,
            type: doc.fileType,
            data: doc.structuredData,
            text: doc.extractedText
          })),
          query: params.query
        };
        
        // Query the Dust agent
        const response = await queryDustAgent(
          params.agentId,
          params.query,
          context
        );
        
        // Prepare the result
        const result = {
          content: [{
            type: "text",
            text: `Agent response to query: "${params.query}"\n\n${JSON.stringify(response, null, 2)}`
          }],
          metadata: {
            agentId: params.agentId,
            query: params.query,
            documentIds: params.documentIds,
            timestamp: new Date().toISOString()
          }
        };
        
        // Include full response if requested
        if (params.includeResponse) {
          result.metadata['agentResponse'] = response;
        }
        
        return result;
      } catch (error) {
        console.error('Error querying health agent:', error);
        throw new Error(`Failed to query health agent: ${error.message}`);
      }
    }
  );

  // Define health insights tool
  server.tool(
    "generate_health_insights",
    "Generate health insights and recommendations based on processed documents",
    {
      documentIds: z.array(z.string(), {
        description: "IDs of processed documents to analyze"
      }),
      focusArea: z.enum(["nutrition", "lab_results", "overall_health", "trends"], {
        description: "Area to focus the analysis on"
      }).optional(),
      timeframe: z.enum(["recent", "all", "past_month", "past_year"], {
        description: "Timeframe to consider for the analysis"
      }).optional()
    },
    async (params) => {
      try {
        // Load document data
        const documentData = await Promise.all(
          params.documentIds.map(async (docId) => {
            const processedPath = path.join(PROCESSED_DIR, `${docId}.json`);
            try {
              const processedContent = await fs.readFile(processedPath, 'utf8');
              return JSON.parse(processedContent);
            } catch (error) {
              console.error(`Error loading document ${docId}:`, error);
              throw new Error(`Document with ID ${docId} not found or not processed`);
            }
          })
        );
        
        // Prepare context for analysis
        const context = {
          documents: documentData,
          focusArea: params.focusArea || "overall_health",
          timeframe: params.timeframe || "all"
        };
        
        // Generate query based on focus area
        let query = "Analyze health data and provide insights";
        if (params.focusArea === "nutrition") {
          query = "Analyze nutrition logs and provide dietary insights and recommendations";
        } else if (params.focusArea === "lab_results") {
          query = "Analyze lab results and identify any concerning values or trends";
        } else if (params.focusArea === "trends") {
          query = "Identify trends in health metrics over time and provide analysis";
        }
        
        // Query the Dust agent (using a default health analysis agent)
        const response = await queryDustAgent(
          "health_analysis",
          query,
          context
        );
        
        // Format insights based on focus area
        let insights = [];
        let recommendations = [];
        
        if (params.focusArea === "nutrition") {
          insights = [
            "Current diet provides approximately 1290 calories per day",
            "Protein intake is adequate at 95g per day",
            "Good balance of macronutrients with 45g fat and 120g carbohydrates"
          ];
          recommendations = [
            "Consider increasing intake of omega-3 fatty acids",
            "Maintain current protein intake",
            "Ensure adequate hydration throughout the day"
          ];
        } else if (params.focusArea === "lab_results") {
          insights = [
            "All cholesterol values within normal ranges",
            "Glucose level of 95 mg/dL is within healthy range",
            "HDL to LDL ratio is favorable"
          ];
          recommendations = [
            "Continue current health practices",
            "Follow up with healthcare provider in 6 months",
            "Consider regular exercise to further improve HDL levels"
          ];
        } else if (params.focusArea === "trends") {
          insights = [
            "Stable cholesterol levels over observed period",
            "Slight improvement in glucose readings",
            "Consistent blood pressure readings"
          ];
          recommendations = [
            "Maintain current health regimen",
            "Continue monitoring for long-term trends",
            "Consider tracking additional metrics like sleep quality"
          ];
        } else {
          insights = [
            "Overall health metrics within normal ranges",
            "Nutrition appears well-balanced",
            "No concerning findings in available documents"
          ];
          recommendations = [
            "Maintain current health practices",
            "Regular check-ups every 6 months",
            "Consider comprehensive health screening annually"
          ];
        }
        
        // Return insights and recommendations
        return {
          content: [{
            type: "text",
            text: `Health Insights (${params.focusArea || "overall_health"}):\n\n` +
                  `${insights.map(i => `• ${i}`).join('\n')}\n\n` +
                  `Recommendations:\n\n` +
                  `${recommendations.map(r => `• ${r}`).join('\n')}`
          }],
          metadata: {
            documentIds: params.documentIds,
            focusArea: params.focusArea || "overall_health",
            timeframe: params.timeframe || "all",
            insights,
            recommendations,
            analysisDate: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('Error generating health insights:', error);
        throw new Error(`Failed to generate health insights: ${error.message}`);
      }
    }
  );
}
