# Roll Call — Alumni WhatsApp Broadcast

A small full-stack tool: upload your alumni CSV, write your message once with
`{{variables}}`, preview it, and send via the official WhatsApp Cloud API.

```
frontend/index.html   → the UI (open directly in a browser)
backend/server.js      → holds your token, calls the WhatsApp API
backend/.env.example   → copy to .env and fill in your credentials
```

---

## 1. Get your WhatsApp access token (the part you asked about)

You need a **permanent token**, not the temporary one Meta shows you first (that one expires in 24 hours and will break your tool daily).

**Step A — Create a Meta App**
1. Go to [developers.facebook.com](https://developers.facebook.com) and log in / register as a developer.
2. Click **Create App** → choose the **Business messaging** use case → **Connect with customers with WhatsApp**.
3. Fill in app name and contact email.

**Step B — Get to the API Setup panel**
1. Inside your app, go to **WhatsApp → API Setup**.
2. Here Meta gives you a **test phone number** and a **temporary token** — use these only to send a first test message and confirm everything is wired up.
3. Note down the **Phone Number ID** shown here — you'll need it (this is different from the actual phone number).

**Step C — Generate the permanent token (System User method)**
This is the part that makes your token stop expiring:
1. Go to **Meta Business Settings** ([business.facebook.com](https://business.facebook.com)) → **Users → System Users**.
2. Click **Add**, name it something like `alumni-broadcast-bot`, set role to **Admin**, click **Create System User**.
3. Select the system user → **Assign Assets**:
   - Under **Apps**, select your app → toggle **Full control**.
   - Under **WhatsApp Accounts**, select your WABA → toggle **Full control**.
4. Click **Generate New Token** → select your app → add these permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Click **Generate Token** and **copy it immediately** — Meta only shows it once.

**Step D — Use a real phone number**
- The test number only sends to a handful of pre-approved recipients, so for a real broadcast you need to register your own business phone number under **WhatsApp → API Setup → Add phone number** (requires a payment method on the Business Account, and this number can't be active on a personal WhatsApp app at the same time).

**Step E — Put the credentials in `.env`**
```
WHATSAPP_TOKEN=the_permanent_token_from_step_c
WHATSAPP_PHONE_NUMBER_ID=the_id_from_step_b
```

**Sending limits:** new numbers start at a messaging tier (commonly 1,000 unique contacts/24h at the current default), which increases automatically as you send successfully and complete business verification. Don't blast your full 5,000-contact list on day one — the backend already paces sends with a small delay, but plan your first broadcasts in smaller batches.

---

## 2. Create and get your template approved

Any message to someone who hasn't messaged you first must use a **pre-approved template**. In the Meta App Dashboard:
1. Go to **WhatsApp → Message Templates → Create Template**.
2. Category: usually **Marketing** or **Utility**.
3. Body, using numbered placeholders, e.g.:
   ```
   Hi {{1}}, this is [Your Alumni Association]. We're organizing {{2}} on {{3}}. Reply YES to confirm.
   ```
4. Submit for review — usually approved within a few hours to a couple of days.
5. Once approved, note the **template name** (not the display text) — that's what goes in the frontend's "Approved template name" field.

Important: the template's `{{1}}`, `{{2}}`, `{{3}}` placeholders are filled **in order** by whatever your backend sends as `parameters`. In `server.js`, that order is `name`, then whatever's in `templateParams` (currently `event`, `date`, `link`) — so make sure your template's placeholder order matches, or adjust `server.js`'s `params` object to match your template.

---

## 3. Run it

**Backend:**
```bash
cd backend
cp .env.example .env      # then fill in your real token + phone number ID
npm install
npm start
```
Runs on `http://localhost:3000`.

**Frontend:**
Just open `frontend/index.html` in your browser (double-click it, or serve it with any static server). It's already pointed at `http://localhost:3000/api/send-broadcast` — change the `BACKEND_URL` constant near the top of the `<script>` tag if you deploy the backend elsewhere.

**Using it:**
1. Drop in your CSV (needs a `name` column and a `phone`/`mobile`/`number` column).
2. Type your message using the `{{name}}`, `{{event}}`, `{{date}}`, `{{link}}` chips to insert variables.
3. Fill in the actual values for event/date/link in the fields below the chips.
4. Check the live preview bubble.
5. Enter your approved template name and click **Send Broadcast** — the log at the bottom shows delivery status per contact.

---

## 4. Security notes

- **Never put `WHATSAPP_TOKEN` in the frontend file.** It's only ever read by `server.js` on your machine/server via `.env`. Anyone who can view your page source could otherwise steal it and send messages — and spam — as your organization.
- Don't commit `.env` to git — it's already excluded by the `.env.example` pattern; add a `.gitignore` with `.env` in it if you set up a repo.
- In production, restrict CORS in `server.js` to your actual frontend's domain instead of allowing all origins.
