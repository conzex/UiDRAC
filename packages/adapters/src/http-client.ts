/**
 * http-client.ts — Shared axios instance for iDRAC communication.
 * Disables TLS verification only on the server→iDRAC hop.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as https from 'https';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RetryConfig = InternalAxiosRequestConfig & { __idracRetry?: number };

export function createHttpClient(ip: string, timeout = 12000) {
  const client = axios.create({
    baseURL: `https://${ip}`,
    timeout,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const config = error.config as RetryConfig | undefined;
      if (!config) throw error;
      const status = error.response?.status;
      const attempt = config.__idracRetry ?? 0;
      if ((status === 503 || status === 429) && attempt < 5) {
        config.__idracRetry = attempt + 1;
        await sleep(600 * (attempt + 1));
        return client.request(config);
      }
      throw error;
    },
  );

  return client;
}
