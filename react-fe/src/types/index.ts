// API Response types
export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export interface LoginResponse {
  code: number;
  message?: string;
  token?: string;
}

export interface SessionsResponse {
  code: number;
  sessions: Array<{
    sessionId: string;
    name?: string;
  }>;
}

export interface HistoryResponse {
  code: number;
  history: Array<{
    is_user: boolean;
    content: string;
  }>;
}

export interface ChatResponse {
  code: number;
  message?: string;
  sessionId?: string;
  Information?: string;
}

export interface TTSResponse {
  code: number;
  task_id?: string;
  task_status?: string;
  task_result?: string;
}
