/** Documentation hub — 12-section interactive guide. */
'use client';
import { useState, useCallback } from 'react';
import { BookOpen, Server, Shield, Monitor, Zap, HardDrive, Wrench, Globe, Settings, FileText, ChevronRight, Search, Package, Rocket, Copy, Check, ChevronDown } from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';
import AppShell from '@/components/layout/app-shell';
import AuthGate from '@/components/layout/auth-gate';
import { useAuthUser } from '@/lib/auth-client';
import { headerStickyOffset } from '@/lib/navigation';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [text]);
  return (
    <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white/60 hover:text-white transition-colors" title="Copy to clipboard">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative my-3 rounded bg-gray-900 overflow-hidden group">
      {lang && <div className="px-3 py-1 bg-gray-800 text-gray-400 text-[10px] font-mono uppercase tracking-wider">{lang}</div>}
      <CopyButton text={code} />
      <pre className="px-4 py-3 text-sm text-gray-100 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function InlineCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [text]);
  return (
    <code
      onClick={handleCopy}
      className="px-1.5 py-0.5 bg-gray-100 text-dell-blue text-[13px] font-mono rounded cursor-pointer hover:bg-dell-blue/10 transition-colors inline-flex items-center gap-1"
      title="Click to copy"
    >
      {text}
      {copied ? <Check className="w-3 h-3 text-green-600 inline" /> : <Copy className="w-2.5 h-2.5 text-text-secondary/40 inline" />}
    </code>
  );
}

const sections = [
  {
    id: 'getting-started', icon: BookOpen, title: 'Getting Started', subtitle: 'Introduction and prerequisites',
    content: [
      { heading: 'What is Universal iDRAC Console?', body: 'Universal iDRAC Console is a zero-client-install, Docker-hosted web platform for managing Dell PowerEdge servers across all iDRAC generations (6, 7, 8, and 9).\n\nIt provides a single, modern web interface that replaces the need for Java plugins, ActiveX controls, or generation-specific browser requirements.\n\n**Key highlights:**\n- Works with iDRAC 6 through iDRAC 9 (PowerEdge 11G-16G)\n- No client-side software or plugins required\n- Deploy in under 5 minutes with Docker Compose\n- Multi-tenant with full RBAC and audit logging\n- Open source and self-hosted' },
      { heading: 'Prerequisites', body: 'Before installing, ensure your system has:\n\n- **Docker Engine** 20.10+ (or Docker Desktop)\n- **Docker Compose** v2.x\n- **Git** (to clone the repository)\n- **2 CPU cores**, 2GB RAM, 10GB disk space (minimum)\n\n**Supported host operating systems:**\n- Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+)\n- macOS 12+ (with Docker Desktop)\n- Windows 10/11 (with Docker Desktop or WSL2)\n\n**Network requirements:**\n- Outbound HTTPS access to iDRAC endpoints on your servers\n- Port 3000 (frontend) and 4000 (API) available on the host' },
    ],
  },
  {
    id: 'installation', icon: Package, title: 'Installation', subtitle: 'Docker setup, configuration, and first run',
    content: [
      { heading: 'Clone the Repository', body: 'Start by cloning the project from GitHub:\n\n```bash\ngit clone https://github.com/sumit-kumawat/universal-idrac-console.git\ncd universal-idrac-console\n```' },
      { heading: 'Configure Environment', body: 'Copy the example environment file and configure your secrets:\n\n```bash\ncp .env.example .env\n```\n\nOpen `.env` in your editor and set these required variables:\n\n- `POSTGRES_URL` -- PostgreSQL connection string\n- `REDIS_URL` -- Redis connection string\n- `JWT_SECRET` -- A strong random string for JWT signing (min 32 chars)\n- `REFRESH_SECRET` -- A strong random string for refresh tokens (min 32 chars)\n- `MASTER_ENCRYPTION_KEY` -- 64-character hex string for AES-256 credential encryption\n\n**Generate secure values:**\n\n```bash\nopenssl rand -hex 32\nopenssl rand -base64 32\n```\n\nNever use default or example secrets in production.' },
      { heading: 'Start with Docker Compose', body: 'From the **repository root** (not `frontend/` — that path is used by other projects):\n\n```bash\nbash scripts/host.sh\n# or:\ndocker compose up -d --build\n```\n\nThis starts 5 containers:\n\n- **postgres** -- PostgreSQL 16 database\n- **redis** -- Redis 7 session store\n- **api** -- NestJS backend on port 4000\n- **web** -- Next.js frontend on port 3000\n- **console-gw** -- Virtual console gateway on port 6080\n\nThe database schema is applied on API startup via Prisma.\n\n**Verify the deployment:**\n\n```bash\ndocker compose ps\ncurl http://localhost:4000/api/health\n```\n\nOpen **http://localhost:3000** in your browser.' },
      { heading: 'First Account Setup', body: 'After deploying the application:\n\n1. Navigate to `http://localhost:3000/register`\n2. Enter your organization name, email, and a strong password\n3. Your account is created as the organization **Owner** with full access\n\nThe first registered user has super admin capabilities with cross-tenant visibility.' },
      { heading: 'Common Docker Commands', body: '```bash\n# Start services\ndocker compose up -d\n\n# Stop services\ndocker compose down\n\n# View logs\ndocker compose logs -f api\ndocker compose logs -f web\n\n# Restart a service\ndocker compose restart api\n\n# Rebuild after code changes\ndocker compose up -d --build\n\n# Reset database (deletes all data)\ndocker compose down -v\n\n# Check status\ndocker compose ps\n```' },
    ],
  },
  {
    id: 'deployment', icon: Rocket, title: 'Deployment', subtitle: 'Production deployment, scaling, and maintenance',
    content: [
      { heading: 'Production Checklist', body: 'Before deploying to production, verify:\n\n- Generate unique, strong secrets for JWT_SECRET, REFRESH_SECRET, and MASTER_ENCRYPTION_KEY\n- Change default PostgreSQL credentials\n- Enable TLS/HTTPS via a reverse proxy (nginx, Traefik, or Caddy)\n- Set up database backups (pg_dump or continuous archiving)\n- Configure firewall rules -- only expose port 443 (HTTPS)\n- Set NODE_ENV=production in .env\n- Configure Redis password authentication\n- Review and set IP allowlists for tenant access control' },
      { heading: 'Reverse Proxy with Nginx', body: 'Example nginx configuration for HTTPS termination:\n\n```nginx\nserver {\n    listen 443 ssl;\n    server_name idrac.example.com;\n\n    ssl_certificate /etc/ssl/certs/idrac.pem;\n    ssl_certificate_key /etc/ssl/private/idrac.key;\n\n    location / {\n        proxy_pass http://localhost:3000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location /api/ {\n        proxy_pass http://localhost:4000/api/;\n    }\n}\n```' },
      { heading: 'Reverse Proxy with Caddy', body: 'Caddy provides automatic HTTPS with Let\'s Encrypt:\n\n```caddy\nidrac.example.com {\n    reverse_proxy /api/* localhost:4000\n    reverse_proxy * localhost:3000\n}\n```\n\nCaddy automatically obtains and renews TLS certificates.' },
      { heading: 'Database Backup & Restore', body: '**Create a backup:**\n\n```bash\ndocker compose exec postgres pg_dump -U idrac idrac > backup-$(date +%Y%m%d).sql\n```\n\n**Restore from backup:**\n\n```bash\ndocker compose exec -T postgres psql -U idrac idrac < backup.sql\n```\n\n**Automated daily backups (cron):**\n\n```bash\n0 2 * * * cd /opt/idrac && docker compose exec -T postgres pg_dump -U idrac idrac | gzip > /backups/idrac-$(date +\\%Y\\%m\\%d).sql.gz\n```\n\nStore backups on a separate volume or remote storage for disaster recovery.' },
      { heading: 'Updating to Latest Version', body: '```bash\ncd /opt/universal-idrac-console\ngit pull origin main\ndocker compose up -d --build\n```\n\nDatabase migrations run automatically on startup. Always backup your database before updating.\n\n**Zero-downtime updates:**\nFor production environments, use Docker Compose rolling updates or a blue-green deployment strategy.' },
      { heading: 'Monitoring & Health Checks', body: 'The API provides health check endpoints:\n\n- `GET /api/` -- Returns API name, version, and status\n- `GET /api/health` -- Returns `{"status":"ok"}` with timestamp\n\nUse these with your monitoring system (Prometheus, Datadog, UptimeRobot, etc.) to track availability.\n\nDocker health checks are built into the Compose configuration and will automatically restart unhealthy containers.' },
    ],
  },
  {
    id: 'architecture', icon: Globe, title: 'Architecture', subtitle: 'System design, adapter pattern, and data flow',
    content: [
      { heading: 'System Overview', body: 'Universal iDRAC Console uses a **multi-strategy adapter pattern** to communicate with different iDRAC generations:\n\n- **Redfish Adapter** (iDRAC 8/9) -- REST API over HTTPS using Dell\'s Redfish implementation\n- **Legacy Java Adapter** (iDRAC 7) -- XML-based `/data?get=` endpoints with cookie-based sessions\n- **Legacy CGI Adapter** (iDRAC 6) -- HTML form-based `/cgi-bin/webcgi/` endpoints\n\nThe adapter factory automatically selects the right adapter based on generation detection.' },
      { heading: 'Tech Stack', body: '**Backend:** NestJS (TypeScript) with Prisma ORM, JWT auth, argon2id password hashing\n\n**Frontend:** Next.js 14 App Router, Tailwind CSS with Dell iDRAC 9 theme, lucide-react icons\n\n**Database:** PostgreSQL 16 with tenant-isolated data model\n\n**Cache:** Redis 7 for session management and rate limiting\n\n**Monorepo:** pnpm workspaces + Turborepo with shared packages (@idrac/shared, @idrac/adapters, @idrac/db)' },
      { heading: 'Project Structure', body: '```\nuniversal-idrac-console/\n  apps/\n    api/          # NestJS backend (port 4000)\n    web/          # Next.js frontend (port 3000)\n  packages/\n    adapters/     # iDRAC protocol adapters\n    db/           # Prisma schema & migrations\n    shared/       # Shared types & interfaces\n  docker-compose.yml\n  Dockerfile\n  .env.example\n```' },
      { heading: 'Data Flow', body: '1. User interacts with the Next.js frontend\n2. Frontend sends API requests to the NestJS backend\n3. Backend validates JWT tokens and tenant authorization\n4. Backend instantiates the correct adapter based on server generation\n5. Adapter communicates with the physical iDRAC controller\n6. Response is normalized to a standard interface and returned to the frontend\n7. All actions are logged in the audit log' },
      { heading: 'Security Model', body: '- **Authentication:** JWT access tokens (15 min) + refresh tokens (7 days) with rotation\n- **Password Storage:** argon2id hashing (winner of the Password Hashing Competition)\n- **Credential Encryption:** AES-256-GCM for stored iDRAC credentials\n- **Session Timeout:** 15-minute inactivity auto-logout with 2-minute warning\n- **Multi-Tenant Isolation:** All data is scoped to a tenant via foreign key constraints\n- **Rate Limiting:** 5 login attempts/minute/IP, 100 requests/minute general' },
    ],
  },
  {
    id: 'server-management', icon: Server, title: 'Server Management', subtitle: 'Adding, editing, and removing servers',
    content: [
      { heading: 'Adding a Server', body: '1. Navigate to **Dashboard** then click **Add Server**\n2. Enter the iDRAC IP address and credentials\n3. Click **Probe Server** -- the system auto-detects the iDRAC generation\n4. Review detected information (model, service tag, health status)\n5. Name your server and choose credential storage mode:\n   - **Session Only** -- credentials kept in memory for 30 minutes\n   - **Save Encrypted** -- credentials stored with AES-256-GCM encryption' },
      { heading: 'Editing a Server', body: 'From the server list or detail page, click the edit button to modify:\n\n- Server display name\n- Tags for organization\n- Credential storage mode\n\nChanges are saved immediately and logged in the audit trail.' },
      { heading: 'Deleting a Server', body: 'Servers can be deleted from the server list or detail page. Deletion is permanent and removes:\n\n- Server record and all associated data\n- Console session history\n- Server-specific audit log entries (via cascade)\n\nA confirmation dialog prevents accidental deletion.' },
      { heading: 'Auto-Detection', body: 'When probing a server, the adapter factory tries protocols in order:\n\n1. **Redfish** (`/redfish/v1/`) -- if RedfishVersion >= 1.6 then iDRAC 9, else iDRAC 8\n2. **Legacy XML** (`/data?get=version`) -- iDRAC 7\n3. **Legacy CGI** (`/cgi-bin/webcgi/login`) -- iDRAC 6\n\nIf none respond, an error is returned with connectivity troubleshooting guidance.' },
    ],
  },
  {
    id: 'dashboard-health', icon: Zap, title: 'Dashboard & Health', subtitle: 'Fleet overview and server health monitoring',
    content: [
      { heading: 'Fleet Dashboard', body: 'The main dashboard provides a bird\'s-eye view of your entire server fleet:\n\n- **Stats Bar** -- Total servers, healthy, warning, critical counts\n- **Search** -- Filter servers by name or IP address\n- **Server Cards** -- Click any card to drill into the server detail dashboard\n- **Health Indicators** -- Color-coded dots (green/amber/red/gray) show status at a glance' },
      { heading: 'Server Dashboard', body: 'Each server has a detail dashboard modeled after the Dell iDRAC 9 web interface:\n\n- **Health Banner** -- Full-width colored banner showing overall system health\n- **Health Aspects** -- CPU, Memory, Storage, Network, Fan, PSU, Temperature\n- **System Information** -- Model, hostname, OS, BIOS version, iDRAC firmware\n- **Recent Logs** -- Last 5 system event log entries with severity icons\n- **Virtual Console Preview** -- Quick-launch button for remote console access' },
      { heading: 'Health Status Levels', body: '- **Healthy** (Green) -- All components operating normally\n- **Warning** (Amber) -- Non-critical issues detected (degraded redundancy, approaching thresholds)\n- **Critical** (Red) -- Immediate attention required (component failure, threshold exceeded)\n- **Unknown** (Gray) -- Unable to determine health (server unreachable, legacy limitation)' },
    ],
  },
  {
    id: 'storage', icon: HardDrive, title: 'Storage Management', subtitle: 'RAID controllers, physical disks, and virtual disks',
    content: [
      { heading: 'Storage Overview', body: 'The Storage page shows a complete inventory of the server\'s storage subsystem:\n\n- **RAID Controllers** -- Name, model, firmware version, cache size, PCI slot, status\n- **Physical Disks** -- Model, serial number, capacity, media type (HDD/SSD/NVMe), protocol, speed\n- **Virtual Disks** -- RAID level, capacity, stripe size, read/write cache policies' },
      { heading: 'Generation Support', body: '**iDRAC 8/9 (Redfish):** Full storage detail including manufacturer, predicted failure status, negotiated speed, cache policies.\n\n**iDRAC 7 (Legacy):** Storage data parsed from XML endpoints `/data?get=pd` and `/data?get=vd`.\n\n**iDRAC 6 (CGI):** Limited storage visibility due to protocol constraints.' },
    ],
  },
  {
    id: 'bios-config', icon: Settings, title: 'BIOS & Configuration', subtitle: 'BIOS settings, boot order, and hardware inventory',
    content: [
      { heading: 'BIOS Attributes', body: 'The Configuration page provides a searchable, grouped view of all BIOS attributes:\n\n- Attributes are organized by category (e.g., Processor, Memory, Network, Security)\n- Click a group to expand and see individual settings\n- Editable attributes show an input field; read-only attributes show as plain text\n- Modified values are highlighted in blue and collected for batch submission' },
      { heading: 'Applying BIOS Changes', body: '1. Modify desired attributes in the BIOS Settings tab\n2. Click **Apply N Change(s)** button in the toolbar\n3. Changes are submitted as pending via Redfish BIOS/Settings endpoint\n4. A server reboot is required to apply the changes\n5. Pending changes are shown in an amber banner at the bottom' },
      { heading: 'Boot Order & Inventory', body: 'The Boot Order tab shows the current boot device sequence with device name, position, and enabled/disabled status. Boot mode (UEFI/BIOS) is displayed at the top.\n\nThe Inventory tab provides detailed component information:\n\n- **Processors** -- Model, cores, threads, max speed, architecture, cache sizes\n- **Memory DIMMs** -- Slot, capacity, speed, type, manufacturer, serial number\n- **PCIe Devices** -- Name, model, manufacturer, slot type, bus width, status' },
    ],
  },
  {
    id: 'maintenance', icon: Wrench, title: 'Maintenance', subtitle: 'Firmware, sensors, power, thermal, and event logs',
    content: [
      { heading: 'Firmware Inventory', body: 'View all installed firmware components with component name, version, updateability status, and install date. Automatically identifies iDRAC firmware, BIOS, and Lifecycle Controller versions.' },
      { heading: 'Sensor Readings', body: 'Real-time sensor data from the server\'s BMC:\n\n- **Temperature** -- CPU, inlet, exhaust, and component temperatures in degrees C\n- **Fans** -- RPM readings for all system fans\n- **Voltage** -- System voltage sensors with warning/critical thresholds\n- **Power** -- PSU input wattage and voltage readings\n\nEach sensor shows its current value, location, warning threshold, critical threshold, and status.' },
      { heading: 'Power & Thermal', body: '**Power Actions:** Power On, Graceful Shutdown, Reset, Power Cycle, NMI (Debug)\n\n**Power Readings:** Current, Average, Peak, and Minimum power consumption in watts. Power supplies detail including model, wattage, input voltage, firmware, and status.\n\n**Thermal Monitoring:** Temperature sensors and fan status with color-coded indicators (green/amber/red).\n\n**Power Cap:** Set or remove a power consumption limit in watts.' },
      { heading: 'System Event Log', body: 'The SEL displays all logged events from the iDRAC with severity-coded entries (informational, warning, critical), timestamp and source component. Up to 50 most recent entries are displayed by default.' },
    ],
  },
  {
    id: 'idrac-settings', icon: Shield, title: 'iDRAC Settings', subtitle: 'Network, users, virtual media, certificates, licenses, jobs',
    content: [
      { heading: 'iDRAC Network', body: 'View and configure the iDRAC network interface including DHCP status, IP address, subnet mask, gateway, MAC address, hostname, domain name, DNS servers, and VLAN configuration.' },
      { heading: 'iDRAC User Management', body: 'Manage iDRAC local user accounts:\n\n- View all configured users with ID, username, enabled status, and privilege level\n- Create new users with username, password, and role (Administrator, Operator, ReadOnly)\n- Delete existing users\n- Available on iDRAC 7/8/9' },
      { heading: 'Virtual Media & Certificates', body: '**Virtual Media:** Mount remote ISO images for OS installation or recovery via CIFS share, NFS, or HTTP URL. Eject currently mounted media.\n\n**SSL Certificates:** View installed certificates with Subject, Issuer, Valid From/To dates, and Serial Number.\n\n**Licenses:** View license type, description, status (active/expired/evaluation), and expiration date.' },
      { heading: 'Lifecycle Controller Jobs', body: 'View and manage the LC job queue with Job ID, name, status (scheduled/running/completed/failed), and progress percentage. Clear individual jobs or the entire queue. Export the full Server Configuration Profile as JSON or XML.' },
    ],
  },
  {
    id: 'console', icon: Monitor, title: 'Virtual Console', subtitle: 'Remote console access for all generations',
    content: [
      { heading: 'Console Types', body: '**HTML5 Console (iDRAC 8/9):**\nModern iDRAC controllers include a built-in HTML5 console. The console page opens the native iDRAC console in a new browser window with no plugins required.\n\n**noVNC Bridge (iDRAC 6/7):**\nLegacy iDRAC controllers require Java-based viewers. Universal iDRAC Console runs the Java viewer inside a Docker container and streams the video via WebSocket using noVNC, eliminating client-side Java dependencies.' },
      { heading: 'Console Features', body: '- **Fullscreen Mode** -- Expand the console to fill the entire screen\n- **Reconnect** -- Quickly re-establish a dropped connection\n- **Send Keys** -- Send special key combinations (Ctrl+Alt+Del, etc.)\n- **Connection Info** -- Hover the info icon to view server name, IP, generation, and console type\n- **New Window** -- Open the console in a separate browser window' },
    ],
  },
  {
    id: 'security-audit', icon: FileText, title: 'Security & Audit', subtitle: 'Authentication, RBAC, session management, and audit logging',
    content: [
      { heading: 'Authentication', body: '**Login Flow:**\n1. User submits username and password\n2. Server validates credentials using argon2id hash comparison\n3. On success, returns JWT access token (15 min) and refresh token (7 days)\n4. Refresh token is stored in an HTTP-only cookie\n5. Access token is stored in localStorage and sent via Authorization header\n\n**Session Timeout:**\nAfter 15 minutes of inactivity, a warning modal appears with a 2-minute countdown. If the user does not interact, they are automatically logged out.' },
      { heading: 'RBAC Roles', body: '- **Owner** -- Full access, can manage users and organization settings\n- **Admin** -- Can manage servers and view audit logs\n- **Operator** -- Can perform server operations (power, console, virtual media)\n- **Viewer** -- Read-only access to dashboards and server information\n\n**Super Admin:** The "system" tenant owner can see all servers, users, and logs across all tenants via the Admin Panel.' },
      { heading: 'Admin Panel', body: 'The Admin Panel is available to users with the Owner role and provides:\n\n- **Overview** -- Stats cards showing organizations, users, servers, and session counts\n- **Organizations** -- Expandable list of all tenants with their users and servers\n- **All Users** -- Searchable table of every user across all tenants\n- **All Servers** -- Searchable table of every server with health status\n- **Active Sessions** -- View and revoke active sessions across the platform' },
      { heading: 'Audit Logging', body: 'Every significant action is recorded in the immutable audit log:\n\n- User login/logout, registration, password changes\n- Server add/remove/update, credential changes\n- Power actions, identify LED toggle\n- Virtual media mount/eject\n- Console open/close\n- Tenant and user management actions\n\nLogs include: action type, user, server (if applicable), IP address, and timestamp.' },
    ],
  },
];

function renderDocBody(body: string) {
  const lines = body.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(<CodeBlock key={elements.length} code={codeLines.join('\n')} lang={lang} />);
      continue;
    }

    if (line.startsWith('- **')) {
      const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
      if (match) {
        elements.push(<p key={i} className="ml-4 my-1.5 flex gap-1.5"><span className="text-dell-blue mt-0.5 shrink-0">-</span><span><strong className="text-text-primary">{match[1]}</strong>{match[2]}</span></p>);
        i++; continue;
      }
    }

    if (line.startsWith('- ')) {
      elements.push(<p key={i} className="ml-4 my-1.5 flex gap-1.5"><span className="text-dell-blue mt-0.5 shrink-0">-</span><span>{renderInline(line.slice(2))}</span></p>);
      i++; continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s(.*)$/);
      if (num) {
        elements.push(
          <p key={i} className="ml-4 my-1.5 flex gap-2.5">
            <span className="w-5 h-5 rounded-full bg-dell-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{num[1]}</span>
            <span>{renderInline(num[2])}</span>
          </p>
        );
        i++; continue;
      }
    }

    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<h3 key={i} className="font-semibold text-text-primary mt-4 mb-1.5 text-sm">{line.replace(/\*\*/g, '')}</h3>);
      i++; continue;
    }

    if (line.startsWith('**')) {
      const parts = line.split('**');
      elements.push(<p key={i} className="mt-3 mb-1">{parts.map((p, k) => k % 2 === 1 ? <strong key={k} className="text-text-primary">{p}</strong> : <span key={k}>{p}</span>)}</p>);
      i++; continue;
    }

    if (line.trim() === '') { elements.push(<div key={i} className="h-2" />); i++; continue; }

    elements.push(<p key={i} className="my-1">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return <InlineCode key={i} text={code} />;
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="text-text-primary">{bp.slice(2, -2)}</strong>;
      }
      return <span key={`${i}-${j}`}>{bp}</span>;
    });
  });
}

export default function DocsPage() {
  const { loggedIn, ready } = useAuthUser();
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set(sections[0].content.map((_, i) => i)));

  const section = sections.find((s) => s.id === activeSection) || sections[0];
  const stickyTop = headerStickyOffset(loggedIn);

  const filteredSections = search
    ? sections.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.content.some((c) => c.heading.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase())))
    : sections;

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    const sec = sections.find((s) => s.id === id);
    if (sec) setExpandedCards(new Set(sec.content.map((_, i) => i)));
  };

  const toggleCard = (index: number) => {
    const next = new Set(expandedCards);
    next.has(index) ? next.delete(index) : next.add(index);
    setExpandedCards(next);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-body text-sm text-text-secondary">
        Loading…
      </div>
    );
  }

  const docsBody = (
    <div className="flex-1 px-4 sm:px-6 py-6">
      <div
        className="max-w-layout mx-auto flex flex-col lg:flex-row gap-0 bg-white border border-border-card rounded overflow-hidden min-h-[calc(100vh-12rem)]"
        style={{ ['--docs-sticky-top' as string]: stickyTop }}
      >
        <aside
          className="w-full lg:w-64 xl:w-72 bg-white border-b lg:border-b-0 lg:border-r border-border-card shrink-0 lg:sticky lg:self-start overflow-y-auto z-10"
          style={{ top: stickyTop, maxHeight: `calc(100vh - ${stickyTop} - 5rem)` }}
          aria-label="Documentation sections"
        >
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
                <button key={s.id} onClick={() => handleSectionChange(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded flex items-center gap-3 transition-colors ${isActive ? 'bg-dell-blue/10 text-dell-blue' : 'text-text-secondary hover:text-text-primary hover:bg-row-hover'}`}>
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
        <main className="flex-1 min-w-0 bg-bg-body">
          <div className="lg:hidden p-4 bg-white border-b border-border-card">
            <select value={activeSection} onChange={(e) => handleSectionChange(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm">
              {sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title}</option>)}
            </select>
          </div>

          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-2">
              <section.icon className="w-8 h-8 text-dell-blue" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{section.title}</h1>
                <p className="text-sm text-text-secondary">{section.subtitle}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {section.content.map((block, i) => {
                const isExpanded = expandedCards.has(i);
                return (
                  <div key={i} className="bg-white border border-border-card rounded overflow-hidden">
                    <button
                      onClick={() => toggleCard(i)}
                      className="w-full bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{block.heading}</h2>
                      <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="p-4 prose prose-sm max-w-none text-text-secondary leading-relaxed animate-in">
                        {renderDocBody(block.body)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prev/Next */}
            <div className="mt-6 flex justify-between">
              {sections.findIndex((s) => s.id === activeSection) > 0 ? (
                <button onClick={() => handleSectionChange(sections[sections.findIndex((s) => s.id === activeSection) - 1].id)} className="px-4 py-2 bg-white border border-border-card text-sm font-semibold text-dell-blue rounded hover:bg-row-hover transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 rotate-180" /> {sections[sections.findIndex((s) => s.id === activeSection) - 1].title}
                </button>
              ) : <div />}
              {sections.findIndex((s) => s.id === activeSection) < sections.length - 1 ? (
                <button onClick={() => handleSectionChange(sections[sections.findIndex((s) => s.id === activeSection) + 1].id)} className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5">
                  {sections[sections.findIndex((s) => s.id === activeSection) + 1].title} <ChevronRight className="w-4 h-4" />
                </button>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  if (loggedIn) {
    return (
      <AuthGate>
        <AppShell>{docsBody}</AppShell>
      </AuthGate>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-body">
      <PublicHeader />
      {docsBody}
      <PublicFooter />
    </div>
  );
}
