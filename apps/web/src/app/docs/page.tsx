/** Documentation hub — interactive product guide. */
'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BookOpen, Server, Shield, Monitor, Zap, HardDrive, Wrench, Globe, Settings, FileText, ChevronRight, Copy, Check, ChevronDown, Link2, Tags, Radio } from 'lucide-react';
import AppShell from '@/components/layout/app-shell';
import AppPreloader from '@/components/layout/app-preloader';
import AuthGate from '@/components/layout/auth-gate';
import DocsSidebar from '@/components/layout/docs-sidebar';
import PublicChrome from '@/components/layout/public-chrome';
import { useAuthUser } from '@/lib/auth-client';
import { headerStickyOffsetPx } from '@/lib/navigation';
import {
  buildDocsPath,
  docsBlockAnchorId,
  findBlockIndexBySlug,
  parseDocsHash,
  scrollToDocAnchor,
  slugifyDocHeading,
} from '@/lib/docs-anchors';
import {
  CONZEX_CONTACT_EMAIL,
  CONZEX_WEB_URL,
  CONZEX_CLOUD_PRODUCTION_URL,
  PRODUCT_NAME,
  UIDRAC_AGENT_NAME,
  UIDRAC_AGENT_BUNDLE_PREFIX,
} from '@idrac/shared';
import { filterDocSections, type DocsAudience } from '@/lib/docs-audience';

const AGENT = UIDRAC_AGENT_NAME;
const BUNDLE = UIDRAC_AGENT_BUNDLE_PREFIX;

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

const sections: Array<{
  id: string;
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  audience?: DocsAudience;
  content: { heading: string; body: string }[];
}> = [
  {
    id: 'getting-started', icon: BookOpen, title: 'Getting Started', subtitle: 'How to use this product',
    content: [
      {
        heading: 'Product overview',
        body: `${PRODUCT_NAME} is enterprise software from **Conzex Global Private Limited**. It gives your team one secure web console for Dell PowerEdge servers with **iDRAC 6 through 9**, without Java plugins or legacy browser requirements on operator workstations.\n\n${PRODUCT_NAME} is a **fully cloud-hosted** Conzex service. Use this guide after Conzex has provisioned your tenant—it describes **day-to-day operation**, not infrastructure installation.`,
      },
      {
        heading: 'Before you begin',
        body: `Confirm the following with your Conzex onboarding contact:\n\n- You have a valid sign-in and know your **organization name**\n- Your workstation can reach the **Conzex-provided URL** over HTTPS (modern Chrome, Edge, or Firefox recommended)\n- The **${AGENT}** for your site shows **Connected** under **Settings** before you add servers on that LAN\n\niDRAC management traffic is initiated from Conzex cloud (via your site ${AGENT}) to each iDRAC management address—typically HTTPS on port 443.`,
      },
      {
        heading: 'Sign in and navigation',
        body: `1. Open the URL supplied by Conzex and select **Sign in**.\n2. Enter your email and password. After 15 minutes of inactivity you will be prompted to stay signed in or log out again.\n3. Use the top bar and application menu:\n   - **Dashboard** — fleet summary and server cards\n   - **Docs** — this product guide (also in the top bar when signed in)\n   - **Servers** — inventory and server tasks\n4. Open any server card to reach that system's **detail dashboard** (health, power, console, storage, BIOS, maintenance, and iDRAC settings).\n\nFirst-time organization setup is performed by Conzex during onboarding.`,
      },
      {
        heading: 'Recommended workflows',
        body: `**Onboard a server**\n1. Dashboard → **Add Server** → enter iDRAC IP and credentials → **Probe Server**.\n2. Confirm detected generation and health, name the system, and choose **Save Encrypted** for recurring access unless policy requires session-only credentials.\n\n**Daily operations**\n- Monitor fleet health from the dashboard; investigate amber or red indicators on the server detail page.\n- Use **Virtual Console** for break-glass access (HTML5 on iDRAC 8/9; bridged viewer on 6/7).\n\n**Change control**\n- BIOS and boot-order changes may require a host reboot—coordinate with change windows.\n- Power actions (reset, power off) are recorded for your organization's compliance needs.`,
      },
      {
        heading: 'How Conzex cloud works',
        body: `The web application and API run on **Conzex-managed cloud infrastructure**. Your operators sign in over HTTPS; no application servers are installed in your data center.\n\nBecause iDRAC addresses live on your **private LAN**, each tenant runs a lightweight **${AGENT}** on a host inside your network. The agent registers to your organization over a secure WebSocket and carries iDRAC probe and management traffic on your behalf.\n\nInstall and verify the agent under **Settings → ${AGENT}** before adding servers at that site. Full steps for **Windows, Linux, and macOS** are in the **${AGENT}** section of this guide.\n\nDo not share iDRAC credentials outside approved credential-storage modes. Contact Conzex if agent status is disconnected or probes fail consistently.`,
      },
      {
        heading: 'Support, releases, and trust',
        body: `For licensing, outages, or escalation, contact Conzex:\n\n- [Contact page](/contact)\n- [${CONZEX_WEB_URL.replace('https://', '')}](${CONZEX_WEB_URL})\n- ${CONZEX_CONTACT_EMAIL}\n\nWhen opening a ticket, include your **organization name**, **product version** (footer or [version manager](/versions)), and whether the **${AGENT}** shows **Connected**.\n\nSecurity highlights: argon2id passwords, AES-256-GCM for stored iDRAC credentials, tenant isolation, and encrypted sessions managed by Conzex cloud.`,
      },
    ],
  },
  {
    id: 'uidrac-agent',
    icon: Radio,
    title: AGENT,
    subtitle: 'LAN connector for Conzex cloud — Windows, Linux, and macOS',
    content: [
      {
        heading: `When the ${AGENT} is required`,
        body: `${PRODUCT_NAME} is hosted by Conzex in the cloud—the central platform **cannot** reach private iDRAC HTTPS on your LAN without a connector.\n\nEvery **tenant** receives one ${AGENT} identity. Run the agent on a host that can reach **every iDRAC IP** you manage at that site (typically TCP **443** to the iDRAC management interface).`,
      },
      {
        heading: 'Download your configuration (all platforms)',
        body: `1. Sign in and open [**Settings**](/settings).\n2. Review the **${AGENT}** status banner (Connected / Disconnected).\n3. Choose **Agent download** and select your OS:\n   - **Linux** → \`${BUNDLE}-linux.json\`\n   - **macOS** → \`${BUNDLE}-darwin.json\`\n   - **Windows** → \`${BUNDLE}-win.json\`\n\nEach file is a **tenant-bound JSON bundle** (unique \`agentId\` and \`agentSecret\`). Treat it like a password—store only on the agent host. Contact Conzex if you need credential rotation after a leak.`,
      },
      {
        heading: 'Configuration file contents',
        body: 'Every bundle uses schema `idrac-edge-agent/v1` and includes:\n\n- `agentId` / `uniqueAgentId` — public agent identifier for your tenant\n- `agentSecret` — shared secret used for WebSocket authentication\n- `cloudUrl` — your Conzex console URL (HTTPS)\n- `wsUrl` — secure WebSocket endpoint (typically `wss://…/api/agent/ws`)\n- `enrollmentToken` / `enrollmentSignature` — additional enrollment validation\n- `platform` — `linux`, `darwin`, or `win`\n\nYou can run the agent either with **`IDRAC_AGENT_CONFIG=/path/to/bundle.json`** or with the explicit environment variables listed in the bundle under `run.env`.',
      },
      {
        heading: 'Linux',
        body: `**Requirements:** Node.js **20+**, outbound **HTTPS/WSS** to your Conzex URL, LAN access to iDRAC.\n\n**Option A — install helper (recommended)**\n\n\`\`\`bash\nexport CLOUD_URL="https://your-console.example.com"\ncurl -fsSL "$CLOUD_URL/api/agent/install.sh" | bash -s -- --config ${BUNDLE}-linux.json\n\`\`\`\n\n**Option B — manual run**\n\n\`\`\`bash\nexport UIDRAC_AGENT_CONFIG=/secure/path/${BUNDLE}-linux.json\nnpx @idrac/edge-agent\n\`\`\`\n\n(\`IDRAC_AGENT_CONFIG\` is still accepted for compatibility.)\n\nRun under **systemd**, **supervisor**, or your standard service manager so the agent restarts after reboot. Confirm **Connected** in **Settings** before adding servers.`,
      },
      {
        heading: 'macOS',
        body: `**Requirements:** Node.js **20+** (Homebrew or installer), outbound **HTTPS/WSS**, LAN access to iDRAC.\n\n\`\`\`bash\nexport UIDRAC_AGENT_CONFIG="$HOME/secure/${BUNDLE}-darwin.json"\nnpx @idrac/edge-agent\n\`\`\`\n\nYou may use the same \`install.sh\` helper as Linux (bash + curl) with your downloaded \`${BUNDLE}-darwin.json\`. For production sites, register the process with **launchd** so it survives logout and reboot.\n\nVerify the status banner shows **Connected** and the reported agent version matches your deployment.`,
      },
      {
        heading: 'Windows',
        body: `**Requirements:** Node.js **20+** LTS, outbound **HTTPS/WSS** through corporate proxy if applicable, LAN access to iDRAC.\n\n1. Save your downloaded \`${BUNDLE}-win.json\` to a protected folder (e.g. \`C:\\ProgramData\\Conzex\\uidrac-agent\\\`).\n2. Set environment variables from the bundle (System or service account):\n   - \`UIDRAC_AGENT_CONFIG\` → full path to the JSON file, **or**\n   - \`UIDRAC_AGENT_ID\`, \`UIDRAC_AGENT_SECRET\`, \`UIDRAC_CLOUD_URL\`, \`UIDRAC_AGENT_WS_URL\` (legacy \`IDRAC_*\` names also work)\n3. Start the agent:\n\n\`\`\`powershell\nnpx @idrac/edge-agent\n\`\`\`\n\nRegister as a **Windows Service** (NSSM, WinSW, or your IT standard) under a dedicated service account. After reboot, confirm **Connected** in **Settings**.`,
      },
      {
        heading: 'Verify, probe, and troubleshoot',
        body: `**Success criteria**\n- **Settings → ${AGENT}** shows **Connected** with a recent timestamp.\n- **Dashboard → Add Server → Probe Server** succeeds for an iDRAC on the same LAN as the agent.\n\n**Common issues**\n- **Disconnected** — wrong secret, firewall blocking WSS, or agent process stopped. Re-download the bundle after credential rotation.\n- **Probe fails** — agent host cannot reach iDRAC:443; check routing, ACLs, and iDRAC enablement.\n- **Wrong tenant** — each bundle works for **one organization only**; do not reuse another customer's file.\n\nInclude agent status and version in support requests to Conzex ([contact page](/contact)).`,
      },
      {
        heading: 'Rotate credentials',
        body: `Conzex can **rotate credentials** for your **${AGENT}** from **Settings** when a bundle may have been exposed. This invalidates the current secret immediately.\n\nAfter rotation:\n1. Download a fresh bundle for each OS still in use.\n2. Update the agent host configuration and restart the service.\n3. Confirm **Connected** before decommissioning old configs.\n\nPlan rotation during a maintenance window—existing connections drop when the secret changes.`,
      },
      {
        heading: 'Platform settings (Conzex operations)',
        body: 'Conzex operates the cloud platform with server-side settings (not configurable in this guide):\n\n- Secure WebSocket enrollment for each tenant agent\n- Public HTTPS/WSS endpoints embedded in your download bundle\n- Encrypted agent secrets at rest\n\nIf you operate multiple sites, install one agent host per site (or as directed by Conzex onboarding) so every iDRAC remains reachable from the agent network.',
      },
    ],
  },
  {
    id: 'architecture', icon: Globe, title: 'Platform overview', subtitle: 'How the service works (high level)',
    content: [
      { heading: 'System Overview', body: `${PRODUCT_NAME} uses a **multi-strategy adapter pattern** to communicate with different iDRAC generations:\n\n- **Redfish Adapter** (iDRAC 8/9) -- REST API over HTTPS using Dell\'s Redfish implementation\n- **Legacy Java Adapter** (iDRAC 7) -- XML-based \`/data?get=\` endpoints with cookie-based sessions\n- **Legacy CGI Adapter** (iDRAC 6) -- HTML form-based \`/cgi-bin/webcgi/\` endpoints\n\nThe adapter factory automatically selects the right adapter based on generation detection.` },
      { heading: 'Tech Stack', body: 'The service is built on audited, industry-standard components: NestJS API, Next.js operator interface, PostgreSQL for configuration and inventory, and Redis for session control. iDRAC communication uses Dell-supported Redfish and legacy adapter paths selected automatically per generation.' },
      { heading: 'Runtime components', body: `Your Conzex cloud subscription includes:\n\n- **Web application** — operator UI you sign in to\n- **API** — authentication, authorization, and iDRAC orchestration\n- **Console gateway** — secure remote console for legacy iDRAC 6/7\n- **Database and cache** — tenant data and session state (Conzex-operated)\n- **${AGENT}** — lightweight connector you run on your LAN\n\nTLS certificates, availability, and backups for the cloud service are defined in your Conzex agreement.` },
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
      { heading: 'Console Types', body: `**HTML5 Console (iDRAC 8/9):**\nModern iDRAC controllers include a built-in HTML5 console. The console page opens the native iDRAC console in a new browser window with no plugins required.\n\n**noVNC Bridge (iDRAC 6/7):**\nLegacy iDRAC controllers require Java-based viewers. ${PRODUCT_NAME} runs the Java viewer inside a Docker container and streams the video via WebSocket using noVNC, eliminating client-side Java dependencies.` },
      { heading: 'Console Features', body: '- **Fullscreen Mode** -- Expand the console to fill the entire screen\n- **Reconnect** -- Quickly re-establish a dropped connection\n- **Send Keys** -- Send special key combinations (Ctrl+Alt+Del, etc.)\n- **Connection Info** -- Hover the info icon to view server name, IP, generation, and console type\n- **New Window** -- Open the console in a separate browser window' },
    ],
  },
  {
    id: 'security-audit', icon: FileText, title: 'Security & trust', subtitle: 'Sign-in, sessions, and data protection on Conzex cloud',
    content: [
      { heading: 'Authentication', body: '**Login flow:**\n1. You sign in with email and password over HTTPS.\n2. Conzex issues a short-lived access token and a refresh token stored in a secure cookie.\n3. Your session stays active while you use the product; after **15 minutes** of inactivity a reminder appears before sign-out.\n\nUse a strong password and sign out on shared workstations.' },
      { heading: 'Data protection', body: 'Passwords are stored with **argon2id**. Saved iDRAC credentials use **AES-256-GCM** encryption. Each customer organization is isolated in Conzex cloud; iDRAC traffic from your sites uses your **UiDRAC agent** on your LAN only.' },
      { heading: 'Activity history', body: 'Sign-in events and significant server operations are retained for your organization’s operational and compliance needs. Contact Conzex if you need export or retention details for your contract.' },
    ],
  },
  {
    id: 'product-versions',
    icon: Tags,
    title: 'Product Versions',
    subtitle: 'Release lines, semver, and version manager',
    content: [
      {
        heading: 'Version manager',
        body: `${PRODUCT_NAME} uses **semantic versioning** (major.minor.patch). Each release documents **core implementation** highlights—platform features shipped in that build.\n\n- **Major** — platform milestones\n- **Minor** — new capabilities (${AGENT}, fleet features, console improvements)\n- **Patch** — maintenance and fixes (patch builds update the running version but are not listed on the public version manager)\n\nOpen the [version manager](/versions) for major and minor milestones.`,
      },
      {
        heading: 'Current release line (1.2.x)',
        body: `The 1.2 line adds cloud **${AGENT}** registration, tenant-isolated LAN probing, and Conzex-branded product surfaces. Patch releases under 1.2.x continue stability and UI improvements.\n\nYour footer and API health endpoints report the running build (for example \`GET /api/health\`).`,
      },
    ],
  },
  {
    id: 'admin-operations',
    audience: 'admin-internal',
    icon: Shield,
    title: 'Administrator guide',
    subtitle: 'Conzex cloud — administrators only (signed in)',
    content: [
      {
        heading: 'Admin panel',
        body: `Users with the **Admin** role (or higher) see **Admin** in the application menu. The panel covers organization users, sessions, and— for Conzex platform operators— cross-tenant inventory.\n\nPublic and external users without an Admin role do not see this menu or this documentation section.`,
      },
      {
        heading: 'Password reset',
        body: `When an administrator resets a user password, the system emails a **temporary password** only to the **email address stored on that user account**. Reset details are not shown in the browser and cannot be sent to any other address.\n\nConfigure **SMTP_** variables on the Conzex cloud API so delivery works in production (${CONZEX_CLOUD_PRODUCTION_URL}).`,
      },
      {
        heading: 'Primary platform account',
        body: 'The seeded **primary platform administrator** (`admin` on the system organization) **cannot be deleted**. Protect this account and change its password after first login.',
      },
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
  const linkParts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return linkParts.map((segment, linkIdx) => {
    const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const internal = href.startsWith('/');
      if (internal) {
        return (
          <Link key={`link-${linkIdx}`} href={href} className="text-dell-blue font-semibold hover:underline">
            {label}
          </Link>
        );
      }
      return (
        <a key={`link-${linkIdx}`} href={href} target="_blank" rel="noopener noreferrer" className="text-dell-blue font-semibold hover:underline">
          {label}
        </a>
      );
    }

    const parts = segment.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return <InlineCode key={`${linkIdx}-${i}`} text={code} />;
      }
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return (
            <strong key={`${linkIdx}-${i}-${j}`} className="text-text-primary">
              {bp.slice(2, -2)}
            </strong>
          );
        }
        return <span key={`${linkIdx}-${i}-${j}`}>{bp}</span>;
      });
    });
  });
}

export default function DocsPage() {
  const { loggedIn, ready, user } = useAuthUser();
  const visibleSections = useMemo(
    () => filterDocSections(sections, { loggedIn, role: user?.role }),
    [loggedIn, user?.role],
  );
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set(sections[0].content.map((_, i) => i)));
  const [sectionLinkCopied, setSectionLinkCopied] = useState(false);
  const hashReady = useRef(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  const section = visibleSections.find((s) => s.id === activeSection) || visibleSections[0] || sections[0];
  const stickyTopPx = headerStickyOffsetPx(loggedIn);

  const filteredSections = search
    ? visibleSections.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.content.some((c) => c.heading.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase())))
    : visibleSections;

  useEffect(() => {
    if (!visibleSections.some((s) => s.id === activeSection)) {
      const fallback = visibleSections[0]?.id ?? 'getting-started';
      setActiveSection(fallback);
    }
  }, [visibleSections, activeSection]);

  const navigateToSection = useCallback(
    (sectionId: string, blockSlug?: string, updateHash = true) => {
      let targetId = sectionId;
      if (!visibleSections.some((s) => s.id === targetId)) {
        targetId = visibleSections[0]?.id ?? 'getting-started';
      }
      const sec = visibleSections.find((s) => s.id === targetId);
      if (!sec) return;
      setActiveSection(targetId);
      const expanded = new Set(sec.content.map((_, i) => i));
      let blockHeading: string | undefined;
      if (blockSlug) {
        const idx = findBlockIndexBySlug(sec, blockSlug);
        if (idx !== null) {
          expanded.clear();
          expanded.add(idx);
          blockHeading = sec.content[idx]?.heading;
        }
      }
      setExpandedCards(expanded);
      if (updateHash) {
        window.history.replaceState(null, '', buildDocsPath(targetId, blockSlug));
      }
      requestAnimationFrame(() => {
        const root = mainScrollRef.current;
        if (blockHeading) {
          scrollToDocAnchor(docsBlockAnchorId(targetId, blockHeading), stickyTopPx, root);
        } else {
          if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
          else scrollToDocAnchor(`docs-section-${targetId}`, stickyTopPx);
        }
      });
    },
    [stickyTopPx, visibleSections],
  );

  useEffect(() => {
    if (!ready) return;
    const applyHash = () => {
      const { sectionId, blockSlug } = parseDocsHash(window.location.hash, sections);
      navigateToSection(sectionId, blockSlug, false);
    };
    applyHash();
    hashReady.current = true;
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [ready, navigateToSection]);

  const handleSectionChange = (id: string) => {
    navigateToSection(id);
  };

  const copySectionLink = () => {
    const url = `${window.location.origin}${buildDocsPath(activeSection)}`;
    navigator.clipboard.writeText(url).then(() => {
      setSectionLinkCopied(true);
      setTimeout(() => setSectionLinkCopied(false), 2000);
    });
  };

  const toggleCard = (index: number) => {
    const next = new Set(expandedCards);
    next.has(index) ? next.delete(index) : next.add(index);
    setExpandedCards(next);
    const block = section.content[index];
    if (block && hashReady.current) {
      const slug = slugifyDocHeading(block.heading);
      window.history.replaceState(null, '', buildDocsPath(activeSection, slug));
    }
  };

  if (!ready) {
    return <AppPreloader />;
  }

  const docsPanel = (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0 bg-white border border-border-card rounded overflow-hidden">
        <DocsSidebar
          sections={visibleSections}
          filteredSections={filteredSections}
          activeSection={activeSection}
          search={search}
          onSearchChange={setSearch}
          onSectionChange={handleSectionChange}
          headerOffsetPx={stickyTopPx}
          docked
        />

        <main
          ref={mainScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-bg-body"
          aria-label="Documentation content"
        >
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div id={`docs-section-${activeSection}`} className="flex items-start gap-3 mb-2">
              <section.icon className="w-8 h-8 text-dell-blue shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{section.title}</h1>
                  <button
                    type="button"
                    onClick={copySectionLink}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-dell-blue border border-border-card rounded hover:bg-row-hover"
                    title={buildDocsPath(activeSection)}
                  >
                    {sectionLinkCopied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                    Copy link
                  </button>
                </div>
                <p className="text-sm text-text-secondary">{section.subtitle}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {section.content.map((block, i) => {
                const isExpanded = expandedCards.has(i);
                const blockSlug = slugifyDocHeading(block.heading);
                const anchorId = docsBlockAnchorId(activeSection, block.heading);
                return (
                  <div
                    key={i}
                    id={anchorId}
                    className="bg-white border border-border-card rounded overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCard(i)}
                      className="w-full bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between hover:bg-gray-100 transition-colors gap-2"
                    >
                      <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary text-left flex items-center gap-2 min-w-0">
                        <a
                          href={buildDocsPath(activeSection, blockSlug)}
                          className="text-dell-blue/70 hover:text-dell-blue shrink-0 font-mono normal-case text-xs"
                          title="Copy/share link to this topic"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            navigateToSection(activeSection, blockSlug);
                          }}
                        >
                          #
                        </a>
                        <span className="truncate">{block.heading}</span>
                      </h2>
                      <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
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
              {visibleSections.findIndex((s) => s.id === activeSection) > 0 ? (
                <button onClick={() => handleSectionChange(visibleSections[visibleSections.findIndex((s) => s.id === activeSection) - 1].id)} className="px-4 py-2 bg-white border border-border-card text-sm font-semibold text-dell-blue rounded hover:bg-row-hover transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 rotate-180" /> {visibleSections[visibleSections.findIndex((s) => s.id === activeSection) - 1].title}
                </button>
              ) : <div />}
              {visibleSections.findIndex((s) => s.id === activeSection) < visibleSections.length - 1 ? (
                <button onClick={() => handleSectionChange(visibleSections[visibleSections.findIndex((s) => s.id === activeSection) + 1].id)} className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5">
                  {visibleSections[visibleSections.findIndex((s) => s.id === activeSection) + 1].title} <ChevronRight className="w-4 h-4" />
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
        <AppShell lockViewport>{docsPanel}</AppShell>
      </AuthGate>
    );
  }

  return (
    <PublicChrome lockViewport mainClassName="py-4 sm:py-6">
      {docsPanel}
    </PublicChrome>
  );
}
