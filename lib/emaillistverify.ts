/**
 * EmailListVerify API client
 * @see https://api.emaillistverify.com/api-doc
 */

import * as Papa from "papaparse";

const BASE_URL = "https://api.emaillistverify.com";

function getApiKey(): string {
  const key = process.env.EMAIL_LIST_VERIFY_API_KEY;
  if (!key) {
    throw new Error("EMAIL_LIST_VERIFY_API_KEY is not configured");
  }
  return key;
}

function getHeaders(): Record<string, string> {
  return {
    "x-api-key": getApiKey(),
  };
}

/**
 * Verify a single email - returns plain text status
 */
export async function verifyEmail(email: string): Promise<string> {
  const url = new URL("/api/verifyEmail", BASE_URL);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `EmailListVerify API error ${res.status}`;
    try {
      const json = JSON.parse(body);
      message = json.message || body || message;
    } catch {
      if (body) message += `: ${body}`;
    }
    throw new Error(message);
  }

  return res.text();
}

export interface VerifyEmailDetailedResult {
  email: string;
  result: string;
  internalResult?: string | null;
  mxServer?: string | null;
  mxServerIp?: string | null;
  esp?: string | null;
  account?: string;
  tag?: string | null;
  isRole?: boolean;
  isFree?: boolean;
  isNoReply?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
}

/**
 * Verify a single email with detailed JSON response
 */
export async function verifyEmailDetailed(
  email: string
): Promise<VerifyEmailDetailedResult> {
  const url = new URL("/api/verifyEmailDetailed", BASE_URL);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `EmailListVerify API error ${res.status}`;
    try {
      const json = JSON.parse(body);
      message = json.message || body || message;
    } catch {
      if (body) message += `: ${body}`;
    }
    throw new Error(message);
  }

  return res.json();
}

/**
 * Upload emails for bulk verification - returns maillist ID
 */
export async function uploadBulkVerification(
  emails: string[],
  quality: "standard" | "high" = "standard"
): Promise<string> {
  // Create CSV: single column "Email" with one email per row
  const header = "Email";
  const rows = emails.map((e) => `"${e.replace(/"/g, '""')}"`).join("\n");
  const csv = `${header}\n${rows}`;

  const formData = new FormData();
  formData.append("file_contents", new Blob([csv], { type: "text/csv" }), "emails.csv");
  formData.append("quality", quality);

  const res = await fetch(`${BASE_URL}/api/verifyApiFile`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `EmailListVerify bulk upload error ${res.status}`;
    try {
      const json = JSON.parse(body);
      message = json.message || body || message;
    } catch {
      if (body) message += `: ${body}`;
    }
    throw new Error(message);
  }

  const maillistId = await res.text();
  return maillistId.trim();
}

export interface BulkProgressResponse {
  status?: string;
  total?: number;
  processed?: number;
  result?: unknown;
}

/**
 * Get bulk verification progress
 */
export async function getBulkProgress(
  maillistId: string
): Promise<BulkProgressResponse> {
  const res = await fetch(
    `${BASE_URL}/api/maillists/${maillistId}/progress`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EmailListVerify progress error ${res.status}: ${body}`);
  }

  return res.json();
}

export interface BulkResultRow {
  email: string;
  result: string;
}

/**
 * Download bulk verification results - parses CSV with email and result columns
 */
export async function downloadBulkResults(
  maillistId: string
): Promise<BulkResultRow[]> {
  const res = await fetch(`${BASE_URL}/api/maillists/${maillistId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EmailListVerify download error ${res.status}: ${body}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  // Response can be CSV or JSON depending on API
  if (contentType.includes("json")) {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data)) {
      return data.map((row: { email?: string; result?: string }) => ({
        email: String(row.email || ""),
        result: String(row.result || "unknown"),
      }));
    }
    if (data && typeof data === "object" && "results" in data) {
      const results = (data as { results: BulkResultRow[] }).results;
      return Array.isArray(results) ? results : [];
    }
  }

  // Parse CSV - EmailListVerify returns CSV with columns (email, result, etc.)
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  const results: BulkResultRow[] = [];

  for (const row of rows) {
    const keys = Object.keys(row);
    const emailKey = keys.find((k) => k.toLowerCase() === "email") || keys[0];
    const resultKey =
      keys.find((k) => k.toLowerCase() === "result" || k.toLowerCase() === "status") || keys[1] || keys[0];
    const email = (row[emailKey] || "").trim();
    const result = (row[resultKey] || "unknown").trim();
    if (email) {
      results.push({ email, result: result || "unknown" });
    }
  }
  return results;
}
