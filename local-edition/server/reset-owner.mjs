/* =========================================================
   DENTIX LOCAL - FORGOTTEN owner password recovery.
   Run on the clinic machine (host shell access is the authority):
     docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
       -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
       --env-file .env.dentix exec -it provision node reset-owner.mjs
   Talks ONLY to the loopback listener (http://127.0.0.1:9091/owner-reset),
   which sets a NEW password for the existing owner and revokes all sessions.
   This is NOT the in-app self-edit (/account needs the current password);
   this is the recovery path for a forgotten password.
   The password is typed with echo OFF: not shown, not logged, not stored.
   ========================================================= */

// Minimal prompt implementation: works both on a real TTY (raw mode, so
// password typing never echoes) and on piped stdin (line buffered).
const stdin = process.stdin;
let buf = '';
let waiter = null;
const pump = () => {
    if (!waiter) return;
    const i = buf.indexOf('\n');
    if (i < 0) return;
    const line = buf.slice(0, i).replace(/\r$/, '');
    buf = buf.slice(i + 1);
    const w = waiter; waiter = null;
    w(line);
};
stdin.on('data', (c) => {
    c = String(c);
    if (!stdin.isTTY) { buf += c; pump(); return; }
    // TTY raw mode: handle char by char
    for (const ch of c) {
        if (ch === '') { process.stdout.write('\n'); process.exit(1); }
        if (ch === '\r' || ch === '\n') {
            if (waiter) {
                const w = waiter; waiter = null;
                const line = ttyLine; ttyLine = '';
                process.stdout.write('\n');
                w(line);
            }
        } else if (ch === '' || ch === '\b') {
            ttyLine = ttyLine.slice(0, -1);
        } else {
            ttyLine += ch;
            if (waiter && !waiter.hidden) process.stdout.write(ch);
        }
    }
});
let ttyLine = '';
function ask(q, hidden = false) {
    return new Promise((ok) => {
        process.stdout.write(q);
        if (stdin.isTTY) stdin.setRawMode(true);
        ttyLine = '';
        waiter = hidden ? Object.assign((l) => ok(l), { hidden: true }) : Object.assign((l) => ok(l), { hidden: false });
        stdin.resume();
        pump(); // data may have arrived before this waiter attached (piped stdin)
    });
}

const email = (await ask('owner email: ')).trim();
const p1 = await ask('new password: ', true);
const p2 = await ask('new password again: ', true);
if (p1 !== p2) { console.error('passwords do not match - nothing changed'); process.exit(1); }

const r = await fetch(`http://127.0.0.1:${process.env.BOOTSTRAP_PORT || 9091}/owner-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: p1 })
});
const body = await r.json().catch(() => ({}));
if (!r.ok) { console.error('owner reset failed:', body.error || r.status); process.exit(1); }
console.log('owner password updated for', body.email, '- all sessions revoked; log in with the new password.');
