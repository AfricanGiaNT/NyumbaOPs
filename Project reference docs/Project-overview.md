---

# 📁 NyumbaOps

**Industry:** Real Estate / Hospitality (Short-term Rentals)

**Project Type:** Dashboard + Website + Bot (Operations & Finance System)

**Complexity:** ⭐⭐⭐⭐ (Medium–Complex)

**Timeline:** 12–16 weeks (phased, no hard deadline)

**Status:** 🔴 Planning

**Live Demo:** —

**GitHub Repo:** —

**Case Study:** —

---

## 📋 Quick Summary

**One-sentence description:**
An operations and finance system for short-term rental owners to track income, expenses, and profit per property, while enabling local customers to book apartments online.

**Key Technologies (planned):**

- Web dashboard (modern JS framework)
- Backend API (clean, scalable)
- Telegram Bot (internal automation)

**Main Features:**

- Property-based income & expense tracking
- Profit dashboard (overall + per property)
- Local booking website with payments
- Telegram bot for quick financial actions

---

# PHASE 1: Discovery & Understanding

## 🏢 Fictional Client Profile

**Company Name:** Nyumba Stays (working name)

**Industry:** Short-term rentals / Hospitality

**Size:** 1 owner + 1 caretaker/manager

**Location:** Malawi

**Years in Business:** 2–5 years

### Current Situation

**What they do:**
Operate multiple Airbnb apartments catering to international guests, while also renting to local customers through manual inquiries.

**How they currently operate:**

- Airbnb handles international bookings
- Local customers inquire via WhatsApp
- Payments received via bank, cash, or mobile money
- Financial tracking done manually via bank statements and memory

**Tools they currently use:**

- Airbnb platform
- WhatsApp
- Bank statements
- Manual processes: mental tracking, rough estimates, occasional notes

---

## 🔴 Pain Points Identified

### Pain Point #1: Lack of Financial Clarity per Property

**Description:**
The owner cannot easily see how much each property makes, how much is spent on it, or its actual profit.

**Current Impact:**

- Time wasted: ~5–8 hours/week
- Money lost: Unknown (leakage not visible)
- Error rate: High (manual tracking)
- Staff affected: Owner + caretaker

**Current Workaround:**
Manual review of bank statements and mental accounting.

---

### Pain Point #2: Manual Local Booking Process

**Description:**
Local customers must message, ask for photos, prices, availability, and payment instructions manually.

**Current Impact:**

- Time wasted: ~3–5 hours/week
- Lost bookings due to slow response
- Repetitive communication

**Current Workaround:**
WhatsApp conversations and manual follow-ups.

---

### Pain Point #3: No Single Source of Truth

**Description:**
Bookings, income, and expenses live in different places with no unified view.

**Current Impact:**

- Poor decision-making
- Stress and uncertainty
- No reliable monthly or yearly reports

**Current Workaround:**
Rough estimates and intuition.

---

## 🎯 Business Goals

**Primary Goal:**
Gain clear, real-time visibility into income, expenses, and profit per property.

**Secondary Goals:**

- Reduce time spent on admin work
- Make local bookings fast and professional
- Build a foundation that can scale to other property owners later

**Success Metrics:**

- Reduce admin time by 60–70%
- Know profit per property at any time
- Reduce local booking response time to under 5 minutes

---

## 💰 Budget & Timeline Assumptions

**Assumed Budget:** $0–$50/month (infrastructure & services)

**Timeline Requirement:** Flexible, phased delivery

**Critical Deadline:** None

---

# PHASE 2: Solution Design

## 🎨 Solution Overview

**High-Level Description:**
NyumbaOps will be a unified operations system consisting of an internal dashboard, a public-facing local booking website, and a Telegram bot. The dashboard will serve as the system of record for properties, bookings, income, and expenses. The website will allow local customers to view apartments, prices, and book/pay online. The Telegram bot will provide fast internal access to summaries and quick data entry.

The system is designed to prioritize clarity, simplicity, and mobile usability, while remaining clean and scalable for future expansion into a multi-tenant SaaS.

**Why This Approach:**
Existing tools solve parts of the problem but not the whole workflow. A custom, property-aware system tailored to the Malawian context provides maximum clarity with minimal complexity.

---

## 🏗️ System Architecture

**Architecture Type:** Modular Monolith (scalable by design)

**Components:**

1. **Frontend/Interface:** Web dashboard + public website (mobile-first)
2. **Backend/API:** Central API handling business logic
3. **Database:** Relational database with property-centric schema
4. **External Services:** Payments, email, messaging
5. **Automation Layer:** Telegram Bot for internal operations

**Architecture Diagram:**
(To be created – high-level system diagram)

---

## 🔧 Technical Stack (Proposed)

### Frontend

- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **State Management:** Zustand / React Context

### Backend

- **Language:** Node.js / TypeScript
- **Framework:** NestJS or Express (clean architecture)
- **API Type:** REST

### Database

- **Type:** SQL
- **System:** PostgreSQL
- **ORM:** Prisma

### Infrastructure

- **Hosting:** DigitalOcean / Railway
- **Domain:** TBD
- **SSL:** Cloudflare
- **CDN:** Cloudflare

### Integrations

- Telegram Bot API
- Mobile money (future)
- Email service (transactional)

### Development Tools

- Version Control: Git + GitHub
- Package Manager: npm / pnpm
- Testing: Jest / Playwright
- Deployment: CI/CD via GitHub Actions

---

## ✨ Features List

### Must-Have Features (MVP)

### Feature 1: Property & Financial Tracking

**Description:** Track income and expenses linked to each property.

**User Story:** As an owner, I want to log income and expenses per property so that I can see real profit.

**Acceptance Criteria:**

- [ ]  Properties can be created and managed
- [ ]  Income entries support multiple payment methods
- [ ]  Expenses are categorized and property-linked

**Technical Notes:** Relational schema with strong indexing.

---

### Feature 2: Financial Dashboard

**Description:** Visual overview of revenue, expenses, and profit.

**User Story:** As an owner, I want to instantly see how my business is performing.

**Acceptance Criteria:**

- [ ]  Overall summary
- [ ]  Per-property breakdown
- [ ]  Monthly filtering

---

### Feature 3: Local Booking Website

**Description:** Public site for locals to view and book apartments.

**User Story:** As a local customer, I want to see available apartments and book easily.

**Acceptance Criteria:**

- [ ]  Property listing pages
- [ ]  Booking request + payment
- [ ]  Mobile-friendly UI

---

### Nice-to-Have Features

- Expense receipts upload
- Availability calendar sync
- Multi-language support
- SaaS multi-tenant mode

---

## 👥 User Roles & Permissions

### Role 1: Admin/Owner

**Who:** Business owner

**Permissions:** Full access

**Primary Tasks:** Financial review, configuration, decision-making

---

### Role 2: Staff/Manager

**Who:** Caretaker/manager

**Permissions:** Full visibility, limited configuration

**Primary Tasks:** Log expenses, manage bookings

---

### Role 3: Customer/Public User

**Who:** Local customers

**Permissions:** View listings, make bookings

**Primary Tasks:** Browse, book, pay

---

*(Next steps: workflows, database schema, bot design, milestones)*

# 🔄 Key Workflows

## Workflow 1: Recording Income (Airbnb, Local, Mobile Money)

**Current Manual Process:**

1. Airbnb sends payout to bank – 0 min (automatic)
2. Owner checks bank statement days later – 10–15 min
3. Tries to remember which property the payout was for – 5–10 min
4. Mentally estimates totals – ongoing

**Total Time:** ~20–30 minutes per payout

**Frequency:** Weekly / bi-weekly

**Monthly Time Cost:** ~4–6 hours

**New Automated Process:**

1. Owner or manager logs income via dashboard or Telegram bot – 30–60 seconds
2. Select property, source, amount, date
3. System automatically updates totals and profit

**Total Time:** <1 minute

**Time Saved:** ~20 minutes per entry

**Monthly Time Saved:** ~4–5 hours

---

## Workflow 2: Recording Expenses (Caretaker & Owner)

**Current Manual Process:**

1. Expense paid in cash or mobile money – 0 min
2. Receipt may be lost or ignored – —
3. Expense forgotten or mixed with others – —
4. Owner later tries to reconstruct spending – 10–20 min

**Total Time:** Unbounded / error-prone

**Frequency:** Multiple times per week

**New Automated Process:**

1. Caretaker logs expense immediately via dashboard or Telegram bot – 30–60 seconds
2. Select property, category, amount, optional note/photo
3. Owner sees expense instantly reflected

**Total Time:** <1 minute

**Errors Reduced:** Significant (near-zero forgotten expenses)

---

## Workflow 3: Local Booking via Website

**Current Manual Process:**

1. Customer sends WhatsApp message – —
2. Asks for photos, prices, availability – 10–20 min back-and-forth
3. Payment instructions sent manually – 5 min
4. Booking details tracked mentally or in chat – —

**Total Time:** ~30–45 minutes per booking

**Frequency:** Multiple times per week

**New Automated Process:**

1. Customer visits website and views apartment
2. Selects dates and submits booking + payment
3. Booking saved in system automatically
4. Owner notified via Telegram bot

**Total Time:** ~2–3 minutes (mostly customer-driven)

**Time Saved:** ~30+ minutes per booking

---

## Workflow 4: Financial Review & Decision-Making

**Current Manual Process:**

1. Open bank statements – 10 min
2. Try to remember expenses – 10 min
3. Estimate profit – unreliable

**Frequency:** Monthly

**New Automated Process:**

1. Open dashboard
2. Filter by month or property
3. View revenue, expenses, and profit instantly

**Total Time:** <1 minute

**Decision Quality:** High confidence, data-backed

---

## 🗄️ Database Schema

[**🗄️ DATABASE SCHEMA (MVP)**](https://www.notion.so/DATABASE-SCHEMA-MVP-2e37677bc6968075921dc56a65b3bd10?pvs=21)

---

## 📱 Telegram Bot (if applicable)

### 

## 🎯 Bot Purpose

The Telegram bot is an **internal, owner-first tool** designed to:

- Log income & expenses in seconds
- Give instant financial visibility
- Notify you of important events (new bookings, inquiries)

It is **not** customer-facing.

---

## 🤖 Bot Commands

| Command | Description | Example |
| --- | --- | --- |
| /start | Initializes the bot and verifies user access | `/start` |
| /help | Shows available commands and usage | `/help` |
| /summary | Shows overall business summary (current month) | `/summary` |
| /properties | Lists all properties with quick stats | `/properties` |
| /property | Shows detailed stats for one property | `/property Area43` |
| /add_income | Logs a new income transaction | `/add_income` |
| /add_expense | Logs a new expense transaction | `/add_expense` |
| /bookings | Shows recent bookings | `/bookings` |

---

## 🔐 Access Control (Important)

- Only **pre-approved Telegram user IDs** can use the bot
- On `/start`, the bot checks:
    - Telegram user ID exists in `users` table
    - Role ∈ {Owner, Manager}
- Unauthorized users receive a denial message

---

## 🔄 Bot Workflows

---

### 🧾 Workflow 1: Log Income

**Trigger:**

User sends `/add_income`

**Steps:**

1. Bot: “Enter amount (MWK):”
2. User: `150000`
3. Bot: “Select property:”
    
    (Inline buttons: Area 43, Area 10, …)
    
4. Bot: “Select source:”
    
    (Airbnb / Local / Cash / Mobile Money)
    
5. Bot: “Optional note?”
6. Bot creates a new **INCOME transaction**
7. Bot confirms:

**Final Outcome:**

```
✅Incomerecorded
🏠Area43
💰MWK150,000
📅Today

```

**DB Action:**

- Insert into `transactions` table
- `type = INCOME`

---

### 💸 Workflow 2: Log Expense

**Trigger:**

User sends `/add_expense`

**Steps:**

1. Bot: “Enter amount (MWK):”
2. User: `45000`
3. Bot: “Select property:”
4. Bot: “Select expense category:”
    
    (Utilities, Repairs, Cleaning, Fuel, etc.)
    
5. Bot: “Optional note?”
6. Bot creates **EXPENSE transaction**
7. Bot confirms

**Final Outcome:**

```
❌Expenserecorded
🏠Area10 –Studio
🧾Utilities
💰MWK45,000

```

---

### 📊 Workflow 3: Business Summary

**Trigger:**

User sends `/summary`

**Steps:**

1. Bot calls `/analytics/summary`
2. Bot formats response

**Final Outcome:**

```
📊BusinessSummary(ThisMonth)

💰Income:MWK2,450,000
❌Expenses:MWK900,000
📈Profit:MWK1,550,000

```

---

### 🏠 Workflow 4: Property Overview

**Trigger:**

User sends `/properties`

**Steps:**

1. Bot fetches all properties
2. Shows inline buttons

**User taps property**

1. Bot fetches `/analytics/profit-by-property`

**Final Outcome:**

```
🏠Area43–HouseA

💰Income:MWK850,000
❌Expenses:MWK300,000
📈Profit:MWK550,000

```

---

### 📅 Workflow 5: View Bookings

**Trigger:**

User sends `/bookings`

**Steps:**

1. Bot fetches recent bookings
2. Shows last X bookings

**Final Outcome:**

```
📅 Recent Bookings

• Area43 –3 nights (Local)
• Area10 –2 nights (Airbnb)

```

---

### 🔔 Workflow 6: New Booking / Inquiry Notification

**Trigger:**

- New local inquiry submitted on website
- New booking created in system

**Steps:**

1. Backend emits event
2. Bot sends notification

**Final Outcome:**

```
🔔New Booking Request

🏠 Area43
📅12–15 Oct
👤Local Guest

```

---

- `--
## ❌ /cancel Command
### Overview
Allow users to abort any ongoing multi-step operation and return to the main menu.
### Use Cases
User starts adding expense but changes mind
User is in wrong conversation flow
User wants to start over with different action
User accidentally triggered a command
### Command Behavior
*During Any Multi-Step Flow:**`

User: /add_expense

Bot: "Select property:"
[Area 43 – House A]
[Area 10 – Studio]
[Area 43 – Cottage]
[General (All Properties)]

User: /cancel

Bot: "❌ Operation cancelled.

 `No changes were made.

 What would you like to do?

 [📊 Summary] [➕ Add Income]
 [➖ Add Expense] [📅 Bookings]"`

`**When No Operation in Progress:**`

User: /cancel

Bot: "ℹ️ Nothing to cancel.

 `What would you like to do?

 [📊 Summary] [➕ Add Income]
 [➖ Add Expense] [📅 Bookings]"`

`### Supported Flows to Cancel

| Flow | Cancel Point | Data Discarded |
|------|--------------|----------------|
| /add_income | Any step | All entered data |
| /add_expense | Any step | All entered data |
| /add_booking | Any step | All entered data |
| /checkin | Property selection | None |
| /checkout | Property selection | None |
| Property selection | During selection | None |
| Amount entry | During entry | Previous selections |
| Date selection | During selection | Previous entries |
| Confirmation | Before confirm | All entered data |

### Implementation

**Conversation State Management:**
```typescript
interface ConversationState {
  userId: string;
  currentFlow: string | null;  // 'add_income', 'add_expense', etc.
  step: number;
  data: Record<string, any>;
  startedAt: Date;
}

// Store in Redis or in-memory cache
const conversationStates = new Map<string, ConversationState>();

async function handleCancel(chatId: string, userId: string): Promise<void> {
  const state = conversationStates.get(userId);
  
  if (state && state.currentFlow) {
    // Clear the conversation state
    conversationStates.delete(userId);
    
    await bot.sendMessage(chatId, 
      "❌ Operation cancelled.\n\nNo changes were made.\n\nWhat would you like to do?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 Summary", callback_data: "summary" },
              { text: "➕ Add Income", callback_data: "add_income" }
            ],
            [
              { text: "➖ Add Expense", callback_data: "add_expense" },
              { text: "📅 Bookings", callback_data: "bookings" }
            ]
          ]
        }
      }
    );
  } else {
    await bot.sendMessage(chatId,
      "ℹ️ Nothing to cancel.\n\nWhat would you like to do?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 Summary", callback_data: "summary" },
              { text: "➕ Add Income", callback_data: "add_income" }
            ],
            [
              { text: "➖ Add Expense", callback_data: "add_expense" },
              { text: "📅 Bookings", callback_data: "bookings" }
            ]
          ]
        }
      }
    );
  }
}
```

### Cancel Button in Flows

Add cancel button to all multi-step flows:`

Bot: "Enter amount (MWK):"

 `[Cancel]`

````typescript
const cancelButton = { text: "❌ Cancel", callback_data: "cancel" };

// Add to every step's keyboard
const keyboard = {
  inline_keyboard: [
    [/* step-specific buttons */],
    [cancelButton]
  ]
};
```

### Timeout Auto-Cancel

Automatically cancel stale conversations:
```typescript
const CONVERSATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Check periodically
setInterval(() => {
  const now = Date.now();
  
  for (const [userId, state] of conversationStates.entries()) {
    if (now - state.startedAt.getTime() > CONVERSATION_TIMEOUT) {
      conversationStates.delete(userId);
      
      // Optionally notify user
      bot.sendMessage(state.chatId,
        "⏰ Your previous operation timed out.\n\nType /start to begin again."
      );
    }
  }
}, 60000); // Check every minute
```

### Command Registration
```typescript
bot.onText(/\/cancel/, async (msg) => {
  await handleCancel(msg.chat.id, msg.from.id.toString());
});

// Also handle callback
bot.on('callback_query', async (query) => {
  if (query.data === 'cancel') {
    await bot.answerCallbackQuery(query.id);
    await handleCancel(query.message.chat.id, query.from.id.toString());
  }
});
```
---`

---

## ↩️ /undo Command

### Overview

Allow users to quickly delete the last transaction they created via the bot, with a time limit for safety.

### Constraints

- Only works within 5 minutes of creating a transaction
- Only works for transactions created via Telegram bot
- Only deletes the single most recent transaction
- Requires confirmation before deletion
- Cannot undo an undo

### Command Flow

**Successful Undo (Within Time Limit):**
User: /undo
Bot: "↩️ Undo Last Transaction?
Your last transaction:
─────────────────────
➖ Expense: MWK 45,000
📁 Utilities (ESCOM)
🏠 Area 43 – House A
📅 15 Jan 2026
🕐 Added 2 minutes ago
─────────────────────

Are you sure you want to delete this?

[Yes, Delete] [No, Keep It]"
User: [Yes, Delete]
Bot: "✅ Transaction deleted.
MWK 45,000 expense has been removed.

[📊 View Summary] [➕ Add New]"

**Outside Time Limit:**
User: /undo
Bot: "⏰ Cannot undo.
Your last transaction was added
more than 5 minutes ago.

To delete older transactions,
please use the dashboard.

[📊 Summary] [🏠 Dashboard]"

**No Recent Transaction:**
User: /undo
Bot: "ℹ️ Nothing to undo.
You haven't added any transactions
via Telegram recently.

[📊 Summary] [➕ Add Income]"

**Transaction Already Modified:**
User: /undo
Bot: "⚠️ Cannot undo.
Your last transaction has been
modified in the dashboard and
can no longer be undone here.

[🏠 Open Dashboard]"

### Implementation

**Track Bot-Created Transactions:**

Add to `transactions` table:

```sql
created_via VARCHAR(20) DEFAULT 'DASHBOARD',  -- 'DASHBOARD', 'TELEGRAM', 'IMPORT'
telegram_message_id BIGINT NULL               -- For reference

```

**Undo Logic:**

```tsx
interface UndoableTransaction {
  id: string;
  userId: string;
  createdAt: Date;
  telegramMessageId?: number;
}

// Store last transaction per user (in-memory or Redis)
const lastTransactions = new Map<string, UndoableTransaction>();

const UNDO_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes

async function handleUndo(chatId: number, oduserId: string): Promise<void> {
  const lastTx = lastTransactions.get(userId visually);

  // Check if exists
  if (!lastTx) {
    await bot.sendMessage(chatId,
      "ℹ️ Nothing to undo.\\n\\nYou haven't added any transactions via Telegram recently.",
      { reply_markup: mainMenuKeyboard }
    );
    return;
  }

  // Check time limit
  const timeSinceCreation = Date.now() - lastTx.createdAt.getTime();
  if (timeSinceCreation > UNDO_TIME_LIMIT) {
    await bot.sendMessage(chatId,
      "⏰ Cannot undo.\\n\\nYour last transaction was added more than 5 minutes ago.\\n\\nTo delete older transactions, please use the dashboard.",
      { reply_markup: dashboardLinkKeyboard }
    );
    return;
  }

  // Fetch transaction details for confirmation
  const transaction = await prisma.transaction.findUnique({
    where: { id: lastTx.id },
    include: { property: true, category: true }
  });

  if (!transaction) {
    await bot.sendMessage(chatId,
      "⚠️ Transaction not found.\\n\\nIt may have already been deleted.",
      { reply_markup: mainMenuKeyboard }
    );
    lastTransactions.delete(userId);
    return;
  }

  // Check if modified since creation
  if (transaction.updatedAt > transaction.createdAt) {
    await bot.sendMessage(chatId,
      "⚠️ Cannot undo.\\n\\nYour last transaction has been modified in the dashboard and can no longer be undone here.",
      { reply_markup: dashboardLinkKeyboard }
    );
    return;
  }

  // Show confirmation
  const timeAgo = formatTimeAgo(lastTx.createdAt);
  const typeIcon = transaction.type === 'INCOME' ? '➕' : '➖';
  const typeLabel = transaction.type === 'INCOME' ? 'Income' : 'Expense';
  const amount = formatCurrency(transaction.amount, transaction.currency);

  await bot.sendMessage(chatId,
    `↩️ Undo Last Transaction?\\n\\nYour last transaction:\\n─────────────────────\\n${typeIcon} ${typeLabel}: ${amount}\\n📁 ${transaction.category.name}\\n🏠 ${transaction.property?.name || 'General'}\\n📅 ${formatDate(transaction.date)}\\n🕐 Added ${timeAgo}\\n─────────────────────\\n\\nAre you sure you want to delete this?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Yes, Delete", callback_data: `undo_confirm_${transaction.id}` },
            { text: "No, Keep It", callback_data: "undo_cancel" }
          ]
        ]
      }
    }
  );
}

async function confirmUndo(chatId: number, userId: string, transactionId: string): Promise<void> {
  const lastTx = lastTransactions.get(userId);

  // Verify it's still the same transaction
  if (!lastTx || lastTx.id !== transactionId) {
    await bot.sendMessage(chatId,
      "⚠️ This transaction can no longer be undone.",
      { reply_markup: mainMenuKeyboard }
    );
    return;
  }

  // Re-check time limit
  const timeSinceCreation = Date.now() - lastTx.createdAt.getTime();
  if (timeSinceCreation > UNDO_TIME_LIMIT) {
    await bot.sendMessage(chatId,
      "⏰ Time limit exceeded.\\n\\nThis transaction can no longer be undone.",
      { reply_markup: mainMenuKeyboard }
    );
    lastTransactions.delete(userId);
    return;
  }

  // Delete the transaction
  const transaction = await prisma.transaction.delete({
    where: { id: transactionId }
  });

  // Clear from undo history
  lastTransactions.delete(userId);

  // Create audit log
  await createAuditLog({
    action: 'TRANSACTION_DELETED',
    resourceType: 'transaction',
    resourceId: transactionId,
    userId,
    details: {
      method: 'telegram_undo',
      amount: transaction.amount,
      type: transaction.type
    }
  });

  const amount = formatCurrency(transaction.amount, transaction.currency);
  const typeLabel = transaction.type === 'INCOME' ? 'income' : 'expense';

  await bot.sendMessage(chatId,
    `✅ Transaction deleted.\\n\\n${amount} ${typeLabel} has been removed.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 View Summary", callback_data: "summary" },
            { text: "➕ Add New", callback_data: "add_transaction" }
          ]
        ]
      }
    }
  );
}

```

### After Creating Transaction

When a transaction is created via bot, store it for undo:

```tsx
async function createTransactionFromBot(
  userId: string,
  data: TransactionInput,
  chatId: number,
  messageId: number
): Promise<Transaction> {
  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      createdVia: 'TELEGRAM',
      telegramMessageId: messageId
    }
  });

  // Store for undo
  lastTransactions.set(userId, {
    id: transaction.id,
    oduserId: userId,
    createdAt: new Date(),
    telegramMessageId: messageId
  });

  return transaction;
}

```

### Success Message with Undo Hint

After adding a transaction, show undo option:
Bot: "✅ Expense Added!
➖ MWK 45,000
📁 Utilities (ESCOM)
🏠 Area 43 – House A
📅 15 Jan 2026

💡 Type /undo within 5 minutes
to remove this transaction.

[📊 Summary] [➕ Add Another]"

### Command Registration

```tsx
bot.onText(/\\/undo/, async (msg) => {
  await handleUndo(msg.chat.id, msg.from.id.toString());
});

bot.on('callback_query', async (query) => {
  if (query.data?.startsWith('undo_confirm_')) {
    const transactionId = query.data.replace('undo_confirm_', '');
    await bot.answerCallbackQuery(query.id);
    await confirmUndo(query.message.chat.id, query.from.id.toString(), transactionId);
  } else if (query.data === 'undo_cancel') {
    await bot.answerCallbackQuery(query.id, { text: 'Kept!' });
    await bot.sendMessage(query.message.chat.id,
      "✓ Transaction kept.\\n\\nWhat would you like to do?",
      { reply_markup: mainMenuKeyboard }
    );
  }
});

```

### Database Migration

```sql
ALTER TABLE transactions ADD COLUMN created_via VARCHAR(20) DEFAULT 'DASHBOARD';
ALTER TABLE transactions ADD COLUMN telegram_message_id BIGINT NULL;

```

---

---

## 📊 Weekly Summary Report

### Overview

Send an optional weekly digest summarizing business performance, sent every Monday morning.

### Opt-in Setting

**Enable via Telegram:**
User: /settings
Bot: "⚙️ Bot Settings
📊 Daily Summary: ✅ Enabled
📅 Weekly Report: ❌ Disabled
🔔 Booking Alerts: ✅ Enabled

Tap to toggle:"

[Daily Summary ✅]
[Weekly Report ❌]
[Booking Alerts ✅]
User: [Weekly Report ❌]
Bot: "✅ Weekly Report enabled!
You'll receive a summary every
Monday at 8:00 AM.

[Back to Settings]"

### Database Schema Addition

**Add to `notification_settings` table:**

```sql
weekly_summary_telegram BOOLEAN DEFAULT false,
weekly_summary_day INTEGER DEFAULT 1,  -- 0=Sun, 1=Mon, ..., 6=Sat
weekly_summary_hour INTEGER DEFAULT 8  -- Hour to send (0-23)

```

### Weekly Report Content

📊 Weekly Summary
11 – 17 Jan 2026
─────────────────────────
💰 INCOME
─────────────────────────
🇲🇼 MWK
This Week:    MWK 650,000
Last Week:    MWK 580,000
Change:       ↑ 12%
🇬🇧 GBP
This Week:    £160.00
Last Week:    £0.00
─────────────────────────
❌ EXPENSES
─────────────────────────
This Week:    MWK 245,000
Last Week:    MWK 310,000
Change:       ↓ 21%
─────────────────────────
📈 PROFIT
─────────────────────────
🇲🇼 MWK
This Week:    MWK 405,000
Last Week:    MWK 270,000
Change:       ↑ 50%
🇬🇧 GBP
This Week:    £160.00
─────────────────────────
🏠 BY PROPERTY
─────────────────────────
Area 43 – House A
Income:  MWK 350,000
Expense: MWK 120,000
Profit:  MWK 230,000 ✓
Area 10 – Studio
Income:  MWK 200,000
Expense: MWK 75,000
Profit:  MWK 125,000 ✓
Area 43 – Cottage
Income:  MWK 100,000
Expense: MWK 50,000
Profit:  MWK 50,000 ✓
─────────────────────────
📅 BOOKINGS
─────────────────────────
New Inquiries:     5
Confirmed:         3
Check-ins:         4
Check-outs:        3
Cancellations:     0
Occupancy Rate:    68%
(vs 54% last week)
─────────────────────────
📌 HIGHLIGHTS
─────────────────────────
✓ Best week this month!
✓ Expenses down 21%
✓ Area 43 House A top performer
⚠️ 2 inquiries pending response
─────────────────────────
[View Dashboard] [Disable Report]

### Compact Version (Optional)

For users who prefer brevity:
📊 Week of 11-17 Jan
💰 MWK 650K (+12%) | £160
❌ MWK 245K (-21%)
📈 MWK 405K (+50%) | £160
📅 5 inquiries, 3 bookings
🏠 68% occupancy
[Details] [Dashboard]

### Scheduled Job

```tsx
// Run every day at configured hours
// Check if it's the user's weekly summary day

async function sendWeeklyReports(): Promise<void> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0-6
  const hour = today.getHours();

  // Find users who want weekly summary today at this hour
  const users = await prisma.user.findMany({
    where: {
      notificationSettings: {
        weekly_summary_telegram: true,
        weekly_summary_day: dayOfWeek,
        weekly_summary_hour: hour
      },
      telegramChatId: { not: null }
    },
    include: {
      notificationSettings: true
    }
  });

  for (const user of users) {
    try {
      const report = await generateWeeklyReport(user.id);
      await sendTelegramMessage(user.telegramChatId, report);

      // Log success
      await prisma.auditLog.create({
        data: {
          action: 'WEEKLY_REPORT_SENT',
          resourceType: 'user',
          resourceId: user.id,
          details: { method: 'telegram' }
        }
      });
    } catch (error) {
      console.error(`Failed to send weekly report to user ${user.id}:`, error);
    }
  }
}

// Schedule: Run every hour on the hour
cron.schedule('0 * * * *', sendWeeklyReports);

```

### Report Generation

```tsx
interface WeeklyReportData {
  period: { start: Date; end: Date };
  current: {
    income: { MWK: number; GBP: number };
    expenses: { MWK: number; GBP: number };
    profit: { MWK: number; GBP: number };
  };
  previous: {
    income: { MWK: number; GBP: number };
    expenses: { MWK: number; GBP: number };
    profit: { MWK: number; GBP: number };
  };
  byProperty: Array<{
    name: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
  bookings: {
    newInquiries: number;
    confirmed: number;
    checkIns: number;
    checkOuts: number;
    cancellations: number;
    occupancyRate: number;
    previousOccupancyRate: number;
  };
  highlights: string[];
}

async function generateWeeklyReport(userId: string): Promise<string> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);

  // Fetch current week data
  const currentData = await getWeekData(userId, weekStart, weekEnd);
  const previousData = await getWeekData(userId, prevWeekStart, prevWeekEnd);

  // Calculate changes
  const incomeChange = calculatePercentChange(
    previousData.income.MWK,
    currentData.income.MWK
  );
  const expenseChange = calculatePercentChange(
    previousData.expenses.MWK,
    currentData.expenses.MWK
  );
  const profitChange = calculatePercentChange(
    previousData.profit.MWK,
    currentData.profit.MWK
  );

  // Generate highlights
  const highlights = generateHighlights(currentData, previousData);

  // Format message
  return formatWeeklyReport({
    period: { start: weekStart, end: weekEnd },
    current: currentData,
    previous: previousData,
    changes: { incomeChange, expenseChange, profitChange },
    highlights
  });
}

function generateHighlights(
  current: WeekData,
  previous: WeekData
): string[] {
  const highlights: string[] = [];

  // Profit increase
  if (current.profit.MWK > previous.profit.MWK * 1.2) {
    highlights.push('✓ Great week! Profit up significantly');
  }

  // Expense decrease
  if (current.expenses.MWK < previous.expenses.MWK * 0.9) {
    highlights.push('✓ Expenses down this week');
  }

  // High occupancy
  if (current.bookings.occupancyRate > 70) {
    highlights.push('✓ Strong occupancy rate');
  }

  // Top performer
  const topProperty = current.byProperty.sort((a, b) => b.profit - a.profit)[0];
  if (topProperty) {
    highlights.push(`✓ ${topProperty.name} top performer`);
  }

  // Pending inquiries warning
  if (current.bookings.pendingInquiries > 0) {
    highlights.push(`⚠️ ${current.bookings.pendingInquiries} inquiries pending response`);
  }

  // Loss warning
  const losingProperties = current.byProperty.filter(p => p.profit < 0);
  if (losingProperties.length > 0) {
    highlights.push(`⚠️ ${losingProperties.length} property running at loss`);
  }

  return highlights.slice(0, 5); // Max 5 highlights
}

```

### Disable from Report

Include disable button in each report:

```tsx
const keyboard = {
  inline_keyboard: [
    [
      { text: "📊 View Dashboard", url: "<https://app.nyumbaops.com/dashboard>" },
      { text: "🔕 Disable Report", callback_data: "disable_weekly_report" }
    ]
  ]
};

// Handle disable
bot.on('callback_query', async (query) => {
  if (query.data === 'disable_weekly_report') {
    await prisma.notificationSettings.update({
      where: { userId: query.from.id.toString() },
      data: { weekly_summary_telegram: false }
    });

    await bot.answerCallbackQuery(query.id, {
      text: 'Weekly reports disabled'
    });

    await bot.sendMessage(query.message.chat.id,
      "🔕 Weekly reports disabled.\\n\\nYou can re-enable them anytime with /settings"
    );
  }
});

```

### Configuration Options

**Via /settings:**
User: /settings
Bot: "⚙️ Weekly Report Settings
📅 Day: Monday
🕐 Time: 8:00 AM
📊 Format: Detailed

## [Change Day]
[Change Time]
[Switch to Compact]
[Disable]
[Back]"

---

## 🟢 /checkin and 🔴 /checkout Commands

### Overview

Quick commands to update booking status when guests arrive or depart, with optional notes.

### /checkin Command Flow

User: /checkin
Bot: "🟢 Guest Check-in
Select the booking:

Today's Check-ins:
─────────────────────
[🏠 Area 43 – House A
👤 John Banda
📅 15-18 Jan (3 nights)]

[🏠 Area 10 – Studio
👤 Mary Phiri
📅 15-17 Jan (2 nights)]
─────────────────────

[View All Bookings] [Cancel]"
User: [Area 43 – House A - John Banda]
Bot: "🟢 Confirm Check-in
🏠 Area 43 – House A
👤 John Banda (2 guests)
📞 0991234567
📅 15 – 18 Jan 2026

Payment Status: ✅ Paid in full
Amount: MWK 135,000

Add check-in notes? (optional)

[Check In Now] [Add Notes First]
[Cancel]"
User: [Check In Now]
Bot: "✅ Checked In!
🏠 Area 43 – House A
👤 John Banda
🕐 Checked in: 2:15 PM

Guest contact: 0991234567

[📞 Call Guest] [💬 WhatsApp]
[View Booking] [Back to Menu]"

### /checkin with Notes

User: [Add Notes First]
Bot: "📝 Enter check-in notes:
Example: 'Guest arrived early,
provided extra towels'"
User: "Guest arrived at 1pm, gave early check-in. Left MWK 10,000 deposit for damages."
Bot: "✅ Checked In!
🏠 Area 43 – House A
👤 John Banda
🕐 Checked in: 2:15 PM

📝 Notes saved:
'Guest arrived at 1pm, gave
early check-in. Left MWK 10,000
deposit for damages.'

[View Booking] [Back to Menu]"

### /checkout Command Flow

User: /checkout
Bot: "🔴 Guest Check-out
Select the booking:

Today's Check-outs:
─────────────────────
[🏠 Area 43 – Cottage
👤 Peter Mwale
📅 12-15 Jan (3 nights)]
─────────────────────

Active Stays (can checkout early):
─────────────────────
[🏠 Area 10 – Studio
👤 Grace Nkhoma
📅 14-17 Jan (early checkout)]
─────────────────────

[View All Bookings] [Cancel]"
User: [Area 43 – Cottage - Peter Mwale]
Bot: "🔴 Confirm Check-out
🏠 Area 43 – Cottage
👤 Peter Mwale
📅 Stayed: 12 – 15 Jan (3 nights)

Payment: ✅ Paid in full

Any issues to report?

[Check Out - No Issues]
[Report Issue]
[Cancel]"
User: [Check Out - No Issues]
Bot: "✅ Checked Out!
🏠 Area 43 – Cottage
👤 Peter Mwale
🕐 Checked out: 10:45 AM

Property now available for
next booking.

[Add Cleaning Expense]
[View Property] [Back to Menu]"

### /checkout with Issue

User: [Report Issue]
Bot: "⚠️ What issue occurred?
[🔧 Property Damage]
[🧹 Extra Cleaning Needed]
[💰 Unpaid Balance]
[🚫 Rule Violation]
[📝 Other Issue]
[Cancel]"
User: [Property Damage]
Bot: "📝 Describe the damage:
This will be recorded in the
booking notes and guest history."
User: "Broken bathroom mirror. Guest agreed to pay MWK 15,000 for replacement."
Bot: "⚠️ Issue Recorded
🏠 Area 43 – Cottage
👤 Peter Mwale

Issue: Property Damage
'Broken bathroom mirror. Guest
agreed to pay MWK 15,000 for
replacement.'

Do you want to:

[Add Repair Expense]
[Flag Guest]
[Complete Checkout]
[Cancel]"
User: [Complete Checkout]
Bot: "✅ Checked Out (with issue noted)
🏠 Area 43 – Cottage
👤 Peter Mwale
🕐 Checked out: 10:45 AM

⚠️ Issue recorded in booking

[Add Repair Expense]
[View Booking] [Back to Menu]"

### Database Schema Additions

**Add to `bookings` table:**

```sql
actual_check_in TIMESTAMP NULL,
actual_check_out TIMESTAMP NULL,
check_in_notes TEXT NULL,
check_out_notes TEXT NULL,
check_out_issue_type VARCHAR(50) NULL,
checked_in_by UUID NULL REFERENCES users(id),
checked_out_by UUID NULL REFERENCES users(id)

```

### Check-in/Check-out Status Logic

```tsx
enum BookingStatus {
  PENDING = 'PENDING',       // Awaiting confirmation
  CONFIRMED = 'CONFIRMED',   // Confirmed, not yet checked in
  CHECKED_IN = 'CHECKED_IN', // Guest currently staying
  COMPLETED = 'COMPLETED',   // Checked out
  CANCELLED = 'CANCELLED'    // Cancelled
}

async function checkInGuest(
  bookingId: string,
  userId: string,
  notes?: string
): Promise<Booking> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: true, guest: true }
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'CONFIRMED') {
    throw new Error('Booking must be confirmed to check in');
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CHECKED_IN',
      actualCheckIn: new Date(),
      checkInNotes: notes,
      checkedInBy: userId
    }
  });

  // Create audit log
  await createAuditLog({
    action: 'BOOKING_CHECKED_IN',
    resourceType: 'booking',
    resourceId: bookingId,
    userId,
    details: {
      propertyName: booking.property.name,
      guestName: booking.guest.name,
      notes
    }
  });

  return updated;
}

async function checkOutGuest(
  bookingId: string,
  userId: string,
  issueType?: string,
  notes?: string
): Promise<Booking> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: true, guest: true }
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'CHECKED_IN') {
    throw new Error('Guest must be checked in to check out');
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'COMPLETED',
      actualCheckOut: new Date(),
      checkOutNotes: notes,
      checkOutIssueType: issueType,
      checkedOutBy: userId
    }
  });

  // Create audit log
  await createAuditLog({
    action: 'BOOKING_CHECKED_OUT',
    resourceType: 'booking',
    resourceId: bookingId,
    userId,
    details: {
      propertyName: booking.property.name,
      guestName: booking.guest.name,
      issueType,
      notes
    }
  });

  // If issue reported, add to guest notes
  if (issueType) {
    await prisma.guest.update({
      where: { id: booking.guestId },
      data: {
        notes: prisma.raw(`CONCAT(COALESCE(notes, ''), '\\n[${new Date().toISOString()}] ${issueType}: ${notes}')`)
      }
    });
  }

  return updated;
}

```

### Quick Status Check

User: /status
Bot: "🏠 Property Status
Area 43 – House A
🟢 Occupied (John Banda)
Check-out: 18 Jan

Area 10 – Studio
🟡 Check-in today (Mary Phiri)
Expected: 2:00 PM

Area 43 – Cottage
🔴 Available
Next booking: 20 Jan

[Check In] [Check Out] [Menu]"

### Today's Schedule Command

User: /today
Bot: "📅 Today's Schedule
15 January 2026
─────────────────────
🟢 CHECK-INS (2)
─────────────────────
🏠 Area 43 – House A
👤 John Banda (2 guests)
📞 0991234567
💰 Paid ✓

🏠 Area 10 – Studio
👤 Mary Phiri (1 guest)
📞 0888765432
💰 MWK 50,000 due
─────────────────────

🔴 CHECK-OUTS (1)
─────────────────────
🏠 Area 43 – Cottage
👤 Peter Mwale
📅 Checkout by 11:00 AM
─────────────────────

[Process Check-in]
[Process Check-out]
[View All Bookings]"

### Notification on Check-in/Check-out Time

**Morning Reminder (8:00 AM):**
Bot: "📅 Today's Schedule
🟢 2 check-ins expected
🔴 1 check-out expected

[View Details]"

**Check-out Reminder (10:30 AM):**
Bot: "⏰ Check-out Reminder
🏠 Area 43 – Cottage
👤 Peter Mwale

Checkout time: 11:00 AM
(30 minutes)

[Mark Checked Out]
[Extend Stay]"

### Command Registration

```tsx
bot.onText(/\\/checkin/, async (msg) => {
  await showCheckInList(msg.chat.id, msg.from.id.toString());
});

bot.onText(/\\/checkout/, async (msg) => {
  await showCheckOutList(msg.chat.id, msg.from.id.toString());
});

bot.onText(/\\/today/, async (msg) => {
  await showTodaySchedule(msg.chat.id, msg.from.id.toString());
});

bot.onText(/\\/status/, async (msg) => {
  await showPropertyStatus(msg.chat.id, msg.from.id.toString());
});

```

### Migration Script

```sql
ALTER TABLE bookings ADD COLUMN actual_check_in TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN actual_check_out TIMESTAMP NULL;
ALTER TABLE bookings ADD COLUMN check_in_notes TEXT NULL;
ALTER TABLE bookings ADD COLUMN check_out_notes TEXT NULL;
ALTER TABLE bookings ADD COLUMN check_out_issue_type VARCHAR(50) NULL;
ALTER TABLE bookings ADD COLUMN checked_in_by UUID NULL REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN checked_out_by UUID NULL REFERENCES users(id);

CREATE INDEX bookings_status_checkin_idx ON bookings (status, check_in)
WHERE status IN ('CONFIRMED', 'CHECKED_IN');

```

---

---

## 🧠 Design Decisions (Why This Works)

- No free text where buttons are safer
- No editing of existing records (MVP safety)
- Bot is **fast-entry + visibility**, not full admin
- Every bot action maps to **1 API call**
- Every API call maps to **1 DB action**

---

## 🚫 Explicitly Out of Scope (for now)

- Customer chat
- Price negotiation
- Availability calendar editing
- Multi-language support
- Complex reports (dashboard handles that)

---

## 🎨 UI/UX Design

[🎨 ADMIN DASHBOARD UI/UX DESIGN](https://www.notion.so/ADMIN-DASHBOARD-UI-UX-DESIGN-2e47677bc69680aca2e4d1d7a774f2fe?pvs=21)

[Customer User Interface](https://www.notion.so/Customer-User-Interface-2e47677bc696805d9e0de9ee9fc5500a?pvs=21)

---

# PHASE 3: Technical Specifications

[Technical Specs](https://www.notion.so/Technical-Specs-2e47677bc6968034a340fef4dfc55b06?pvs=21)

---

# PHASE 4: Development Milestones

[development milestones](https://www.notion.so/development-milestones-2e47677bc69680349fb1d775377754e4?pvs=21)

---

## Milestone 5: Testing & Bug Fixes

**Duration:** [X days]

**Status:** ⬜ Not Started

### Tasks

- [ ]  Complete all unit tests
- [ ]  Integration testing
- [ ]  End-to-end testing
- [ ]  Bug fixes
- [ ]  Performance optimization
- [ ]  Security audit
- [ ]  Code review

### Deliverables

- [ ]  Bug-free application
- [ ]  Test coverage report
- [ ]  Performance metrics

**Test Results:**
[Document test results]

---

## Milestone 6: Deployment & Documentation

**Duration:** [X days]

**Status:** ⬜ Not Started

### Tasks

- [ ]  Production environment setup
- [ ]  Database migration
- [ ]  Domain configuration
- [ ]  SSL setup
- [ ]  Monitoring setup
- [ ]  Documentation writing
- [ ]  User guide creation
- [ ]  Admin manual creation

### Deliverables

- [ ]  Live production system
- [ ]  Complete documentation
- [ ]  Deployment guide

---

# PHASE 5: Final Deliverables

## 🌐 Live System

**Production URL:** [URL]

**Admin Panel:** [URL]

**Bot Link:** [URL if applicable]

**Test Credentials:**

```
Admin:
Username: [username]
Password: [password]

Staff:
Username: [username]
Password: [password]
```

**Status:** 🟢 Live and operational

---

## 📚 Documentation

### User Guide

**Link:** [URL or file]

**Contents:**
- Getting started
- Feature walkthroughs
- Common tasks
- Troubleshooting
- FAQ

### Admin Manual

**Link:** [URL or file]

**Contents:**
- Admin panel overview
- User management
- Content management
- Settings configuration
- Maintenance tasks

### Bot Commands Guide (if applicable)

**Link:** [URL or file]

**Contents:**
- Command list
- Usage examples
- Best practices

### Technical Documentation

**Link:** [URL or file]

**Contents:**
- Setup instructions
- API documentation
- Database schema
- Deployment guide
- Architecture overview

---

## 💻 Source Code

**GitHub Repository:** [URL]

**Repository Structure:**

```
/
├── backend/
├── frontend/
├── docs/
├── tests/
├── README.md
└── .env.example
```

**README Quality Checklist:**
- [ ] Project description
- [ ] Features list
- [ ] Tech stack
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Screenshots
- [ ] API documentation
- [ ] Contributing guidelines
- [ ] License

---

# PHASE 6: Case Study

## 📈 Results & Impact

### Quantifiable Improvements

**Time Savings:**
- Before: [X hours/week] spent on [task]
- After: [Y hours/week] spent on [task]
- **Savings: [Z hours/week] ([percentage]% reduction)**

**Cost Savings:**
- Before: $[X]/month lost to [issue]
- After: $[Y]/month lost to [issue]
- **Savings: $[Z]/month**

**Efficiency Gains:**
- [Metric]: Improved from [X] to [Y] ([percentage]% improvement)
- [Metric]: Improved from [X] to [Y] ([percentage]% improvement)
- [Metric]: Improved from [X] to [Y] ([percentage]% improvement)

**ROI Calculation:**
- Total investment: $[X]
- Monthly savings: $[Y]
- **Payback period: [Z months]**
- **5-year ROI: $[amount]**

---

## 🎯 Problems Solved

### Problem 1: [Pain Point Name]

**Before:** [Description of issue]

**Solution:** [What was implemented]

**Result:** [Measurable outcome]

**Screenshot:** [Before/after comparison]

---

### Problem 2: [Pain Point Name]

[Same structure]

---

### Problem 3: [Pain Point Name]

[Same structure]

---

## 💡 Technical Challenges & Solutions

### Challenge 1: [Description]

**Problem:** [What went wrong or was difficult]

**Solution:** [How you solved it]

**Learning:** [What you learned]

**Code Example:** [Optional - link to specific commit or code snippet]

---

### Challenge 2: [Description]

[Same structure]

---

## 🎨 Feature Showcase

### Feature 1: [Name]

**Description:** [What it does]

**Screenshot:** [Image]

**Technical Implementation:** [Brief technical note]

**User Benefit:** [What problem it solves]

---

### Feature 2: [Name]

[Same structure]

---

## 🎬 Demo Video

**Link:** [YouTube/Loom/Video link]

**Duration:** [X minutes]

**Contents:**
- [ ] System overview
- [ ] Key features demonstration
- [ ] User workflows
- [ ] Admin panel tour
- [ ] Bot demonstration (if applicable)
- [ ] Mobile responsiveness

---

## 💬 Testimonial (Optional)

> “[Simulated testimonial or feedback from beta testers]”
> 
> 
> — [Name], [Title] at [Company]
> 

---

# Portfolio Presentation

## 📄 One-Page Summary

**[Project Name] - [Industry] Solution**

A modern [type of system] that helps [target audience] [main benefit].

**Key Features:**
• [Feature 1]

• [Feature 2]

• [Feature 3]

**Technologies:** [Tech 1] • [Tech 2] • [Tech 3]

**Results:** [Key metric] • [Key metric] • [Key metric]

**View Full Case Study →** [Link]

---

## 🖼️ Marketing Assets

### Project Thumbnail

[Image for portfolio grid - 1200x630px]

### Social Media Graphics

- LinkedIn: [Image - 1200x627px]
- Twitter: [Image - 1200x675px]
- Instagram: [Image - 1080x1080px]

### Feature Screenshots

- [Feature 1 screenshot]
- [Feature 2 screenshot]
- [Feature 3 screenshot]
- [Mobile view]
- [Admin panel]

---

## 📝 Presentation Scripts

### 30-Second Pitch

“[Project Name] is a [solution type] I built for [industry]. It [main feature 1], [main feature 2], and [main feature 3]. The result was [key metric improvement]. I used [main tech] to build it. Want to see a demo?”

### 2-Minute Demo Script

[Detailed walkthrough script for discovery calls]

### Email Template

```
Subject: [Project Name] - Portfolio Case Study

Hi [Name],

I recently completed a [type] system for the [industry]
industry that might interest you.

The project included:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Results:
- [Metric 1]
- [Metric 2]
- [Metric 3]

You can view the full case study and live demo here: [Link]

Would you like to discuss how a similar solution could work
for [their business]?

Best,
[Your name]
```

---

# Project Checklist

## Pre-Development

- [ ]  Client profile created
- [ ]  Pain points documented
- [ ]  Solution designed
- [ ]  Tech stack selected
- [ ]  Database schema designed
- [ ]  Features list finalized
- [ ]  Wireframes created

## Development

- [ ]  All milestones completed
- [ ]  All features implemented
- [ ]  Testing completed
- [ ]  Bugs fixed
- [ ]  Performance optimized
- [ ]  Security reviewed

## Documentation

- [ ]  User guide written
- [ ]  Admin manual written
- [ ]  Bot commands documented (if applicable)
- [ ]  Technical docs completed
- [ ]  README.md polished
- [ ]  Code commented

## Deployment

- [ ]  Deployed to production
- [ ]  Domain configured
- [ ]  SSL enabled
- [ ]  Monitoring setup
- [ ]  Backups configured
- [ ]  Analytics integrated

## Portfolio Presentation

- [ ]  Case study written
- [ ]  Screenshots captured
- [ ]  Demo video recorded
- [ ]  GitHub repository public
- [ ]  One-page summary created
- [ ]  Marketing assets created
- [ ]  Added to portfolio website
- [ ]  LinkedIn post drafted

---

# Notes & Learnings

## What Went Well

- [Success 1]
- [Success 2]
- [Success 3]

## What Could Be Improved

- [Area 1]
- [Area 2]
- [Area 3]

## Technical Skills Gained

- [Skill 1]
- [Skill 2]
- [Skill 3]

## What I’d Do Differently Next Time

- [Learning 1]
- [Learning 2]
- [Learning 3]

---

**Project Completed:** [Date]

**Total Time Investment:** [X hours/weeks]

**Portfolio Ready:** ✅ Yes | ⬜ No