#!/usr/bin/env node

/**
 * bootstrap-gmail-auth.js
 *
 * One-time setup script to obtain a Gmail API refresh token for the
 * email triage system. This is NOT part of the production pipeline.
 *
 * PREREQUISITES:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID — type "Desktop application"
 *   3. Add `http://localhost:3000/callback` to Authorized redirect URIs
 *   4. Enable the Gmail API for your project
 *   5. Copy the Client ID and Client Secret
 *
 * SCOPE:
 *   https://www.googleapis.com/auth/gmail.modify
 *   (read + send + delete + manage labels)
 *
 * USAGE:
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node bootstrap-gmail-auth.js
 *   node bootstrap-gmail-auth.js --help
 *
 * ENVIRONMENT:
 *   GMAIL_CLIENT_ID       — OAuth client ID
 *   GMAIL_CLIENT_SECRET   — OAuth client secret
 *
 * OUTPUT:
 *   Prints the refresh token to stdout with setup instructions.
 *
 * DEPENDENCIES:
 *   Node.js built-in modules only. No npm packages required.
 */

import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];
const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_PORT = 3000;
const REDIRECT_PATH = "/callback";
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  const lines = [
    "",
    "bootstrap-gmail-auth.js — Obtain a Gmail OAuth refresh token",
    "",
    "USAGE",
    "  node scripts/email-triage/bootstrap-gmail-auth.js",
    "  node scripts/email-triage/bootstrap-gmail-auth.js --help",
    "",
    "ENVIRONMENT VARIABLES",
    "  GMAIL_CLIENT_ID       Required. OAuth 2.0 Client ID from GCP.",
    "  GMAIL_CLIENT_SECRET   Required. OAuth 2.0 Client Secret from GCP.",
    "",
    "SETUP",
    "  1. Go to https://console.cloud.google.com/apis/credentials",
    "  2. Create an OAuth 2.0 Client ID (Desktop application type works best)",
    "  3. If using Web application type, add this as an authorized redirect URI:",
    `       ${REDIRECT_URI}`,
    "  4. Enable the Gmail API at https://console.cloud.google.com/apis/library",
    `  5. Export credentials:`,
    `       export GMAIL_CLIENT_ID="your-client-id.apps.googleusercontent.com"`,
    `       export GMAIL_CLIENT_SECRET="your-client-secret"`,
    "  6. Run this script and authenticate in the browser",
    "  7. Copy the refresh token and set it as Vercel env var:",
    "       vercel env add GMAIL_REFRESH_TOKEN",
    "",
    "SCOPE",
    "  https://www.googleapis.com/auth/gmail.modify",
    "  Allows read, send, delete, and label management of Gmail messages.",
    "",
    "OUTPUT",
    "  On success the refresh token is printed to stdout. The access token",
    "  is short-lived (1 hour) and is NOT stored — the refresh token is",
    "  long-lived and used by the email-triage system to obtain new",
    "  access tokens on demand.",
    "",
  ];
  console.log(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random code verifier (base64url, no padding).
 * Recommended length: 43–128 characters.
 */
function generateCodeVerifier() {
  return base64urlEncode(crypto.randomBytes(32));
}

/**
 * Compute the S256 code challenge from a verifier.
 */
function generateCodeChallenge(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64urlEncode(hash);
}

/**
 * Base64url encode (RFC 4648 §5) — no padding, - instead of +, _ instead of /.
 */
function base64urlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// ---------------------------------------------------------------------------
// Prompt for input
// ---------------------------------------------------------------------------

function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Start local redirect server
// ---------------------------------------------------------------------------

/**
 * Start a one-shot HTTP server on localhost:REDIRECT_PORT.
 * Resolves with the authorization code extracted from the redirect URL.
 * Rejects if the request arrives with an error query parameter or no code.
 */
function startRedirectServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url || !req.url.startsWith(REDIRECT_PATH)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const parsed = new URL(req.url, REDIRECT_URI);
      const params = parsed.searchParams;

      if (params.has("error")) {
        const err = params.get("error");
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<html><body><h1>Authorization denied</h1><p>Error: ${escapeHtml(err)}</p>` +
            "<p>You can close this tab and try again.</p></body></html>"
        );
        server.close(() => reject(new Error(`OAuth error from provider: ${err}`)));
        return;
      }

      const code = params.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><h1>No authorization code received</h1><p>Please try again.</p></body></html>");
        server.close(() => reject(new Error("No authorization code in redirect")));
        return;
      }

      // Show success page
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<html><body><h1>Authorization successful!</h1>" +
          "<p>You can close this tab and return to the terminal.</p></body></html>"
      );

      // Stop accepting new connections and close
      server.close(() => resolve(code));
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${REDIRECT_PORT} is already in use. ` +
              "Please free it or change REDIRECT_PORT in the script."
          )
        );
      } else {
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, "127.0.0.1", () => {
      console.log(`\n  Listening for redirect on ${REDIRECT_URI}\n`);
    });
  });
}

// ---------------------------------------------------------------------------
// Open browser
// ---------------------------------------------------------------------------

function openBrowser(url) {
  const platform = process.platform;

  // Command to open URL per platform
  let cmd;
  let args;
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", url];
  } else {
    // Linux and others
    cmd = "xdg-open";
    args = [url];
  }

  const child = spawn(cmd, args, {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
}

// ---------------------------------------------------------------------------
// HTTPS POST helper (Node.js built-in, no npm dependency)
// ---------------------------------------------------------------------------

function postForm(urlString, bodyParams) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const body = new URLSearchParams(bodyParams).toString();

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => reject(new Error(`HTTPS request failed: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Escape HTML for the success/error page
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // --help flag
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║      Gmail OAuth — Refresh Token Bootstrap              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  // 1. Get credentials
  let clientId = process.env.GMAIL_CLIENT_ID;
  let clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId) {
    console.log("  GMAIL_CLIENT_ID not found in environment.");
    clientId = await question("  Enter your OAuth Client ID: ");
    if (!clientId) {
      console.error("\n  Error: Client ID is required.");
      process.exit(1);
    }
  }

  if (!clientSecret) {
    console.log("  GMAIL_CLIENT_SECRET not found in environment.");
    clientSecret = await question("  Enter your OAuth Client Secret: ");
    if (!clientSecret) {
      console.error("\n  Error: Client Secret is required.");
      process.exit(1);
    }
  }

  // 2. Generate PKCE challenge
  console.log("\n  Generating PKCE challenge...");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 3. Build the authorization URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",   // ensures a refresh token is returned
    prompt: "consent",        // forces consent screen so we always get a refresh token
  });
  const authUrl = `${OAUTH_AUTH_URL}?${authParams.toString()}`;

  // 4. Start the local redirect server
  console.log("  Starting local redirect server on port", REDIRECT_PORT);
  const serverPromise = startRedirectServer();

  // 5. Open the browser
  console.log("  Opening browser for authentication...");
  console.log(`\n  If the browser does not open, visit this URL manually:\n    ${authUrl}\n`);
  openBrowser(authUrl);

  // 6. Wait for the authorization code
  let authCode;
  try {
    authCode = await serverPromise;
  } catch (err) {
    console.error(`\n  ${err.message}`);
    process.exit(1);
  }

  console.log("  Authorization code received. Exchanging for tokens...");

  // 7. Exchange authorization code → access + refresh token
  const tokenResponse = await postForm(OAUTH_TOKEN_URL, {
    code: authCode,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  if (tokenResponse.status !== 200) {
    console.error(`\n  Token exchange failed (HTTP ${tokenResponse.status}):`);
    console.error(`  ${JSON.stringify(tokenResponse.body, null, 2)}`);
    console.error(
      "\n  Common issues:",
      "\n    • Invalid client ID or secret",
      "\n    • Redirect URI mismatch (check GCP Console → OAuth consent → redirect URIs)",
      "\n    • Authorization code expired (codes are valid for ~10 minutes)",
      "\n"
    );
    process.exit(1);
  }

  const tokens = tokenResponse.body;

  if (!tokens.refresh_token) {
    console.error("\n  No refresh_token in response.");
    console.error("  This usually happens when:");
    console.error("    • access_type=offline was not included in the auth URL");
    console.error("    • The user did not see the consent screen (prompt=consent fixes this)");
    console.error("    • The client is of type 'Web' and the user already consented\n");
    console.error("  Full response:");
    console.error(`  ${JSON.stringify(tokens, null, 2)}\n`);
    process.exit(1);
  }

  // 8. Output the refresh token
  console.log("\n" + "=".repeat(70));
  console.log("  ✓ TOKEN EXCHANGE SUCCESSFUL");
  console.log("=".repeat(70));
  console.log("");
  console.log("  Access token (expires in %d seconds):", tokens.expires_in);
  console.log("    %s", tokens.access_token);
  console.log("");
  console.log("  ★ REFRESH TOKEN (set this as Vercel env var):");
  console.log("    ┌─────────────────────────────────────────────────┐");
  console.log("    │  GMAIL_REFRESH_TOKEN                             │");
  console.log("    └─────────────────────────────────────────────────┘");
  console.log("");
  console.log("    %s", tokens.refresh_token);
  console.log("");
  console.log("  ─── Setup Instructions ───");
  console.log("");
  console.log("  Vercel (production):");
  console.log("    $ echo '%s' | vercel env add GMAIL_REFRESH_TOKEN production", tokens.refresh_token);
  console.log("");
  console.log("  Vercel (preview):");
  console.log("    $ echo '%s' | vercel env add GMAIL_REFRESH_TOKEN preview", tokens.refresh_token);
  console.log("");
  console.log("  Local development (.env.local):");
  console.log("    GMAIL_REFRESH_TOKEN=%s", tokens.refresh_token);
  console.log("");

  // Also show the access token expiry info
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  console.log("  (Access token expires at %s — the email-triage system", expiresAt.toISOString());
  console.log("   will automatically refresh it using the refresh token above.)");
  console.log("");
}

main().catch((err) => {
  console.error("\n  Unexpected error:", err.message);
  process.exit(1);
});
