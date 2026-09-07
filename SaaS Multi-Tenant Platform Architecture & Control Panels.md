UI/UX Design Considerations
1. Master Platform Control Panel (Super Admin)
•	Information Density & Layout: Design for internal operators and DevOps engineers using high-density data tables, fixed side navigation, and persistent system status banners (uptime, error rates, global traffic).

•	Visual Hierarchy & Safety: Use high-contrast color palettes (often dark mode by default) with stark visual indicators. Destructive actions—such as tenant deletion or global feature toggles—must require multi-step confirmation modals with explicit type-to-confirm inputs.

•	Quick-Switch Globals: Include a global search bar with keyboard shortcuts (e.g., Cmd+K) capable of instantly querying tenants, user IDs, or error logs across the entire SaaS infrastructure.

2. Tenant Control Panel (Company Admin)
•	Contextual Branding: Allow workspace-level customization where the UI dynamically reflects the tenant's uploaded logo and brand accent colors across the sidebar header and primary buttons.

•	Progressive Disclosure: Keep everyday settings clean and accessible, nesting advanced configurations (such as webhooks, API keys, and enterprise SSO setups) under dedicated sub-sections to avoid overwhelming non-technical administrators.

•	Role-Based Visibility: Hide administrative options entirely (rather than graying them out) for users whose roles lack permission to manage billing, security, or team invites.

3. Domain & Subdomain Management UI/UX
•	Guided Setup Wizards: Break custom domain configuration down into a clear, linear multi-step wizard rather than dumping raw DNS instructions on a single page.

•	Live Status Feedback: Implement real-time polling or status badges for DNS propagation and SSL certificate provisioning (e.g., Checking CNAME..., Provisioning SSL..., Active). Provide immediate, user-friendly error messages if records fail validation.

•	One-Click Copy Targets: Every DNS record value (e.g., Host, Type, Value) must feature an instant copy-to-clipboard button with visual confirmation checkmarks.

VS Code AI Agent Prompt
Copy and paste this prompt directly into your AI coding assistant (such as GitHub Copilot, Cursor, or a VS Code extension) to scaffold your multi-tenant architecture and routing:
Markdown
Act as a Principal Full-Stack Architect. I am building a scalable multi-tenant SaaS commercial business platform. I need you to scaffold the core architecture handling master admin control, tenant-scoped control panels, and wildcard subdomain/custom domain routing.

Please generate clean, modular code and structural blueprints covering the following requirements:

1. **Routing & Tenant Resolution Middleware:**
   - Write a Node.js/Express (or Next.js API/Middleware) function that intercepts incoming requests, extracts the `Host` header, parses subdomains, and queries a Redis cache/database to resolve the `tenant_id`.
   - Handle root domain requests (`app.yourplatform.com`), master admin requests (`admin.yourplatform.com`), and custom domains (`custom-client-domain.com`).

2. **Data Isolation Strategy:**
   - Provide a database schema example (Prisma or PostgreSQL) implementing a multi-tenant pattern with `tenant_id` foreign keys and Row-Level Security (RLS) policies to ensure data isolation.

3. **Control Panel API Stubs:**
   - Create route controllers for the Master Platform (tenant provisioning, global feature flags) and Tenant Control Panel (team member invites, settings update).

4. **Frontend Dynamic Shell:**
   - Provide a React/Next.js layout component that reads the resolved tenant context and dynamically adapts the UI shell (branding colors, tenant logo, navigation items).

Keep the implementation modern, secure, and production-ready.
