// API Response types
export interface ApiResponse<T = unknown> {
  status_code: number;
  status_msg?: string;
  data?: T;
}

export interface LoginResponse {
  status_code: number;
  status_msg?: string;
  token?: string;
}

export interface SessionsResponse {
  status_code: number;
  sessions: Array<{
    sessionId: string;
    name?: string;
  }>;
}

export interface HistoryResponse {
  status_code: number;
  history: Array<{
    is_user: boolean;
    content: string;
  }>;
}

export interface ChatResponse {
  status_code: number;
  status_msg?: string;
  sessionId?: string;
  Information?: string;
}

export interface TTSResponse {
  status_code: number;
  task_id?: string;
  task_status?: string;
  task_result?: string;
}
