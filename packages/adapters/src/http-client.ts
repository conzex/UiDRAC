/**
 * http-client.ts — Shared axios instance for iDRAC communication.
 * Disables TLS verification only on the server→iDRAC hop.
 */
import axios from 'axios';
import * as https from 'https';

export function createHttpClient(ip: string) {
  return axios.create({
    baseURL: `https://${ip}`,
    timeout: 20000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { 'Content-Type': 'application/json' },
  });
}
