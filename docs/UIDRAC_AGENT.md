# UiDRAC agent (Conzex cloud)

Universal iDRAC Console is **fully cloud-hosted** by Conzex. iDRAC management addresses sit on your LAN, so each organisation runs a **UiDRAC agent** on Windows, Linux, or macOS inside that network.

## Operator flow (in the product)

1. Open **Agents** and register or select your site connector.
2. Download the **tenant credential bundle** from the portal (never share it publicly).
3. Download the **installer for your OS** from the same page (public CDN links are shown in the UI).
4. Complete install using the on-screen steps or **Manual / Terminal** commands on **Agents**.
5. Confirm status **Connected** before **Add Server → Probe**.
6. Use **Agents → Manage** to view activity when troubleshooting.

## Virtual console (cloud)

Your browser cannot open private iDRAC IPs directly. For iDRAC 8/9, the HTML5 console runs **inside the portal** and traffic is carried securely via your site agent. Legacy iDRAC 6/7 use the hosted noVNC path (no Java on operator PCs).

## Troubleshooting (operators)

| Issue | What to check |
|-------|----------------|
| Disconnected | Firewall allows outbound HTTPS/WSS to Conzex; agent service running; fresh bundle after rotation |
| Probe fails | Agent host can reach iDRAC on HTTPS (usually port 443); correct IP and credentials |
| Wrong organisation | Each bundle belongs to **one tenant** only |

## Engineering / licensed Docker

Conzex engineering and licensed SaaS operators use internal runbooks (`docs/SAAS-DOCKER.md`, `docs/CONZEX_AGENT_PRODUCTION.md`, installer publish notes under `apps/edge-agent/`). Do not paste secrets, signing keys, or customer bundles into tickets or public channels.

## Support

Include organisation name, product version (footer or **Versions**), agent **Connected** status, and whether the site uses Conzex cloud or licensed Docker hosting.
