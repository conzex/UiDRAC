/**
 * seed.ts — Database seed script (production).
 * This script is intentionally empty. The application starts with a clean
 * database. Users register via the /register page, creating their own
 * tenant and admin account. Servers are added via the UI by connecting
 * to real iDRAC endpoints.
 *
 * To run: pnpm db:seed (no-op in production)
 */

async function main() {
  console.log('ℹ️  No seed data to insert. The application starts clean.');
  console.log('   Register at /register to create your first account.');
}

main();
