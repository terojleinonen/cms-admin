export const workflowService = {
  createWorkflow: jest.fn(),
  executeWorkflow: jest.fn(),
  getWorkflowStatus: jest.fn(),
  cancelWorkflow: jest.fn(),
};

export const WorkflowStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;