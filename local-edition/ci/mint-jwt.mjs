// Mint HS256 JWTs (anon + service_role) against a runtime-generated JWT_SECRET.
// stdlib only. Usage: node mint-jwt.mjs <secret> <role>
import crypto from 'node:crypto';
const [secret, role] = process.argv.slice(2);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const payload = { iss: 'supabase-demo', iat: now, exp: now + 3600 * 24 * 365 * 10, role };
const unsigned = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
console.log(`${unsigned}.${sig}`);
