/** Documentation hub — 12-section guide covering all features. */
'use client';
import { useState } from 'react';
import { BookOpen, Server, Shield, Monitor, Zap, HardDrive, Wrench, Globe, Settings, FileText, ChevronRight, Search, Package, Rocket } from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';

const sections = [
  {
    id: 'getting-started', icon: BookOpen, title: 'Getting Started', subtitle: 'Introduction and prerequisites',
    content: [
      { heading: 'What is Universal iDRAC Console?', body: 'Universal iDRAC Console is a zero-client-install, Docker-hosted web platform for managing Dell PowerEdge servers across all iDRAC generations (6, 7, 8, and 9).\n\nIt provides a single, modern web interface that replaces the need for Java plugins, ActiveX controls, or generation-specific browser requirements.\n\n**Key highlights:**\n• Works with iDRAC 6 through iDRAC 9 (PowerEdge 11G–16G)\n• No client-side software or plugins required\n• Deploy in under 5 minutes with Docker Compose\n• Multi-tenant with full RBAC and audit logging\n• Open source and self-hosted — no vendor lock-in' },
      { heading: 'Prerequisites', body: 'Before installing, ensure your system has:\n\n• **Docker Engine** 20.10+ (or Docker Desktop)\n• **Docker Compose** v2.x\n• **Git** (to clone the repository)\n• **2 CPU cores**, 2GB RAM, 10GB disk space (minimum)\n\n**Supported host operating systems:**\n• Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+)\n• macOS 12+ (with Docker Desktop)\n• Windows 10/11 (with Docker Desktop or WSL2)\n\n**Network requirements:**\n• Outbound HTTPS access to iDRAC endpoints on your servers\n• Port 3000 (frontend) and 4000 (API) available on the host' },
    ],
  },
  {
    id: 'installation', icon: Package, title: 'Installation', subtitle: 'Docker setup, configuration, and first run',
    content: [
      { heading: 'Clone the Repository', body: 'Start by cloning the project from GitHub:\n\n1. `git clone https://github.com/sumit-kumawat/universal-idrac-console.git`\n2. `cd universal-idrac-console`' },
      { heading: 'Configure Environment', body: 'Copy the example environment file and configure your secrets:\n\n1. `cp .env.example .env`\n2. Open `.env` in your editor and set these required variables:\n\n• `POSTGRES_URL` — PostgreSQL connection string (default: `postgresql://idrac:idrac@postgres:5432/idrac`)\n• `REDIS_URL` — Redis connection string (default: `redis://redis:6379`)\n• `JWT_SECRET` — A strong random string for JWT signing (min 32 chars)\n• `REFRESH_SECRET` — A strong random string for refresh tokens (min 32 chars)\n• `MASTER_ENCRYPTION_KEY` — 64-character hex string for AES-256 credential encryption\n\n**Generate secure values:**\n• `openssl rand -hex 32` — generates a 64-char hex key for MASTER_ENCRYPTION_KEY\n• `openssl rand -base64 32` — generates a strong random string for JWT/REFRESH secrets\n\n⚠️ Never use default or example secrets in production.' },
      { heading: 'Start with Docker Compose', body: 'Launch all services with a single command:\n\n1. `docker compose up -d`\n\nThis starts 4 containers:\n\n• **postgres** — PostgreSQL 16 database\n• **redis** — Redis 7 session store\n• **api** — NestJS backend on port 4000\n• **web** — Next.js frontend on port 3000\n\nThe database schema is automatically created on first run via Prisma migrations.\n\n**Verify the deployment:**\n• `docker compose ps` — all containers should show "running"\n• `curl http://localhost:4000/api/health` — should return `{"status":"ok"}`\n• Open `http://localhost:3000` in your browser' },
      { heading: 'First Account Setup', body: 'After deploying the application:\n\n1. Navigate to `http://localhost:3000/register`\n2. Enter your organization name, email, and a strong password\n3. Your account is created as the organization **Owner** with full access\n\nThe first registered user has super admin capabilities with cross-tenant visibility.' },
      { heading: 'Common Docker Commands', body: '**Start services:** `docker compose up -d`\n**Stop services:** `docker compose down`\n**View logs:** `docker compose logs -f api` or `docker compose logs -f web`\n**Restart a service:** `docker compose restart api`\n**Rebuild after code changes:** `docker compose up -d --build`\n**Reset database:** `docker compose down -v` (⚠️ deletes all data)\n**Check status:** `docker compose ps`' },
    ],
  },
  {
    id: 'deployment', icon: Rocket, title: 'Deployment', subtitle: 'Production deployment, scaling, and maintenance',
    content: [
      { heading: 'Production Checklist', body: 'Before deploying to production:\n\n• ✅ Generate unique, strong secrets for JWT_SECRET, REFRESH_SECRET, and MASTER_ENCRYPTION_KEY\n• ✅ Change default PostgreSQL credentials\n• ✅ Enable TLS/HTTPS via a reverse proxy (nginx, Traefik, or Caddy)\n• ✅ Set up database backups (pg_dump or continuous archiving)\n• ✅ Configure firewall rules — only expose port 443 (HTTPS)\n• ✅ Set NODE_ENV=production in .env\n• ✅ Configure Redis password authentication\n• ✅ Review and set IP allowlists for tenant access control' },
      { heading: 'Reverse Proxy with Nginx', body: 'Example nginx configuration for HTTPS termination:\n\n```nginx\nserver {\n    listen 443 ssl;\n    server_name idrac.example.com;\n\n    ssl_certificate /etc/ssl/certs/idrac.pem;\n    ssl_certificate_key /etc/ssl/private/idrac.key;\n\n    location / {\n        proxy_pass http://localhost:3000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location /api/ {\n        proxy_pass http://localhost:4000/api/;\n    }\n}\n```\n\nFor Traefik or Caddy, similar reverse proxy configurations apply.' },
      { heading: 'Reverse Proxy with Caddy', body: 'Caddy provides automatic HTTPS with Let\'s Encrypt:\n\n```\nidrac.example.com {\n    reverse_proxy /api/* localhost:4000\n    reverse_proxy * localhost:3000\n}\n```\n\nCaddy automatically obtains and renews TLS certificates.' },
      { heading: 'Database Backup & Restore', body: '**Create a backup:**\n• `docker compose exec postgres pg_dump -U idrac idrac > backup-$(date +%Y%m%d).sql`\n\n**Restore from backup:**\n• `docker compose exec -T postgres psql -U idrac idrac < backup-20260923.sql`\n\n**Automated daily backups (cron):**\n• `0 2 * * * cd /opt/idrac && docker compose exec -T postgres pg_dump -U idrac idrac | gzip > /backups/idrac-$(date +\\%Y\\%m\\%d).sql.gz`\n\nStore backups on a separate volume or remote storage for disaster recovery.' },
      { heading: 'Updating to Latest Version', body: '1. `cd /opt/universal-idrac-console`\n2. `git pull origin main`\n3. `docker compose up -d --build`\n\nDatabase migrations run automatically on startup. Always backup your database before updating.\n\n**Zero-downtime updates:**\nFor production environments, use Docker Compose rolling updates or a blue-green deployment strategy.' },
      { heading: 'Monitoring & Health Checks', body: 'The API provides health check endpoints:\n\n• `GET /api/` — Returns API name, version, and status\n• `GET /api/health` — Returns `{"status":"ok"}` with timestamp\n\nUse these with your monitoring system (Prometheus, Datadog, UptimeRobot, etc.) to track availability.\n\n**Docker health checks** are built into the Compose configuration — Docker will automatically restart unhealthy containers.' },
    ],
  },
  {
    id: 'architecture', icon: Globe, title: 'Architecture', subtitle: 'System design, adapter pattern, and data flow',
    content: [
      { heading: 'System Overview', body: 'Universal iDRAC Console uses a **multi-strategy adapter pattern** to communicate with different iDRAC generations:\n\n• **Redfish Adapter** (iDRAC 8/9) — REST API over HTTPS using Dell\'s Redfish implementation\n• **Legacy Java Adapter** (iDRAC 7) — XML-based `/data?get=` endpoints with cookie-based sessions\n• **Legacy CGI Adapter** (iDRAC 6) — HTML form-based `/cgi-bin/webcgi/` endpoints\n\nThe adapter factory automatically selects the right adapter based on generation detection.' },
      { heading: 'Tech Stack', body: '**Backend:** NestJS (TypeScript) with Prisma ORM, JWT auth, argon2id password hashing\n\n**Frontend:** Next.js 14 App Router, Tailwind CSS with Dell iDRAC 9 theme, lucide-react icons\n\n**Database:** PostgreSQL 16 with tenant-isolated data model\n\n**Cache:** Redis 7 for session management and rate limiting\n\n**Monorepo:** pnpm workspaces + Turborepo with shared packages (@idrac/shared, @idrac/adapters, @idrac/db)' },
      { heading: 'Project Structure', body: '```\nuniversal-idrac-console/\n├── apps/\n│   ├── api/          # NestJS backend (port 4000)\n│   └── web/          # Next.js frontend (port 3000)\n├── packages/\n│   ├── adapters/     # iDRAC protocol adapters\n│   ├── db/           # Prisma schema & migrations\n│   └── shared/       # Shared types & interfaces\n├── docker-compose.yml\n├── Dockerfile\n└── .env.example\n```' },
      { heading: 'Data Flow', body: '1. User interacts with the Next.js frontend\n2. Frontend sends API requests to the NestJS backend\n3. Backend validates JWT tokens and tenant authorization\n4. Backend instantiates the correct adapter based on server generation\n5. Adapter communicates with the physical iDRAC controller\n6. Response is normalized to a standard interface and returned to the frontend\n7. All actions are logged in the audit log' },
      { heading: 'Security Model', body: '• **Authentication:** JWT access tokens (15 min) + refresh tokens (7 days) with rotation\n• **Password Storage:** argon2id hashing (winner of the Password Hashing Competition)\n• **Credential Encryption:** AES-256-GCM for stored iDRAC credentials\n• **Session Timeout:** 15-minute inactivity auto-logout with 2-minute warning\n• **Multi-Tenant Isolation:** All data is scoped to a tenant via foreign key constraints\n• **Rate Limiting:** 5 login attempts/minute/IP, 100 requests/minute general' },
    ],
  },
  {
    id: 'server-management', icon: Server, title: 'Server Management', subtitle: 'Adding, editing, and removing servers',
    content: [
      { heading: 'Adding a Server', body: '1. Navigate to **Dashboard** → **Add Server**\n2. Enter the iDRAC IP address and credentials (default: root/calvin)\n3. Click **Probe Server** — the system auto-detects the iDRAC generation\n4. Review detected information (model, service tag, health status)\n5. Name your server and choose credential storage mode:\n   - **Session Only** — credentials kept in memory for 30 minutes\n   - **Save Encrypted** — credentials stored with AES-256-GCM encryption' },
      { heading: 'Editing a Server', body: 'From the server list or detail page, click the edit button to modify:\n\n• Server display name\n• Tags for organization\n• Credential storage mode\n\nChanges are saved immediately and logged in the audit trail.' },
      { heading: 'Deleting a Server', body: 'Servers can be deleted from the server list or detail page. Deletion is permanent and removes:\n\n• Server record and all associated data\n• Console session history\n• Server-specific audit log entries (via cascade)\n\nA confirmation dialog prevents accidental deletion.' },
      { heading: 'Auto-Detection', body: 'When probing a server, the adapter factory tries protocols in order:\n\n1. **Redfish** (`/redfish/v1/`) — if RedfishVersion >= 1.6 → iDRAC 9, else iDRAC 8\n2. **Legacy XML** (`/data?get=version`) — iDRAC 7\n3. **Legacy CGI** (`/cgi-bin/webcgi/login`) — iDRAC 6\n\nIf none respond, an error is returned with connectivity troubleshooting guidance.' },
    ],
  },
  {
    id: 'dashboard-health', icon: Zap, title: 'Dashboard & Health', subtitle: 'Fleet overview and server health monitoring',
    content: [
      { heading: 'Fleet Dashboard', body: 'The main dashboard provides a bird\'s-eye view of your entire server fleet:\n\n• **Stats Bar** — Total servers, healthy, warning, critical counts\n• **Search** — Filter servers by name or IP address\n• **Server Cards** — Click any card to drill into the server detail dashboard\n• **Health Indicators** — Color-coded dots (green/amber/red/gray) show status at a glance' },
      { heading: 'Server Dashboard', body: 'Each server has a detail dashboard modeled after the Dell iDRAC 9 web interface:\n\n• **Health Banner** — Full-width colored banner showing overall system health\n• **Health Aspects** — CPU, Memory, Storage, Network, Fan, PSU, Temperature\n• **System Information** — Model, hostname, OS, BIOS version, iDRAC firmware\n• **Recent Logs** — Last 5 system event log entries with severity icons\n• **Virtual Console Preview** — Quick-launch button for remote console access' },
      { heading: 'Health Status Levels', body: '• **Healthy** (Green) — All components operating normally\n• **Warning** (Amber) — Non-critical issues detected (degraded redundancy, approaching thresholds)\n• **Critical** (Red) — Immediate attention required (component failure, threshold exceeded)\n• **Unknown** (Gray) — Unable to determine health (server unreachable, legacy limitation)' },
      { heading: 'Auto-Refresh', body: 'The server dashboard auto-refreshes every 30 seconds to keep health data current. Manual refresh is available via the Retry/Refresh button on error states.' },
    ],
  },
  {
    id: 'storage', icon: HardDrive, title: 'Storage Management', subtitle: 'RAID controllers, physical disks, and virtual disks',
    content: [
      { heading: 'Storage Overview', body: 'The Storage page shows a complete inventory of the server\'s storage subsystem:\n\n• **RAID Controllers** — Name, model, firmware version, cache size, PCI slot, status\n• **Physical Disks** — Model, serial number, capacity, media type (HDD/SSD/NVMe), protocol, speed\n• **Virtual Disks** — RAID level, capacity, stripe size, read/write cache policies' },
      { heading: 'iDRAC 8/9 (Redfish)', body: 'Full storage detail is available via Redfish:\n\n• Each RAID controller is enumerated with its drives and volumes\n• Physical disk details include manufacturer, predicted failure status, negotiated speed\n• Virtual disk details include cache policies and optimum IO size' },
      { heading: 'iDRAC 7 (Legacy)', body: 'Storage data is parsed from XML endpoints:\n\n• `/data?get=pd` — Physical disk list\n• `/data?get=vd` — Virtual disk list\n• RAID controller information is inferred from available drives' },
      { heading: 'iDRAC 6 (CGI)', body: 'Limited storage visibility on iDRAC 6 due to protocol constraints. The storage page will show "No data available" for CGI-based servers.' },
    ],
  },
  {
    id: 'bios-config', icon: Settings, title: 'BIOS & Configuration', subtitle: 'BIOS settings, boot order, and hardware inventory',
    content: [
      { heading: 'BIOS Attributes', body: 'The Configuration page provides a searchable, grouped view of all BIOS attributes:\n\n• Attributes are organized by category (e.g., Processor, Memory, Network, Security)\n• Click a group to expand and see individual settings\n• Editable attributes show an input field; read-only attributes show as plain text\n• Modified values are highlighted in blue and collected for batch submission' },
      { heading: 'Applying BIOS Changes', body: '1. Modify desired attributes in the BIOS Settings tab\n2. Click **Apply N Change(s)** button in the toolbar\n3. Changes are submitted as pending via Redfish BIOS/Settings endpoint\n4. A server reboot is required to apply the changes\n5. Pending changes are shown in an amber banner at the bottom' },
      { heading: 'Boot Order', body: 'The Boot Order tab shows the current boot device sequence:\n\n• Each device shows its name, position, and enabled/disabled status\n• Boot mode (UEFI/BIOS) is displayed at the top\n• Boot order can be modified via the API (drag-drop UI planned for future release)' },
      { heading: 'Hardware Inventory', body: 'The Inventory tab provides detailed component information:\n\n• **Processors** — Model, cores, threads, max speed, architecture, cache sizes\n• **Memory DIMMs** — Slot, capacity, speed, type, manufacturer, serial number\n• **PCIe Devices** — Name, model, manufacturer, slot type, bus width, status' },
    ],
  },
  {
    id: 'maintenance', icon: Wrench, title: 'Maintenance', subtitle: 'Firmware, sensors, power, thermal, and event logs',
    content: [
      { heading: 'Firmware Inventory', body: 'View all installed firmware components:\n\n• Component name, version, updateability status, install date\n• Automatically identifies iDRAC firmware, BIOS, and Lifecycle Controller versions\n• Available on iDRAC 8/9 via Redfish FirmwareInventory endpoint' },
      { heading: 'Sensor Readings', body: 'Real-time sensor data from the server\'s BMC:\n\n• **Temperature** — CPU, inlet, exhaust, and component temperatures in °C\n• **Fans** — RPM readings for all system fans\n• **Voltage** — System voltage sensors with warning/critical thresholds\n• **Power** — PSU input wattage and voltage readings\n\nEach sensor shows its current value, location, warning threshold, critical threshold, and status.' },
      { heading: 'Power Management', body: '**Power Actions:**\n• Power On, Graceful Shutdown, Reset, Power Cycle, NMI (Debug)\n\n**Power Readings:**\n• Current, Average, Peak, and Minimum power consumption in watts\n• Power supplies detail: model, wattage, input voltage, firmware, status\n\n**Power Cap:**\n• Set a power consumption limit in watts\n• Remove power cap to allow unrestricted consumption' },
      { heading: 'Thermal Monitoring', body: 'Dedicated thermal view showing:\n\n• **Temperature Sensors** — Name, reading (°C), location, warning/critical thresholds\n• **Fan Status** — Name, speed (RPM), health status\n\nColor-coded status indicators: green (healthy), amber (warning), red (critical).' },
      { heading: 'System Event Log', body: 'The SEL displays all logged events from the iDRAC:\n\n• Severity-coded entries (informational, warning, critical) with appropriate icons\n• Timestamp and source component for each entry\n• Up to 50 most recent entries displayed by default' },
    ],
  },
  {
    id: 'idrac-settings', icon: Shield, title: 'iDRAC Settings', subtitle: 'Network, users, virtual media, certificates, licenses, jobs',
    content: [
      { heading: 'iDRAC Network', body: 'View and configure the iDRAC network interface:\n\n• DHCP status, IP address, subnet mask, gateway\n• MAC address, hostname, domain name\n• DNS servers and VLAN configuration\n• Network settings can be modified on iDRAC 8/9 via Redfish PATCH' },
      { heading: 'iDRAC User Management', body: 'Manage iDRAC local user accounts:\n\n• View all configured users with their ID, username, enabled status, and privilege level\n• Create new users with username, password, and role (Administrator, Operator, ReadOnly)\n• Delete existing users\n• Available on iDRAC 7/8/9' },
      { heading: 'Virtual Media', body: 'Mount remote ISO images for OS installation or recovery:\n\n• View current CD/DVD and Removable Disk mount status\n• Mount an image via CIFS share (//server/share/image.iso), NFS, or HTTP URL\n• Eject currently mounted media\n• Supported on iDRAC 7/8/9 (best support on 8/9)' },
      { heading: 'SSL Certificates', body: 'View installed SSL certificates on the iDRAC:\n\n• Subject, Issuer, Valid From/To dates, Serial Number\n• Helps verify certificate expiration and authenticity\n• Available on iDRAC 8/9 via Redfish' },
      { heading: 'Licenses', body: 'View iDRAC license status:\n\n• License type, description, status (active/expired/evaluation)\n• Expiration date (perpetual licenses show no date)\n• Available on iDRAC 8/9' },
      { heading: 'Lifecycle Controller Jobs', body: 'View and manage the LC job queue:\n\n• Job ID, name, status (scheduled/running/completed/failed), progress percentage\n• Clear individual jobs or the entire queue\n• SCP Export: download the full Server Configuration Profile as JSON or XML' },
    ],
  },
  {
    id: 'console', icon: Monitor, title: 'Virtual Console', subtitle: 'Remote console access for all generations',
    content: [
      { heading: 'Console Types', body: '**HTML5 Console (iDRAC 8/9):**\nModern iDRAC controllers include a built-in HTML5 console. The console page opens the native iDRAC console in a new browser window — no plugins required.\n\n**noVNC Bridge (iDRAC 6/7):**\nLegacy iDRAC controllers require Java-based viewers. Universal iDRAC Console runs the Java viewer inside a Docker container and streams the video via WebSocket using noVNC — no client-side Java needed.' },
      { heading: 'Console Features', body: '• **Fullscreen Mode** — Expand the console to fill the entire screen\n• **Reconnect** — Quickly re-establish a dropped connection\n• **Send Keys** — Send special key combinations (Ctrl+Alt+Del, etc.)\n• **Connection Info** — View server name, IP, generation, and console type' },
      { heading: 'Quick Power Actions', body: 'Below the console viewport, quick power action buttons are available:\n\n• Power On (green)\n• Graceful Shutdown (amber)\n• Reset (blue)\n• Power Cycle (orange)\n• NMI Debug (red)\n\nThis allows server reboots during OS installation without leaving the console page.' },
    ],
  },
  {
    id: 'security-audit', icon: FileText, title: 'Security & Audit', subtitle: 'Authentication, RBAC, session management, and audit logging',
    content: [
      { heading: 'Authentication', body: '**Login Flow:**\n1. User submits username and password\n2. Server validates credentials using argon2id hash comparison\n3. On success, returns JWT access token (15 min) and refresh token (7 days)\n4. Refresh token is stored in an HTTP-only cookie\n5. Access token is stored in localStorage and sent via Authorization header\n\n**Session Timeout:**\nAfter 15 minutes of inactivity, a warning modal appears with a 2-minute countdown. If the user doesn\'t interact, they are automatically logged out.' },
      { heading: 'RBAC Roles', body: '• **Owner** — Full access, can manage users and organization settings\n• **Admin** — Can manage servers and view audit logs\n• **Operator** — Can perform server operations (power, console, virtual media)\n• **Viewer** — Read-only access to dashboards and server information\n\n**Super Admin:** The "system" tenant owner can see all servers, users, and logs across all tenants via the Admin Panel.' },
      { heading: 'Admin Panel', body: 'The Admin Panel is available to users with the Owner role and provides:\n\n• **Overview** — Stats cards showing organizations, users, servers, and session counts\n• **Organizations** — Expandable list of all tenants with their users and servers\n• **All Users** — Searchable table of every user across all tenants\n• **All Servers** — Searchable table of every server with health status\n• **Active Sessions** — View and revoke active sessions across the platform\n\nSuper admin users (system tenant owners) see data from all organizations.' },
      { heading: 'Audit Logging', body: 'Every significant action is recorded in the immutable audit log:\n\n• User login/logout, registration, password changes\n• Server add/remove/update, credential changes\n• Power actions, identify LED toggle\n• Virtual media mount/eject\n• Console open/close\n• Tenant and user management actions\n\nLogs include: action type, user, server (if applicable), IP address, and timestamp.' },
      { heading: 'Active Sessions', body: 'View and manage active sessions via the Admin Panel or API:\n\n• `GET /api/auth/sessions` — List all active sessions with IP, user agent, expiration\n• `DELETE /api/auth/sessions/:id` — Revoke a specific session\n\nExpired sessions are automatically cleaned up every hour.' },
    ],
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [search, setSearch] = useState('');

  const section = sections.find((s) => s.id === activeSection) || sections[0];

  const filteredSections = search
    ? sections.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.content.some((c) => c.heading.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase())))
    : sections;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <div className="flex-1 flex">
        {/* Sidebar — sticky */}
        <aside className="w-72 bg-white border-r border-border-card shrink-0 hidden lg:block sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto">
          <div className="p-4 border-b border-border-card">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search docs..." className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-1 focus:ring-dell-blue" />
            </div>
          </div>
          <nav className="p-2 space-y-0.5">
            {filteredSections.map((s, i) => {
              const isActive = activeSection === s.id;
              const num = String(i + 1).padStart(2, '0');
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded flex items-center gap-3 transition-colors ${isActive ? 'bg-dell-blue/10 text-dell-blue' : 'text-text-secondary hover:text-text-primary hover:bg-row-hover'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-dell-blue text-white' : 'bg-gray-100 text-text-secondary'}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-dell-blue/60' : 'text-text-secondary/50'}`}>{num}</div>
                    <div className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{s.title}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 bg-bg-body">
          {/* Mobile section picker */}
          <div className="lg:hidden p-4 bg-white border-b border-border-card">
            <select value={activeSection} onChange={(e) => setActiveSection(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm">
              {sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title}</option>)}
            </select>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-2">
              <section.icon className="w-8 h-8 text-dell-blue" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{section.title}</h1>
                <p className="text-sm text-text-secondary">{section.subtitle}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {section.content.map((block, i) => (
                <div key={i} className="bg-white border border-border-card rounded">
                  <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{block.heading}</h2>
                  </div>
                  <div className="p-4 prose prose-sm max-w-none text-text-secondary leading-relaxed">
                    {block.body.split('\n').map((line, j) => {
                      if (line.startsWith('```')) return null;
                      if (line.startsWith('• **')) {
                        const match = line.match(/^• \*\*(.+?)\*\*(.*)$/);
                        if (match) return <p key={j} className="ml-4 my-1"><strong className="text-text-primary">{match[1]}</strong>{match[2]}</p>;
                      }
                      if (line.startsWith('• ✅')) return <p key={j} className="ml-4 my-1">✅ {line.slice(4)}</p>;
                      if (line.startsWith('• ')) return <p key={j} className="ml-4 my-1">• {line.slice(2)}</p>;
                      if (line.match(/^\d+\./)) return <p key={j} className="ml-4 my-1">{line}</p>;
                      if (line.startsWith('**') && line.endsWith('**')) return <h3 key={j} className="font-semibold text-text-primary mt-4 mb-1">{line.replace(/\*\*/g, '')}</h3>;
                      if (line.startsWith('**')) {
                        const parts = line.split('**');
                        return <p key={j} className="mt-3 mb-1">{parts.map((p, k) => k % 2 === 1 ? <strong key={k} className="text-text-primary">{p}</strong> : p)}</p>;
                      }
                      if (line.trim() === '') return <br key={j} />;
                      return <p key={j} className="my-1">{line}</p>;
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Prev/Next */}
            <div className="mt-6 flex justify-between">
              {sections.findIndex((s) => s.id === activeSection) > 0 ? (
                <button onClick={() => setActiveSection(sections[sections.findIndex((s) => s.id === activeSection) - 1].id)} className="px-4 py-2 bg-white border border-border-card text-sm font-semibold text-dell-blue rounded hover:bg-row-hover transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 rotate-180" /> {sections[sections.findIndex((s) => s.id === activeSection) - 1].title}
                </button>
              ) : <div />}
              {sections.findIndex((s) => s.id === activeSection) < sections.length - 1 ? (
                <button onClick={() => setActiveSection(sections[sections.findIndex((s) => s.id === activeSection) + 1].id)} className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5">
                  {sections[sections.findIndex((s) => s.id === activeSection) + 1].title} <ChevronRight className="w-4 h-4" />
                </button>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
