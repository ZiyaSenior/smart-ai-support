/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This file defines TypeScript interfaces for the data structures used in the application.
export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  providerUsed?: string;
  isError?: boolean;
}

// This interface represents the expected structure of the response from the /api/chat endpoint.
export interface ChatRequest {
  message: string;
}
// This interface represents the expected structure of the response from the /api/chat endpoint.
export interface ChatResponse {
  response: string;
  providerUsed: string;
  history: Message[];
}
// This interface represents the expected structure of the response from the /api/history endpoint.
export interface HistoryResponse {
  history: Message[];
}
// This interface represents the expected structure of the response from the /api/health endpoint.
export interface HealthResponse {
  status: string;
  timestamp: string;
  build?: string;
  config: {
    groqEnabled: boolean;
    groqModel: string;
    groqEnvStatus: "missing" | "placeholder" | "valid";
    keyLength?: number;
    onVercel?: boolean;
  };
}
