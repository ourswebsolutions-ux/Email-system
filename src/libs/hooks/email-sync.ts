
import dotenv from "dotenv";
dotenv.config();

import crypto from 'crypto';
import https from 'https';
import dns from 'dns';

import { google } from 'googleapis';
import { HttpsProxyAgent } from 'https-proxy-agent';

import prisma from '@/db';

/* =======================================================
   GLOBAL STATE
======================================================= */
let isRunning = false;
let pendingSync = false;
let lastHistoryId: string | null = null;

dns.setDefaultResultOrder('ipv4first'); // Force IPv4 globally

// ---------------- Proxy Settings ----------------
// Replace with your working free proxy credentials

const agent = new HttpsProxyAgent('http://ooeoycus:gvtx1aw6r9d7@31.59.20.176:6754');



https.get('https://oauth2.googleapis.com/token', { agent }, (res) => {
  console.log(res.statusCode);
  res.on('data', d => process.stdout.write(d));
}).on('error', console.error);

console.log(agent.proxy.href, "Proxy agent initialized ✅");

/* =======================================================
   LOG HELPER
======================================================= */
function log(step: string) {
  console.log(`[${new Date().toISOString()}] ${step}`);
}

/* =======================================================
   RETRY HELPER
======================================================= */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      log(`⚠️ Retry ${i + 1} after error: ${err.code || err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  throw new Error('Failed after retries');
}

/* =======================================================
   GMAIL CLIENT (OAUTH2) WITH PROXY
======================================================= */
function getGmailClient() {

 const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Gmail OAuth2 credentials!');
  }

  
  const auth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  // ---------------- Proxy Wrapping ----------------
  const originalRequest = auth.request.bind(auth);

  // Wrap requests to force proxy + POST
 (auth as any).request = (opts: any) => {
  if (typeof opts === 'string') opts = { url: opts };

  // Force POST for token refresh
  opts.method = opts.method || 'POST';

  // Agent must support HTTPS tunneling
  opts.agent = agent;

  // Increase timeout for slow proxy
  opts.timeout = 60_000; // 60 seconds

  // Optional: force HTTP/1.1 if proxy has trouble with h2
  opts.headers = { ...(opts.headers || {}), 'Connection': 'keep-alive' };

  return originalRequest(opts);
};

  return google.gmail({ version: 'v1', auth });
}

/* =======================================================
   START GMAIL WATCH
======================================================= */
export async function startGmailWatch() {
  try {
    const gmail = getGmailClient();

    log('🚀 Starting Gmail watch...');

    const res = await withRetry(() =>
      gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: 'projects/web-application-488012/topics/gmail-notifications',
          labelIds: ['INBOX'],
        },
      })
    );

    lastHistoryId = res.data.historyId || null;
    log('✅ Gmail watch started');
    log(`📢 Initial historyId: ${lastHistoryId}`);

    // Auto renew before expiration (6 days)
    setTimeout(startGmailWatch, 6 * 24 * 60 * 60 * 1000);
  } catch (err) {
    log('❌ Watch start error');
    console.error(err);
  }
}

/* =======================================================
   SYNC EMAILS
======================================================= */
async function syncEmails() {
  if (isRunning) {
    pendingSync = true;
    log('⏳ Sync already running...');
    
return;
  }

  if (!lastHistoryId) {
    log('⚠️ No stored historyId. Skipping.');
    
return;
  }

  isRunning = true;
  log(`🔄 START SYNC from historyId: ${lastHistoryId}`);

  try {
    const gmail = getGmailClient();

    const historyRes = await withRetry(() =>
      gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
      })
    );

    const records = historyRes.data.history || [];

    log(`🗂️ Found ${records.length} history records`);

    for (const record of records) {
      if (!record.messagesAdded) continue;

      for (const item of record.messagesAdded) {
        const msgId = item.message?.id;

        if (!msgId) continue;

        const exists = await prisma.email.findUnique({
          where: { messageId: msgId },
          select: { id: true },
        });

        if (exists) continue;

        try {
          const full = await withRetry(() =>
            gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' })
          );

          if (!full.data || !full.data.payload) continue;

          const headers = full.data.payload.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
          const cleanEmail = (email: string) => email.match(/<(.+)>/)?.[1] || email;
          const toEmail = cleanEmail(getHeader('To'));

          const existingTo = await prisma.email.findFirst({
            where: { to: toEmail },
            select: { id: true },
          });

          const emailData = {
            uid: Number(full.data.historyId!),
            messageId: full.data.id!,
            folder: 'inbox',
            subject: getHeader('Subject'),
            fromName: getHeader('From'),
            fromEmail: cleanEmail(getHeader('From')),
            to: toEmail,
            date: new Date(Number(full.data.internalDate)),
            body: extractText(full.data.payload),
            htmlBody: extractHtml(full.data.payload),
            isRead: !full.data.labelIds?.includes('UNREAD'),
            isStarred: full.data.labelIds?.includes('STARRED'),
            labels: full.data.labelIds || [],
            hasAttachment: hasAttachments(full.data.payload),
            userId: 'cmmg6dngb000xubpw59ckz4wk',
          };

          const emptyEmail = {
            uid: Math.floor(Math.random() * 1e9),
            to: toEmail,
            userId: 'cmmg6dngb000xubpw59ckz4wk',
          };

          if (existingTo) {
            log(`🟢 Email exists, inserting only real email for ${toEmail}`);
            await prisma.email.createMany({ data: [emailData] });
          } else {
            log(`🔵 Email does not exist, inserting real + empty email for ${toEmail}`);
            await prisma.email.createMany({ data: [emailData, emptyEmail] });
          }

          log(`📥 Inserted: ${emailData.subject} ${emptyEmail.uid}`);
        } catch (err: any) {
          if (err.code === 404) log(`⚠️ Message ${msgId} deleted, skipping`);
          else log(`❌ Error fetching message ${msgId}: ${err.message}`);
        }
      }
    }

    if (historyRes.data.historyId) lastHistoryId = historyRes.data.historyId;
  } catch (err: any) {
    log('❌ Sync error');
    console.error(err);
  } finally {
    isRunning = false;
    log('🟢 END SYNC');

    if (pendingSync) {
      pendingSync = false;
      await syncEmails();
    }
  }
}

/* =======================================================
   HELPERS
======================================================= */
function extractText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data)
    return Buffer.from(payload.body.data, 'base64').toString();

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractText(part);

      if (text) return text;
    }
  }

  
return '';
}

function extractHtml(payload: any): string | null {
  if (!payload) return null;
  if (payload.mimeType === 'text/html' && payload.body?.data)
    return Buffer.from(payload.body.data, 'base64').toString();

  if (payload.parts) {
    for (const part of payload.parts) {
      const html = extractHtml(part);

      if (html) return html;
    }
  }

  
return null;
}

function hasAttachments(payload: any): boolean {
  return payload?.parts?.some((p: any) => p.filename) || false;
}

/* =======================================================
   INIT POLLING
======================================================= */
startGmailWatch().then(() => log('🏁 Gmail watcher initialized'));

setInterval(async () => {
  log('⏱️ Polling Gmail for new messages...');
  await syncEmails();
}, 30_000);
