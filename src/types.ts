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
    localModelEnabled: boolean;
    localModelName: string;
    openRouterEnabled: boolean;
    openRouterModel: string;
    genericProviderEnabled: boolean;
    genericProviderModel: string;
    geminiEnabled: boolean;
    localFallbackEnabled: boolean;
    geminiEnvStatus: "missing" | "placeholder" | "valid";
    openRouterEnvStatus: "missing" | "placeholder" | "valid";
    genericEnvStatus: "missing" | "placeholder" | "valid";
  };
}
