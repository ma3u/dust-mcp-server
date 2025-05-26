import { getLogger } from '../utils/logger.js';

const logger = getLogger({ logFilePrefix: 'workflow-config' });

// Default workflow configuration
export const DEFAULT_WORKFLOW = 'standard';

// Available workflows with their configurations
export const WORKFLOWS = {
  standard: {
    name: 'Standard Workflow',
    description: 'Default workflow with balanced features',
    features: {
      toolExecution: true,
      fileProcessing: true,
      multiAgentSupport: true,
      caching: true,
      logging: 'info',
    },
  },
  minimal: {
    name: 'Minimal Workflow',
    description: 'Lightweight workflow with essential features only',
    features: {
      toolExecution: true,
      fileProcessing: false,
      multiAgentSupport: false,
      caching: false,
      logging: 'error',
    },
  },
  extended: {
    name: 'Extended Workflow',
    description: 'Feature-rich workflow with all capabilities',
    features: {
      toolExecution: true,
      fileProcessing: true,
      multiAgentSupport: true,
      caching: true,
      logging: 'debug',
      experimentalFeatures: true,
    },
  },
} as const;

export type WorkflowName = keyof typeof WORKFLOWS;

// Current workflow state
let currentWorkflow: WorkflowName = DEFAULT_WORKFLOW;

/**
 * Get the current workflow configuration
 */
export function getCurrentWorkflow() {
  return {
    name: currentWorkflow,
    ...WORKFLOWS[currentWorkflow],
  };
}

/**
 * Get available workflow names
 */
export function getAvailableWorkflows(): WorkflowName[] {
  return Object.keys(WORKFLOWS) as WorkflowName[];
}

/**
 * Switch to a different workflow
 * @param workflowName Name of the workflow to switch to
 * @returns The new workflow configuration
 * @throws Error if the workflow doesn't exist
 */
export function switchWorkflow(workflowName: WorkflowName) {
  if (!(workflowName in WORKFLOWS)) {
    throw new Error(`Unknown workflow: ${workflowName}`);
  }

  logger.info(`Switching workflow from ${currentWorkflow} to ${workflowName}`);
  currentWorkflow = workflowName;
  
  // Apply any runtime configuration changes
  applyWorkflowConfig(WORKFLOWS[workflowName]);
  
  return getCurrentWorkflow();
}

/**
 * Apply workflow-specific configuration
 * @param config Workflow configuration to apply
 */
function applyWorkflowConfig(config: typeof WORKFLOWS[WorkflowName]) {
  // Apply logging level
  const logger = getLogger();
  logger.level = config.features.logging;
  
  // Other runtime configuration can be applied here
  logger.debug(`Applied workflow configuration: ${config.name}`);
}
