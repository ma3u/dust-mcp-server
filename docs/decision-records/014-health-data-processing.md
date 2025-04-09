# Decision Record: Health Data Processing Pipeline

## Date

2025-04-09

## Context

The MCP server needs to process various types of health data (Apple Health, blood tests, Keto Mojo) to provide meaningful insights through Dust agents. This document outlines the data flow and processing pipeline for health data.

## Health Data Processing Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Data Sources                              │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │  Apple Health   │  │  Blood Tests    │  │   Keto Mojo     ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Data Ingestion Layer                      │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ XML/CSV Parser  │  │  PDF Extractor  │  │  API Connector  ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Data Normalization Layer                  │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Schema Mapping  │  │  Unit Converter │  │ Data Validator  ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Data Processing Layer                     │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │  Aggregation    │  │   Analytics     │  │  Trend Analysis ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Data Storage Layer                        │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Secure Database │  │ Cache Manager   │  │ Backup Service  ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Data Access Layer                         │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │  Query Service  │  │ Data Formatter  │  │  Access Control ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
└───────────┼─────────────────────┼─────────────────────┼───────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                     Dust Agent Integration                    │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │ Context Builder │  │ Insight Engine  │  │ Response Format ││
│  │                 │  │                 │  │                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

## Data Flow Specifications

### 1. Apple Health Data Flow

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Apple Health    │────▶│  XML Parser   │────▶│ Data Extractor│
│  Export (XML)    │     │               │     │               │
│                  │     └───────────────┘     └───────┬───────┘
└──────────────────┘                                   │
                                                      │
┌──────────────────┐     ┌───────────────┐     ┌──────▼───────┐
│                  │     │               │     │              │
│  Normalized      │◀────│ Unit Converter│◀────│ Type Mapper  │
│  Health Records  │     │               │     │              │
│                  │     └───────────────┘     └──────────────┘
└────────┬─────────┘
         │
         │
┌────────▼─────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Data Aggregator │────▶│ Trend Analyzer│────▶│ Insight       │
│                  │     │               │     │ Generator     │
└──────────────────┘     └───────────────┘     └───────────────┘
```

#### Data Types

| Category | Measurements | Units | Processing |
|----------|--------------|-------|------------|
| Activity | Steps, Distance, Flights Climbed | count, km/mi, count | Daily/weekly aggregation |
| Workouts | Duration, Calories, Type | min, kcal, category | Activity classification |
| Vitals | Heart Rate, Blood Pressure, Temperature | bpm, mmHg, °C/°F | Min/max/avg calculation |
| Sleep | Duration, Phases, Quality | hours, categories, score | Sleep quality analysis |
| Nutrition | Calories, Macros, Water | kcal, g, ml | Nutritional balance |

#### Processing Steps

1. **Data Extraction**
   - Parse XML export from Apple Health
   - Extract relevant health metrics
   - Validate data integrity

2. **Data Normalization**
   - Convert units to standard format
   - Map to internal data schema
   - Filter invalid or outlier data

3. **Data Aggregation**
   - Group by time periods (daily, weekly, monthly)
   - Calculate statistical measures
   - Generate time series data

4. **Insight Generation**
   - Identify trends and patterns
   - Compare to reference ranges
   - Generate health insights

### 2. Blood Test Data Flow

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Blood Test      │────▶│  PDF/CSV      │────▶│ Data Extractor│
│  Results         │     │  Parser       │     │               │
│                  │     └───────────────┘     └───────┬───────┘
└──────────────────┘                                   │
                                                      │
┌──────────────────┐     ┌───────────────┐     ┌──────▼───────┐
│                  │     │               │     │              │
│  Normalized      │◀────│ Range Mapper  │◀────│ Lab Code     │
│  Test Results    │     │               │     │ Standardizer │
│                  │     └───────────────┘     └──────────────┘
└────────┬─────────┘
         │
         │
┌────────▼─────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Trend Tracker   │────▶│ Range Analyzer│────▶│ Clinical      │
│                  │     │               │     │ Interpreter   │
└──────────────────┘     └───────────────┘     └───────────────┘
```

#### Data Types

| Category | Measurements | Units | Processing |
|----------|--------------|-------|------------|
| Complete Blood Count | RBC, WBC, Platelets, Hemoglobin | count/L, g/dL | Range comparison |
| Metabolic Panel | Glucose, Creatinine, BUN | mg/dL, mmol/L | Kidney/liver function |
| Lipid Panel | Cholesterol, Triglycerides, HDL, LDL | mg/dL, mmol/L | Cardiovascular risk |
| Hormones | Insulin, Cortisol, Thyroid | μIU/mL, μg/dL | Endocrine analysis |
| Vitamins/Minerals | Vitamin D, B12, Iron, Ferritin | ng/mL, pg/mL | Deficiency detection |

#### Processing Steps

1. **Data Extraction**
   - Parse PDF/CSV lab reports
   - Extract test names, values, and reference ranges
   - Standardize lab codes (LOINC mapping)

2. **Data Normalization**
   - Convert units to standard format
   - Map to reference ranges
   - Standardize test names

3. **Trend Analysis**
   - Track changes over time
   - Identify values outside reference ranges
   - Calculate rate of change

4. **Clinical Interpretation**
   - Generate clinical context
   - Identify related test abnormalities
   - Provide evidence-based interpretations

### 3. Keto Mojo Data Flow

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Keto Mojo       │────▶│  API Client/  │────▶│ Data Extractor│
│  Device/App      │     │  CSV Parser   │     │               │
│                  │     └───────────────┘     └───────┬───────┘
└──────────────────┘                                   │
                                                      │
┌──────────────────┐     ┌───────────────┐     ┌──────▼───────┐
│                  │     │               │     │              │
│  Normalized      │◀────│ Unit Converter│◀────│ Time Series  │
│  Glucose/Ketone  │     │               │     │ Builder      │
│                  │     └───────────────┘     └──────────────┘
└────────┬─────────┘
         │
         │
┌────────▼─────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Pattern Detector│────▶│ Correlation   │────▶│ Metabolic     │
│                  │     │ Analyzer      │     │ Interpreter   │
└──────────────────┘     └───────────────┘     └───────────────┘
```

#### Data Types

| Category | Measurements | Units | Processing |
|----------|--------------|-------|------------|
| Blood Glucose | Fasting, Post-meal, Random | mg/dL, mmol/L | Glycemic variability |
| Ketones | Beta-hydroxybutyrate | mmol/L | Ketosis level |
| GKI | Glucose Ketone Index | ratio | Metabolic state |
| Measurements | Timestamp, Meal context | datetime, tags | Contextual analysis |

#### Processing Steps

1. **Data Extraction**
   - Connect to Keto Mojo API or parse CSV exports
   - Extract glucose and ketone measurements
   - Capture measurement context (fasting, post-meal)

2. **Time Series Processing**
   - Organize by timestamp
   - Handle missing data points
   - Create continuous time series

3. **Pattern Analysis**
   - Detect daily patterns
   - Identify glucose/ketone correlations
   - Calculate Glucose Ketone Index (GKI)

4. **Metabolic Interpretation**
   - Determine metabolic state
   - Identify optimal ketosis ranges
   - Correlate with nutrition and activity

## Data Integration and Correlation

### Cross-Data Analysis

```
┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Normalized      │────▶│  Temporal     │────▶│ Multi-source  │
│  Health Data     │     │  Alignment    │     │ Correlator    │
│                  │     └───────────────┘     └───────┬───────┘
└──────────────────┘                                   │
                                                      │
┌──────────────────┐     ┌───────────────┐     ┌──────▼───────┐
│                  │     │               │     │              │
│  Insight         │◀────│ Causality     │◀────│ Pattern      │
│  Generator       │     │ Analyzer      │     │ Recognition  │
│                  │     └───────────────┘     └──────────────┘
└────────┬─────────┘
         │
         │
┌────────▼─────────┐     ┌───────────────┐     ┌───────────────┐
│                  │     │               │     │               │
│  Agent Context   │────▶│ Personalized  │────▶│ Recommendation│
│  Builder         │     │ Analysis      │     │ Engine        │
└──────────────────┘     └───────────────┘     └───────────────┘
```

### Correlation Examples

1. **Activity and Glucose Levels**
   - Track how exercise affects blood glucose
   - Identify optimal exercise timing for glycemic control
   - Correlate workout intensity with glucose response

2. **Sleep and Metabolic Markers**
   - Analyze how sleep quality affects ketone levels
   - Identify sleep patterns that optimize metabolism
   - Correlate sleep disruptions with glucose variability

3. **Nutrition and Blood Biomarkers**
   - Track how dietary changes affect lipid profiles
   - Identify nutritional patterns that improve biomarkers
   - Correlate macronutrient ratios with metabolic health

## Data Storage Schema

### Health Metrics Schema

```typescript
interface HealthMetric {
  id: string;
  userId: string;
  source: 'apple_health' | 'blood_test' | 'keto_mojo';
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata: {
    device?: string;
    context?: string;
    meal?: string;
    activity?: string;
    [key: string]: any;
  };
  referenceRange?: {
    low?: number;
    high?: number;
    optimal?: number;
  };
}
```

### User Health Profile Schema

```typescript
interface HealthProfile {
  userId: string;
  demographics: {
    age: number;
    sex: 'male' | 'female' | 'other';
    height: number;
    weight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  };
  goals: {
    type: 'weight' | 'performance' | 'health' | 'metabolic';
    target: any;
    timeline?: Date;
  }[];
  conditions: string[];
  medications: string[];
  preferences: {
    units: 'metric' | 'imperial';
    nutritionTracking: boolean;
    privacySettings: {
      shareWithAgents: boolean;
      anonymizeData: boolean;
    };
  };
}
```

### Insight Schema

```typescript
interface HealthInsight {
  id: string;
  userId: string;
  type: 'observation' | 'trend' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  metrics: {
    metricId: string;
    type: string;
    value: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
  }[];
  evidence: {
    source: string;
    confidence: number;
    description: string;
  }[];
  generated: Date;
  expiresAt?: Date;
  actionable: boolean;
  action?: {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  };
}
```

## Security and Privacy Considerations

### Data Protection Measures

1. **Encryption**
   - Encrypt all health data at rest using AES-256
   - Use TLS 1.3 for data in transit
   - Implement field-level encryption for sensitive metrics

2. **Access Controls**
   - Implement role-based access control
   - Apply principle of least privilege
   - Maintain detailed access logs

3. **Data Minimization**
   - Process only necessary health data
   - Implement data retention policies
   - Support data anonymization

4. **Compliance**
   - Adhere to HIPAA requirements
   - Implement GDPR data subject rights
   - Maintain audit trails for compliance

### Privacy-Preserving Processing

1. **Differential Privacy**
   - Add controlled noise to aggregate statistics
   - Prevent re-identification of individuals
   - Balance privacy and utility

2. **Federated Processing**
   - Process sensitive data locally when possible
   - Minimize raw data transmission
   - Share only derived insights when necessary

3. **Consent Management**
   - Obtain explicit consent for data processing
   - Support granular permission controls
   - Enable easy consent revocation

## Integration with Dust Agents

### Agent Context Building

```typescript
interface AgentHealthContext {
  user: {
    profile: Omit<HealthProfile, 'userId'>;
    insights: HealthInsight[];
  };
  metrics: {
    recent: {
      type: string;
      value: number;
      unit: string;
      timestamp: Date;
      trend?: 'increasing' | 'decreasing' | 'stable';
    }[];
    aggregates: {
      type: string;
      period: 'day' | 'week' | 'month';
      min: number;
      max: number;
      avg: number;
      unit: string;
    }[];
  };
  correlations: {
    description: string;
    strength: number;
    metrics: string[];
    details: string;
  }[];
  recommendations: {
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    rationale: string;
  }[];
}

function buildAgentContext(userId: string, focusAreas?: string[]): AgentHealthContext {
  // Implementation details
}
```

### Agent Interaction Flow

1. **Context Preparation**
   - Retrieve relevant health data
   - Process and summarize metrics
   - Generate insights and correlations

2. **Agent Query**
   - Format health context for agent consumption
   - Submit query with context to Dust agent
   - Process streaming response

3. **Response Enhancement**
   - Augment agent response with visualizations
   - Add reference links to health resources
   - Include actionable recommendations

## Implementation Plan

### Phase 1: Data Ingestion

- Implement Apple Health XML parser
- Develop blood test PDF/CSV extractor
- Create Keto Mojo API connector
- Build data validation pipeline

### Phase 2: Data Processing

- Implement normalization services
- Develop aggregation and analytics
- Create trend analysis engine
- Build correlation detector

### Phase 3: Insight Generation

- Develop insight generation rules
- Implement recommendation engine
- Create personalized analysis service
- Build agent context formatter

### Phase 4: Integration and Testing

- Integrate with Dust agents
- Implement end-to-end testing
- Perform security and privacy audit
- Optimize performance

## Decision

Based on the health data processing design, we will:

1. Implement a modular data processing pipeline
2. Support multiple health data sources
3. Develop robust normalization and correlation capabilities
4. Ensure privacy-preserving processing
5. Create agent-ready context building
6. Implement secure data storage and access

## Consequences

- The processing pipeline enables comprehensive health insights
- Multiple data sources provide a holistic health view
- Correlation capabilities reveal non-obvious patterns
- Security measures protect sensitive health information
- Agent integration enables natural language health interactions

## Open Questions

- How will we handle conflicting data from different sources?
- What's the optimal approach for long-term data storage?
- How should we validate the clinical accuracy of insights?

## References

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [LOINC Standard for Lab Tests](https://loinc.org/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
