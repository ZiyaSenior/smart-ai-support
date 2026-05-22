/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  providerUsed?: string;
  isError?: boolean;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
  providerUsed: string;
  history: Message[];
}

export interface HistoryResponse {
  history: Message[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  config: {
    geminiEnabled: boolean;
    geminiModel: string;
    geminiEnvStatus: "missing" | "placeholder" | "valid";
    keyLength?: number;
    onVercel?: boolean;
  };
}
