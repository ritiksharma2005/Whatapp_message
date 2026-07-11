// server.js
// Backend for Roll Call — Alumni Broadcast
// Holds your WhatsApp access token securely (never expose it in frontend code)
// and forwards send requests to Meta's WhatsApp Cloud API.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // for local dev; restrict origin in production, see README
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  PORT = 3000
} = process.env;

if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.warn('⚠️  WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing from .env — requests will fail until set.');
}

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Simple delay helper so we don't hammer the API faster than Meta's rate limits allow
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendTemplateMessage(toNumber, templateName, params) {
  const payload = {
    messaging_product: 'whatsapp',
    to: toNumber,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: Object.values(params).map((value) => ({
            type: 'text',
            text: value || ''
          }))
        }
      ]
    }
  };

  const res = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}

app.post('/api/send-broadcast', async (req, res) => {
  const { templateName, templateParams = {}, contacts = [] } = req.body;

  if (!templateName) {
    return res.status(400).json({ error: 'templateName is required (must match an approved Meta template).' });
  }
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'contacts array is required and cannot be empty.' });
  }

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const params = {
      name: contact.name || '',
      ...templateParams
    };

    try {
      await sendTemplateMessage(contact.phone, templateName, params);
      results.push({ phone: contact.phone, status: 'ok' });
      sent += 1;
    } catch (err) {
      results.push({ phone: contact.phone, status: 'fail', error: err.message });
      failed += 1;
    }

    // Small pacing delay — tune this based on your WABA's messaging tier.
    // At the entry tier (250 unique contacts/24h) you have plenty of headroom
    // for a batch of a few thousand spread over the day; do not blast all
    // at once on a brand-new number.
    await sleep(300);
  }

  res.json({ sent, failed, results });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Roll Call backend running on http://localhost:${PORT}`);
});
