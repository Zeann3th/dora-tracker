export interface PullRequest {
  action: "opened" | "closed" | "reopened";
  number: number;
  organization?: {
    login: string;
    id: number;
  };
  repository: {
    name: string;
    full_name: string;
    default_branch: string;
    owner: {
      login: string;
    };
  };
  pull_request: {
    title: string;
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merged: boolean;
    merge_commit_sha: string | null;
    base: {
      ref: string;
      sha: string;
    };
    merged_by: {
      name: string;
      email: string;
    };
    merge_commit_message: string;
  };
}

export interface Push {
  ref: string;
  before: string;
  after: string;
  repository: {
    name: string;
    full_name: string;
    default_branch: string;
    owner: {
      login: string;
    };
  };
  organization?: {
    login: string;
    id: number;
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  }>;
}

export interface Release {
  action:
    | "created"
    | "published"
    | "edited"
    | "deleted"
    | "unpublished"
    | "prereleased"
    | "released";
  release: {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string | null;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    default_branch: string;
  };
  organization?: {
    login: string;
    id: number;
  };
}

export interface WorkflowRun {
  workflow: {
    id: number;
    name: string;
  };
  action: "completed" | "requested" | "in_progress";
  workflow_run: {
    id: number;
    name: string;
    status: "queued" | "in_progress" | "completed";
    conclusion:
      | "success"
      | "failure"
      | "neutral"
      | "cancelled"
      | "timed_out"
      | "action_required";
    created_at: string;
    updated_at: string;
    run_attempt: number;
    event: string;
    head_branch: string | null;
    head_commit: {
      id: string;
      message: string;
      timestamp: string;
    };
    actor: {
      login: string;
      id: number;
    };
  };
  organization?: {
    login: string;
    id: number;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
    };
    default_branch: string;
  };
}

export interface RepositoryWebhook {
  action: "created" | "deleted";
  organization?: {
    login: string;
    id: number;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
    };
    default_branch: string;
  };
}
