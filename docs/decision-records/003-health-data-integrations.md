# Decision Record: Health Data Source Integrations

## Date
2025-04-09

## Context
Our MCP server needs to integrate with various health data sources to provide comprehensive health insights through Dust agents. This document identifies the required integrations and their technical requirements.

## Research Findings

### Primary Health Data Sources

#### 1. Apple Health Data
- **Data Format**: XML export (.zip archive containing XML files)
- **Key Metrics**:
  - Activity data (steps, exercise minutes, stand hours)
  - Heart rate measurements
  - Sleep analysis
  - Blood glucose readings (if connected to compatible devices)
  - Weight and body measurements
  - Nutrition data
- **Integration Approach**:
  - Parse XML data structure
  - Extract relevant metrics based on user focus areas
  - Convert to structured format for agent consumption
  - Support incremental updates

#### 2. Blood Test Results
- **Data Format**: PDF reports, CSV exports, or manual input
- **Key Metrics**:
  - Complete blood count (CBC)
  - Metabolic panels
  - Lipid profiles
  - Hormone levels
  - Vitamin and mineral levels
  - Inflammatory markers
- **Integration Approach**:
  - PDF parsing using OCR or structured data extraction
  - Template-based extraction for common lab formats
  - Manual input form for user-entered values
  - Historical tracking and trend analysis

#### 3. Keto Mojo Data
- **Data Format**: PDF reports or CSV exports from the Keto Mojo app
- **Key Metrics**:
  - Blood glucose readings
  - Ketone levels
  - Glucose-ketone index (GKI)
  - Measurement timestamps
- **Integration Approach**:
  - Parse PDF reports using structured extraction
  - Import CSV data directly
  - Support manual entry for individual readings
  - Time-series analysis and pattern recognition

### Secondary Health Data Sources

#### 4. Nutrition Tracking
- **Data Format**: Manual input or integration with nutrition apps
- **Key Metrics**:
  - Macronutrient breakdown (protein, fat, carbs)
  - Caloric intake
  - Meal timing and frequency
  - Specific food items and categories
- **Integration Approach**:
  - Structured input forms
  - Optional API integration with popular nutrition apps
  - Food database for common nutritional values

#### 5. Physical Activity Data
- **Data Format**: Integration with fitness apps or manual input
- **Key Metrics**:
  - Exercise type, duration, and intensity
  - Training metrics (sets, reps, weights)
  - Heart rate zones during activity
  - Recovery metrics
- **Integration Approach**:
  - Structured activity logging
  - Integration with Apple Health for automated tracking
  - Support for manual workout logs

## Technical Requirements

### Data Processing Capabilities
- PDF parsing and text extraction
- XML parsing and transformation
- CSV import and processing
- Image recognition for uploaded lab reports
- Time-series data analysis
- Data normalization and standardization

### Storage Requirements
- Secure storage of personal health information
- Efficient retrieval for time-series analysis
- Support for different data schemas
- Version control for data updates
- Data retention policies

### Integration Interfaces
- File upload mechanisms
- API connectors for third-party services
- Manual data entry forms
- Batch processing capabilities

## Decision
Based on the research, we will:

1. Implement a modular data processing pipeline for each data source
2. Create standardized schemas for storing health data
3. Develop parsers for common formats (PDF, XML, CSV)
4. Design a secure storage system for sensitive health information
5. Create interfaces for both automated and manual data input

## Consequences
- The MCP server will need robust file processing capabilities
- We must implement strong data privacy measures
- The architecture should support adding new data sources in the future
- Data validation and error handling will be critical
- User experience for data upload should be streamlined

## Open Questions
- How will we handle inconsistent or incomplete data?
- What's the best approach for data normalization across sources?
- How should we manage data retention and user control over stored information?

## References
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [PDF.js Library for PDF Parsing](https://mozilla.github.io/pdf.js/)
- [Health Level 7 (HL7) Standards](https://www.hl7.org/)
