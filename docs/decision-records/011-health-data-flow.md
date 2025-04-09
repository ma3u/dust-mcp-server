# Decision Record: Health Data Processing Pipeline

## Date

2025-04-09

## Context

The MCP server needs a robust data processing pipeline to handle various health data sources and prepare this data for analysis by Dust agents. This document outlines the data flow diagrams and processing architecture for health data.

## Health Data Processing Architecture

### Overall Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│  Data Sources   │────▶│  Data Ingestion │────▶│  Data Processing│────▶│  Data Storage   │
│                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Dust Agents    │◀────│  Data Analytics │◀────│  Data Retrieval │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Detailed Data Flows

### 1. Apple Health Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Apple Health   │     │   XML Parser    │     │ Data Extraction │
│  Export (.zip)  │────▶│  & Validator    │────▶│  & Normalization│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Time Series    │     │  Secure Data    │     │ Category-based  │
│  Analysis       │◀────│  Storage        │◀────│ Classification  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │
        ▼
┌─────────────────┐
│                 │
│  Agent-ready    │
│  Data Format    │
│                 │
└─────────────────┘
```

#### Processing Steps:

1. **File Upload & Validation**
   - User uploads Apple Health export (.zip)
   - System validates file format and structure
   - Extracts XML files from the archive

2. **XML Parsing**
   - Parses XML structure using streaming parser
   - Validates against expected schema
   - Handles large files efficiently

3. **Data Extraction & Normalization**
   - Extracts relevant health metrics
   - Normalizes units and measurements
   - Handles time zones and date formats
   - Validates data ranges and consistency

4. **Category-based Classification**
   - Classifies data into categories:
     - Activity data
     - Heart rate measurements
     - Sleep analysis
     - Blood glucose readings
     - Weight and body measurements
     - Nutrition data

5. **Secure Storage**
   - Encrypts sensitive health information
   - Stores in structured format
   - Implements data retention policies
   - Ensures data integrity

6. **Time Series Analysis**
   - Performs trend analysis
   - Calculates moving averages
   - Identifies patterns and anomalies
   - Generates summary statistics

7. **Agent-ready Formatting**
   - Prepares data in format suitable for Dust agents
   - Structures data for efficient querying
   - Includes metadata and context

### 2. Blood Test Results Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Blood Test PDF │     │   PDF Parser    │     │ Data Extraction │
│  or CSV Upload  │────▶│  & OCR Process  │────▶│  & Validation   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Reference Range│     │  Secure Data    │     │ Biomarker       │
│  Comparison     │◀────│  Storage        │◀────│ Classification  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Trend Analysis │────▶│  Agent-ready    │
│  & History      │     │  Data Format    │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

#### Processing Steps:

1. **File Upload & Validation**
   - User uploads blood test PDF or CSV
   - System validates file format
   - Prepares for processing

2. **PDF Parsing & OCR**
   - For PDF: Performs OCR or structured data extraction
   - For CSV: Parses structured data
   - Identifies lab report format and template

3. **Data Extraction & Validation**
   - Extracts biomarker names, values, and units
   - Identifies reference ranges
   - Validates data consistency
   - Handles different lab formats

4. **Biomarker Classification**
   - Classifies biomarkers into categories:
     - Complete blood count
     - Metabolic panels
     - Lipid profiles
     - Hormone levels
     - Vitamin and mineral levels
     - Inflammatory markers

5. **Secure Storage**
   - Encrypts sensitive health information
   - Stores with metadata (date, lab, etc.)
   - Links to user profile
   - Implements data retention policies

6. **Reference Range Comparison**
   - Compares values to standard reference ranges
   - Identifies out-of-range values
   - Considers age and gender-specific ranges
   - Flags significant deviations

7. **Trend Analysis & History**
   - Compares with historical results
   - Identifies trends over time
   - Calculates rate of change
   - Highlights significant changes

8. **Agent-ready Formatting**
   - Prepares data for Dust agent analysis
   - Structures for efficient querying
   - Includes metadata and context

### 3. Keto Mojo Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Keto Mojo PDF  │     │   PDF/CSV       │     │ Data Extraction │
│  or CSV Upload  │────▶│  Parser         │────▶│  & Validation   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  GKI Calculation│     │  Secure Data    │     │ Time-based      │
│  & Analysis     │◀────│  Storage        │◀────│ Organization    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Pattern        │────▶│  Agent-ready    │
│  Recognition    │     │  Data Format    │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

#### Processing Steps:

1. **File Upload & Validation**
   - User uploads Keto Mojo data (PDF or CSV)
   - System validates file format
   - Prepares for processing

2. **PDF/CSV Parsing**
   - Parses structured data from CSV
   - For PDF: Extracts data using templates
   - Identifies data format and structure

3. **Data Extraction & Validation**
   - Extracts glucose and ketone readings
   - Captures measurement timestamps
   - Validates data ranges and consistency
   - Handles different time formats

4. **Time-based Organization**
   - Organizes readings chronologically
   - Groups by day, week, month
   - Identifies measurement patterns
   - Handles time zones and date formats

5. **Secure Storage**
   - Encrypts sensitive health information
   - Stores with appropriate metadata
   - Links to user profile
   - Implements data retention policies

6. **GKI Calculation & Analysis**
   - Calculates Glucose-Ketone Index
   - Analyzes GKI trends over time
   - Identifies optimal ranges
   - Flags significant deviations

7. **Pattern Recognition**
   - Identifies daily/weekly patterns
   - Correlates with other health data
   - Detects response to lifestyle factors
   - Highlights significant changes

8. **Agent-ready Formatting**
   - Prepares data for Dust agent analysis
   - Structures for efficient querying
   - Includes metadata and context

## Data Storage Architecture

### Secure Storage Model

```
┌───────────────────────────────────────────────────────────┐
│                     User Health Profile                    │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │                 │  │                 │  │           │  │
│  │  User Metadata  │  │ Privacy Settings│  │ Encryption│  │
│  │                 │  │                 │  │   Keys    │  │
│  └─────────────────┘  └─────────────────┘  └───────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌───────────────────────────────────────────────────────────┐
│                     Health Data Store                      │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │                 │  │                 │  │           │  │
│  │  Apple Health   │  │  Blood Tests    │  │ Keto Mojo │  │
│  │     Data        │  │     Data        │  │   Data    │  │
│  │                 │  │                 │  │           │  │
│  └─────────────────┘  └─────────────────┘  └───────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌───────────────────────────────────────────────────────────┐
│                     Analytics Store                        │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │                 │  │                 │  │           │  │
│  │  Time Series    │  │  Correlations   │  │ Summary   │  │
│  │   Analysis      │  │                 │  │ Statistics│  │
│  │                 │  │                 │  │           │  │
│  └─────────────────┘  └─────────────────┘  └───────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Data Schemas

#### User Health Profile Schema
```typescript
interface UserHealthProfile {
  userId: string;
  demographics: {
    age?: number;
    gender?: string;
    height?: number;
    weight?: number;
    timezone: string;
  };
  privacySettings: {
    dataRetentionPeriod: number; // in days
    sharingPreferences: {
      allowAnonymizedResearch: boolean;
      allowThirdPartySharing: boolean;
    };
    dataCategories: {
      [category: string]: {
        enabled: boolean;
        retentionOverride?: number;
      };
    };
  };
  encryptionKeys: {
    publicKey: string;
    keyVersion: number;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Apple Health Data Schema
```typescript
interface AppleHealthData {
  userId: string;
  dataType: string; // e.g., "HeartRate", "Steps", "Sleep"
  sourceDevice: string;
  sourceApplication: string;
  startDate: Date;
  endDate: Date;
  value: number;
  unit: string;
  metadata: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Blood Test Data Schema
```typescript
interface BloodTestData {
  userId: string;
  testDate: Date;
  labName?: string;
  reportId?: string;
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    flagged: boolean;
    category: string;
  }>;
  metadata: {
    pdfSource?: string;
    manualEntry: boolean;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Keto Mojo Data Schema
```typescript
interface KetoMojoData {
  userId: string;
  readingDate: Date;
  glucose: {
    value: number;
    unit: string; // mg/dL or mmol/L
  };
  ketones: {
    value: number;
    unit: string; // mmol/L
  };
  gki?: number; // Glucose-Ketone Index
  metadata: {
    deviceId?: string;
    manualEntry: boolean;
    notes?: string;
    fasting: boolean;
    timeOfDay: string; // e.g., "morning", "afternoon", "evening"
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Data Privacy and Security

### Encryption Strategy

1. **Data at Rest**
   - Field-level encryption for sensitive health data
   - Encryption keys managed securely
   - Regular key rotation

2. **Data in Transit**
   - TLS 1.3+ for all communications
   - Secure file upload mechanisms
   - Encrypted payload for agent communications

3. **Access Control**
   - User-specific encryption keys
   - Role-based access control
   - Audit logging for all data access

### Data Retention

1. **Default Retention Policy**
   - 1 year retention for detailed data
   - 5 year retention for summary data
   - User-configurable retention periods

2. **Data Minimization**
   - Only store necessary data fields
   - Anonymize data where possible
   - Aggregate data for long-term storage

3. **Data Deletion**
   - Secure deletion mechanisms
   - Cascading deletion across stores
   - Verification of deletion

## Decision

Based on the health data processing pipeline design, we will:

1. Implement specialized parsers for each data source
2. Create a secure, encrypted storage architecture
3. Develop robust data validation and normalization
4. Implement time-series analysis for health trends
5. Design agent-ready data formats for efficient analysis
6. Ensure privacy and security throughout the pipeline

## Consequences

- The pipeline enables comprehensive health data analysis
- Multiple data sources can be integrated and correlated
- Security and privacy are ensured throughout the process
- The architecture supports future data source additions
- Data processing may require significant computational resources
- Complex parsing logic will be needed for unstructured data

## Open Questions

- How will we handle inconsistent or incomplete data?
- What's the optimal approach for correlating data across sources?
- How should we manage data retention and user control over stored information?

## References

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [PDF.js Library for PDF Parsing](https://mozilla.github.io/pdf.js/)
- [Time Series Analysis Best Practices](https://otexts.com/fpp3/)
