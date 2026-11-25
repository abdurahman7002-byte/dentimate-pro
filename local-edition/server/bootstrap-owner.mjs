/* =========================================================
   DENTIX LOCAL - ONE-TIME first-owner bootstrap helper.
   Run interactively on the clinic machine after first boot:
     docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
       -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
       --env-file .env.dentix exec -it provision node bootstrap-owner.mjs
   Talks ONLY to the provision service inside the local network
   (http://127.0.0.1:9091/bootstrap-owner, never proxied by nginx).
   The password is typed with echo OFF: it is not shown, not logged,
   not stored, and not in any command line or shell history.
   Works exactly once: after any owner exists the endpoint refuses.
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

const email = (await ask('Owner email: ')).trim();
const password = await ask('Owner password (min 8 chars, hidden): ', true);
const password2 = await ask('Repeat password: ', true);
if (password !== password2) { console.error('Passwords do not match - nothing sent.'); process.exit(1); }

const res = await fetch('http://127.0.0.1:9091/bootstrap-owner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
const body = await res.json().catch(() => ({}));
if (res.ok) {
    console.log('First owner created for', body.email);
    console.log('Next: sign in at https://<this-machine>/ and add your clinic data.');
} else {
    console.error('Bootstrap refused/failed:', body.error || res.status);
    process.exit(1);
}
