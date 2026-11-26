// Mint a long-lived HS256 JWT for a role. Usage: node mint.mjs <secret> <role>
import crypto from 'node:crypto';
const [secret, role] = process.argv.slice(2);
const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const u = `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ iss: 'dentix-local', iat: now, exp: now + 3600 * 24 * 365 * 10, role })}`;
console.log(`${u}.${crypto.createHmac('sha256', secret).update(u).digest('base64url')}`);
