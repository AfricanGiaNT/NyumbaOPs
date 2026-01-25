PHASE 4: Development Milestones
NyumbaOps – Operations & Finance System
Updated: January 2026 | With Project Plan Cross-References
This document outlines the development milestones for NyumbaOps with explicit references to specific sections of the project plan. Each milestone includes pointers to the relevant documentation sections to ensure alignment between planning and implementation.
Overall Timeline Summary
Milestone	Duration	Cumulative	You Can Test	Key References
1. Foundation & Setup	5-7 days	Week 1	Auth, API structure	System Architecture, Tech Stack
2. Property & Financial Core	10-14 days	Week 2-3	Full financial tracking	DATABASE SCHEMA, Feature 1 & 2
3. Guest & Booking Foundation	8-10 days	Week 4-5	Guest management, internal bookings	DATABASE SCHEMA (guests, bookings)
4. Public Website	5-7 days	Week 5-6	Property browsing	Feature 3, Customer UI
5. Inquiry & Payment System	10-12 days	Week 7-8	Complete booking flow	Workflow 3, Pain Point #2
6. Telegram Bot	6-8 days	Week 9-10	Mobile quick actions	Bot Commands, Bot Workflows
7. Polish & Security	5-7 days	Week 10-11	Stable, secure system	Technical Stack, Success Metrics
8. Deployment & Launch	3-5 days	Week 11-12	Live production system	Infrastructure, PHASE 5
Total: 10-12 weeks (solo, focused)
 
Milestone 1: Foundation & Setup
Duration: 5–7 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• PHASE 2: Solution Design → System Architecture: Modular Monolith architecture, component overview
• PHASE 2: Solution Design → Technical Stack: Full tech stack (Next.js, PostgreSQL, Prisma, etc.)
• User Roles & Permissions: Role definitions (Admin/Owner, Staff/Manager)
• DATABASE SCHEMA (MVP): Core schema for users, roles, authentication
Tasks:
☐ Project initialization (monorepo or separated frontend/backend)
☐ Repository setup (GitHub)
☐ Development environment configuration
☐ Database setup (PostgreSQL)
☐ ORM setup (Prisma schema + migrations for users, roles tables)
☐ Basic authentication (JWT) per Technical Stack specifications
☐ Role-based access control (Owner / Staff) per User Roles & Permissions
☐ Project structure following clean domain separation
☐ Set up testing framework (Jest for backend, Playwright for e2e later)
☐ Create test database seed script
☐ Create API documentation file
☐ Postman/Insomnia collection for manual API testing
Testable Deliverables:
☐ Can register and login via API
☐ Token refresh works
☐ Role-based routes block unauthorized users (Owner vs Staff)
☐ Seed script populates test data successfully
☐ All auth endpoints documented and testable in Postman
What You Can Demo After:
"I can create users, login, and the system correctly blocks staff from owner-only routes."
Notes:
• Manual-first architecture chosen (per Solution Overview)
• No external banking integrations for MVP
• Designed for scale but built simple (per Modular Monolith approach)
────────────────────────────────────────────────────────────────────────────────
Milestone 2: Property & Financial Core System
Duration: 10–14 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• DATABASE SCHEMA (MVP): Properties, transactions, expense_categories tables
• Pain Point #1: Lack of Financial Clarity per Property
• Feature 1: Property & Financial Tracking: Income/expense tracking requirements
• Feature 2: Financial Dashboard: Visual overview specifications
• Workflow 1: Recording Income: Income logging flow (Airbnb, Local, Mobile Money)
• Workflow 2: Recording Expenses: Expense logging flow with categories
• Technical Specs: API endpoint specifications
Backend:
☐ Property management API (CRUD) per database schema
☐ Revenue logging API supporting payment methods: Airbnb, Local Booking, Mobile Money, Bank Transfer, Cash (per Workflow 1)
☐ Expense logging API with categories: Utilities, Repairs, Cleaning, Fuel, Supplies, Security, Commission, Other (per database schema)
☐ Transaction categorization (INCOME vs EXPENSE types)
☐ Multi-property expense allocation support (per schema: expense can link to multiple properties)
☐ Per-property financial aggregation endpoints
☐ Monthly/yearly filtering on aggregations
☐ Dual currency support (MWK and GBP per database schema)
☐ Audit log creation (who did what, when) per audit_logs table
☐ Global error handling
☐ Data validation (no negative amounts, valid dates, required fields)
Frontend (Dashboard):
☐ Login screen
☐ Dashboard layout (sidebar + main content) per UI/UX Design section
☐ Properties list page with financial summary cards
☐ Single property detail page
☐ Add/edit property modal (name, location, bedrooms, bathrooms, max_guests, nightly_rate, currency)
☐ Add income modal (amount, source, date, property, currency, notes)
☐ Add expense modal (amount, category, date, property/properties, currency, notes)
☐ Monthly overview section (total income, expenses, profit) per Feature 2 specs
☐ Per-property breakdown view
☐ Empty states (no properties yet, no transactions yet)
☐ Error states (failed to load, failed to save)
☐ Mobile responsive check
Testing:
☐ Unit tests for profit calculation logic (income - expenses per property)
☐ Unit tests for monthly aggregation
☐ Unit tests for multi-currency handling
☐ API tests for all CRUD operations
☐ Test with realistic data (3 properties, 20+ transactions each)
☐ Manually use dashboard for 2-3 days before moving on
Testable Deliverables:
☐ Create a property and see it in the list
☐ Log income (multiple sources) and see total revenue update
☐ Log expense (with category) and see profit decrease
☐ Allocate one expense to multiple properties
☐ Filter by month and see correct totals
☐ View audit log of recent actions
☐ Dashboard works on mobile screen
What You Can Demo After:
"I can log income and expenses per property in MWK or GBP, and instantly see my profit. This alone replaces my spreadsheet."
Notes:
• This milestone solves Pain Point #1 (lack of financial clarity)
• Everything ties back to accounting clarity
• Spend a few days actually using this before moving on
• Time saved: ~20 minutes per entry (per Workflow 1 estimates)
────────────────────────────────────────────────────────────────────────────────
Milestone 3: Guest Management & Booking Foundation
Duration: 8–10 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• DATABASE SCHEMA (MVP): guests table (name, email, phone, source, notes, rating)
• DATABASE SCHEMA (MVP): bookings table with full status flow
• Pain Point #3: No Single Source of Truth for bookings
• Technical Specs: Booking status flow and API specifications
Backend:
☐ Guest management API (CRUD) with fields: name, email, phone, source, notes, rating
☐ Guest source tracking (AIRBNB, LOCAL, REFERRAL, REPEAT per schema)
☐ Guest history/notes system for repeat customer tracking
☐ Booking creation API (internal/manual bookings)
☐ Booking status flow: PENDING → CONFIRMED → CHECKED_IN → COMPLETED / CANCELLED
☐ Check-in/check-out tracking (actual_check_in, actual_check_out timestamps)
☐ Check-in/check-out notes fields
☐ Booking ↔ Guest linkage
☐ Booking ↔ Property linkage
☐ Basic availability check (is property free on these dates?)
☐ Prevent double-booking validation
Frontend (Dashboard):
☐ Guest list page with search/filter
☐ Guest detail view (contact info, booking history, notes)
☐ Add/edit guest modal
☐ Booking list page with status filters
☐ Booking detail view (guest info, dates, property, status)
☐ Create booking form (select guest, property, dates)
☐ Booking status update actions
☐ Simple availability indicator per property
Testing:
☐ Create guest and verify in list
☐ Create booking linked to guest and property
☐ Test booking status transitions
☐ Verify double-booking prevention
☐ Test guest history accumulation
Testable Deliverables:
☐ Create and manage guest profiles
☐ Create internal bookings manually
☐ Track booking status through full lifecycle
☐ View guest booking history
☐ Prevent double-booking conflicts
What You Can Demo After:
"I can track all my guests in one place, create bookings manually, and see the complete history for repeat customers."
Notes:
• Foundation for both public inquiries (Milestone 5) and Telegram bot (Milestone 6)
• Guest rating system (1-5) for internal use
• Supports Airbnb imports later
────────────────────────────────────────────────────────────────────────────────
Milestone 4: Public Website (View Only)
Duration: 5–7 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• Feature 3: Local Booking Website: Public site requirements and user story
• Pain Point #2: Manual Local Booking Process
• Customer User Interface: Full customer UI/UX specifications
• User Roles & Permissions → Role 3: Customer/Public User: Customer permissions (view listings, make bookings)
• Business Goals → Success Metrics: Reduce local booking response time to under 5 minutes
Backend:
☐ Public properties API (no auth required, limited fields for security)
☐ Image upload for properties (store in Cloudflare R2 or similar per Infrastructure specs)
☐ Property status field (ACTIVE/INACTIVE/MAINTENANCE per schema) for public display control
☐ Property amenities list support
Frontend (Public Site):
☐ Public homepage with property grid (per Customer UI specs)
☐ Property card component (image, name, price, location, bedrooms/bathrooms)
☐ Property detail page with gallery, description, amenities, nightly rate
☐ Mobile-first design (most local users are on phones)
☐ Fast loading (optimize images, lazy load)
☐ Contact/inquiry button (placeholder for Milestone 5)
☐ SEO basics (title, description, OG tags)
☐ Currency display (MWK with optional GBP equivalent)
Testing:
☐ Test on slow 3G connection (Chrome DevTools throttling)
☐ Test on actual phone (not just browser resize)
☐ Share with 2-3 friends and get feedback
☐ Check all images load correctly
☐ Verify INACTIVE/MAINTENANCE properties don't show publicly
Testable Deliverables:
☐ Public URL shows all active properties
☐ Can view property details with images and amenities
☐ Site loads in under 3 seconds on 3G
☐ Looks good on mobile
☐ Only ACTIVE properties visible publicly
What You Can Demo After:
"Locals can browse my apartments on their phones and see prices and photos without messaging me."
Notes:
• No inquiry form yet (that's Milestone 5)
• Focus on making it look professional and fast
• This is your first public-facing asset
• Design per Customer User Interface specifications
────────────────────────────────────────────────────────────────────────────────
Milestone 5: Inquiry & Payment System
Duration: 10–12 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• DATABASE SCHEMA (MVP): inquiries table with full status flow
• DATABASE SCHEMA (MVP): payments table (amount, method, status, reference)
• Workflow 3: Local Booking via Website: Complete inquiry-to-booking flow
• Pain Point #2: Manual Local Booking Process (target: reduce 30-45 min to 2-3 min)
• Technical Specs: PayChangu integration for Airtel Money
• Business Goals: Reduce local booking response time to under 5 minutes
Backend - Inquiries:
☐ Inquiry submission API (guest_name, guest_email, guest_phone, check_in, check_out, guests, message, property_id)
☐ Inquiry status flow: NEW → CONTACTED → CONVERTED → EXPIRED per schema
☐ Inquiry auto-expiry (7 days if not actioned)
☐ Rate limiting on inquiry endpoint (prevent spam)
☐ Inquiry ↔ Property linkage
☐ Convert inquiry to booking action
Backend - Payments:
☐ Payment logging API (amount, currency, method, status, reference, booking_id)
☐ Payment methods: CASH, MOBILE_MONEY, BANK_TRANSFER, AIRTEL_MONEY, CARD per schema
☐ Payment status: PENDING, COMPLETED, FAILED, REFUNDED
☐ PayChangu integration for Airtel Money (per Technical Specs)
☐ Payment ↔ Booking linkage
☐ Booking ↔ Transaction auto-creation (payment creates INCOME record)
☐ Payment confirmation/receipt generation
Backend - Availability:
☐ Availability check API (is property free on these dates?)
☐ Availability blocking tied to CONFIRMED/CHECKED_IN bookings
☐ Date conflict validation on booking creation
Frontend (Admin Dashboard):
☐ Inquiry list page with status filters (NEW, CONTACTED, etc.)
☐ Inquiry detail view (guest info, dates, property, message)
☐ "Convert to Booking" action button
☐ "Mark as Contacted" action
☐ Booking payment section
☐ Add payment to booking modal (amount, method, reference)
☐ Payment history per booking
☐ Simple availability calendar per property
Frontend (Public Site):
☐ Inquiry form on property detail page
☐ Date picker for check-in/check-out
☐ Number of guests selector
☐ Form validation (phone required, valid dates, check-out > check-in)
☐ Success confirmation page
☐ Optional: Availability indicator showing blocked dates
Testing:
☐ Submit inquiry on public site → appears in admin immediately
☐ Convert inquiry to booking → dates blocked
☐ Log payment → income appears in financial dashboard
☐ Attempt double-booking → system prevents it
☐ Inquiry expires after 7 days if not actioned
☐ Test rate limiting (submit 10 inquiries rapidly)
☐ Full flow test: Inquiry → Contact → Book → Pay → See profit
☐ Test PayChangu webhook handling
Testable Deliverables:
☐ End-to-end inquiry flow works without errors
☐ Payments correctly reflect in property profit (auto-creates INCOME transaction)
☐ Availability calendar shows booked dates
☐ PayChangu/Airtel Money integration functional
☐ Inquiries auto-expire after 7 days
What You Can Demo After:
"A local customer can inquire on my website, I see it instantly, convert it to a booking, log the payment (via Airtel Money or manually), and my profit dashboard updates automatically."
Notes:
• Most complex milestone - take your time
• PayChangu handles Airtel Money for Malawian market (per Technical Specs)
• Solves Pain Point #2: reduces 30-45 min manual process to 2-3 min
• Time saved: ~30+ minutes per booking (per Workflow 3)
────────────────────────────────────────────────────────────────────────────────
Milestone 6: Telegram Bot (Internal Operations)
Duration: 6–8 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• Telegram Bot section: Complete bot specifications, commands, and workflows
• Bot Purpose: Internal, owner-first tool for quick actions
• Bot Commands: Full command list with examples
• Bot Workflows: Log Income, Log Expense, Summary, Property Overview, Bookings, Notifications
• Access Control: Pre-approved Telegram user IDs only
• /cancel Command: Abort multi-step operations
• /undo Command: Delete last transaction within 5 minutes
• /checkin and /checkout Commands: Guest arrival/departure management
• Weekly Summary Report: Optional Monday digest
Bot Setup:
☐ Telegram bot creation (BotFather)
☐ Bot authentication (link Telegram user ID to system user per Access Control specs)
☐ Unauthorized user handling (polite denial message)
☐ Conversation state management (for multi-step flows)
Core Commands (per Bot Commands section):
☐ /start - Initialize and verify access (check users table for Telegram ID)
☐ /help - Show available commands
☐ /summary - Current month business summary (MWK + GBP)
☐ /properties - List all properties with quick stats
☐ /property [name] - Detailed stats for one property
☐ /bookings - Show recent bookings
Transaction Commands (per Bot Workflows):
☐ /add_income - Guided income logging flow (amount → property → source → note)
☐ /add_expense - Guided expense logging flow (amount → property → category → note)
☐ Inline buttons for property selection
☐ Inline buttons for source/category selection
☐ Confirmation message with transaction details
Operational Commands:
☐ /cancel - Abort any multi-step operation (per /cancel spec)
☐ /undo - Delete last transaction within 5 minutes (per /undo spec)
☐ /checkin - Process guest check-in (per /checkin workflow)
☐ /checkout - Process guest check-out with optional issue reporting (per /checkout workflow)
☐ /today - Show today's check-ins and check-outs schedule
☐ /status - Show current property occupancy status
Notifications (per Workflow 6):
☐ New inquiry notification (push to owner when website inquiry submitted)
☐ New booking notification
☐ Check-in/check-out reminders
☐ Daily summary (optional, scheduled)
Weekly Report (per Weekly Summary Report section):
☐ /settings command for notification preferences
☐ Weekly summary opt-in toggle
☐ Scheduled Monday 8AM report generation
☐ Report content: income, expenses, profit, by property, bookings, highlights
☐ Disable option in report message
Testing:
☐ Test with unauthorized Telegram user (should be blocked)
☐ Log expense via bot → verify in dashboard
☐ Log income via bot → verify in dashboard
☐ Receive inquiry notification when someone submits on website
☐ Test /cancel mid-flow
☐ Test /undo within and after 5-minute window
☐ Test /checkin and /checkout flows
☐ Test on actual phone (not just desktop Telegram)
Testable Deliverables:
☐ Can log expense in under 30 seconds via phone
☐ Can log income in under 30 seconds via phone
☐ /summary numbers match dashboard exactly
☐ Notifications arrive within seconds of trigger event
☐ /cancel aborts any flow cleanly
☐ /undo works within 5-minute window
☐ /checkin and /checkout update booking status correctly
☐ Weekly report sends on schedule (if enabled)
What You Can Demo After:
"I can log an expense from my phone in 30 seconds without opening the dashboard, check in a guest with one command, and I get notified instantly when someone inquires."
Notes:
• Bot is internal only (not customer-facing) per Bot Purpose
• Designed for low-bandwidth environments
• Inline buttons where possible (less typing)
• Conversation timeout: 10 minutes auto-cancel (per /cancel spec)
────────────────────────────────────────────────────────────────────────────────
Milestone 7: Polish, Security & Performance
Duration: 5–7 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• Technical Stack → Development Tools: Testing frameworks (Jest, Playwright)
• Technical Stack → Infrastructure: SSL, CDN configuration
• Solution Overview: Mobile usability priorities
• Business Goals → Success Metrics: Performance targets
Testing & Quality:
☐ Complete unit test coverage for financial logic
☐ Integration tests (inquiry → booking → payment → accounting)
☐ End-to-end tests with Playwright (public inquiry → admin → booking)
☐ Cross-browser testing (Chrome, Safari, Firefox)
☐ Mobile device testing (Android, iOS)
☐ Fix all identified bugs
Security:
☐ Security audit (OWASP top 10 check)
☐ SQL injection prevention verified (Prisma parameterized queries)
☐ XSS prevention verified
☐ Rate limiting on all public endpoints
☐ Sensitive data not exposed in API responses
☐ Password hashing verified (bcrypt)
☐ JWT token expiry appropriate
☐ Telegram bot access control verified
Performance (per Success Metrics):
☐ API response times < 500ms
☐ Dashboard loads < 2 seconds
☐ Public site loads < 3 seconds on 3G
☐ Image optimization (WebP, lazy loading)
☐ Database query optimization (check for N+1 queries)
Code Quality:
☐ Code review & cleanup
☐ Remove console.logs and debug code
☐ Consistent error handling
☐ Environment variables properly managed (.env.example)
Testable Deliverables:
☐ All tests pass
☐ No critical security vulnerabilities
☐ Performance benchmarks met (< 3s on 3G)
☐ Code is clean and documented
What You Can Demo After:
"The system is stable, secure, and fast. Ready for real use."
Notes:
• Admin time reduction target: 60-70% (per Business Goals)
• Mobile-first testing (most users on phones)
────────────────────────────────────────────────────────────────────────────────
Milestone 8: Deployment & Launch
Duration: 3–5 days  |  Status: ⬜ Not Started
📌 Project Plan References:
• Technical Stack → Infrastructure: DigitalOcean/Railway, Cloudflare SSL/CDN
• PHASE 5: Final Deliverables: Documentation requirements
• Budget & Timeline Assumptions: $0-$50/month infrastructure budget
Infrastructure:
☐ Production environment setup (DigitalOcean/Railway per Tech Stack)
☐ Production PostgreSQL database setup
☐ Database migration to production
☐ Environment variables configured
☐ Domain purchased and configured
☐ SSL certificate setup (Cloudflare per Infrastructure specs)
☐ CDN configuration (Cloudflare)
Monitoring & Reliability:
☐ Error tracking setup (Sentry or similar)
☐ Uptime monitoring (UptimeRobot or similar)
☐ Database backup strategy (daily automated backups)
☐ Backup restoration tested
☐ Basic analytics (Plausible or Umami)
Documentation (per PHASE 5 requirements):
☐ User guide for owner (dashboard, financial tracking)
☐ Staff guide for caretaker (what they can do, limitations)
☐ Bot commands quick reference card
☐ Technical README updated
☐ API documentation finalized
Launch:
☐ Initial data entry (real properties with photos)
☐ Owner account created
☐ Staff/caretaker account created
☐ Telegram bot linked to real user IDs
☐ PayChangu production credentials configured
☐ Final smoke test on production
☐ Go live!
Testable Deliverables:
☐ Production site accessible via domain
☐ SSL working (green padlock)
☐ Can login and perform all actions on production
☐ Monitoring alerts work
☐ Backup and restore tested
☐ Documentation complete
What You Can Demo After:
"NyumbaOps is live. I'm using it to run my business."
Notes:
• Budget target: $0-$50/month for infrastructure
• No hard deadline (per Timeline Requirement)
────────────────────────────────────────────────────────────────────────────────
Key Principles Applied
1. Test after every milestone – Each milestone ends with something usable and demonstrable
2. Vertical slices – Backend + Frontend together, not separated (per Solution Design approach)
3. Use it yourself – Spend 2-3 days using each milestone before moving on
4. Realistic data – Test with multiple properties and many transactions (per Fictional Client: 2-5 years in business)
5. Mobile-first testing – Most users will be on phones (per Solution Overview: mobile usability priority)
6. Security throughout – Not just at the end (per OWASP guidelines)
7. Reference the plan – Each task should trace back to a specific section of the project documentation
 
Checklist: Before Moving to Next Milestone
Use this for every milestone:
☐ All tasks completed
☐ All tests pass
☐ Tested on mobile device
☐ Used it for 1-2 days as if real
☐ No critical bugs remaining
☐ Committed and pushed to GitHub
☐ Brief notes written on what you learned
☐ Cross-referenced with relevant project plan sections
Quick Reference: Project Plan Sections
When implementing each milestone, refer to these key sections:
PHASE 1: Discovery & Understanding
• Fictional Client Profile – Business context and current operations
• Pain Points – Problems being solved (#1, #2, #3)
• Business Goals – Success metrics and targets
PHASE 2: Solution Design
• System Architecture – Modular Monolith approach
• Technical Stack – All technology choices
• Features List – Must-have and nice-to-have features
• User Roles & Permissions – Admin, Staff, Customer
• Key Workflows – Income, Expenses, Booking, Review
• DATABASE SCHEMA (MVP) – Complete schema reference
• Telegram Bot – Commands, Workflows, Notifications
• UI/UX Design – Dashboard and Customer interfaces
PHASE 3: Technical Specifications
• Technical Specs – API specifications, PayChangu integration
PHASE 5: Final Deliverables
• Documentation requirements
• Deployment checklists
💡 Tip: Open the main project plan document alongside this milestones document while implementing. Each task should be traceable to specific requirements in the plan.
