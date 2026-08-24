export type AutomationExecutionStatus = "success" | "failure" | "pending";

export interface AutomationExecutionResult {
  jobId: string;
  nodeId: string;
  status: AutomationExecutionStatus;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
}

export interface AutomationProvider {
  readonly id: string;

  trigger(
    jobId: string,
    nodeId: string,
    providerKey: string,
    inputs: Record<string, unknown>,
  ): Promise<AutomationExecutionResult>;
}
