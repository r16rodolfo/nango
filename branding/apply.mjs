// Applies the R16 Sync branding on top of the upstream Nango dashboard (packages/webapp).
// Runs during the Docker build, right before the frontend is built (see Dockerfile).
// No dependencies. Safe to run more than once.
//
// Scope, on purpose:
//   - Dashboard only. Connect UI (packages/connect-ui) is NOT touched: custom auth branding is an
//     Enterprise feature of Nango and the free self-hosted edition must keep it as is.
//   - LICENSE and copyright notices are never touched (Elastic License 2.0).
//   - Technical names stay "Nango" (Nango API, Nango CLI, SDK, Nango Connect...), because they name
//     the real product and APIs.
//
// A phrase that is not found only prints a warning, so an upstream text change never breaks a deploy.

import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAND = 'R16 Sync';
const DESCRIPTION = 'R16 Sync - integration hub for R16 products.';

const brandingDir = dirname(fileURLToPath(import.meta.url));
const repo = join(brandingDir, '..');
const webapp = join(repo, 'packages', 'webapp');
const dist = join(brandingDir, 'generated');

let warnings = 0;
const warn = (msg) => {
    warnings++;
    console.warn(`[branding] WARN ${msg}`);
};
const rel = (p) => relative(repo, p).replaceAll('\\', '/');

// ---- 1. Static assets: logos, favicons, PWA icons ----
const publicSrc = join(dist, 'webapp-public');
for (const file of readdirSync(publicSrc)) {
    copyFileSync(join(publicSrc, file), join(webapp, 'public', file));
}
console.log(`[branding] copied ${readdirSync(publicSrc).length} files into packages/webapp/public`);

// ---- 2. Logo component used in the sidebar and on the sign-in/onboarding screens ----
copyFileSync(join(dist, 'webapp-src', 'LogoInverted.tsx'), join(webapp, 'src', 'assets', 'LogoInverted.tsx'));
console.log('[branding] replaced packages/webapp/src/assets/LogoInverted.tsx');

// ---- 3. Text replacements ----
const patch = (file, replacements) => {
    let text = readFileSync(file, 'utf8');
    const before = text;
    for (const [from, to] of replacements) {
        if (from instanceof RegExp) {
            text = text.replace(from, to);
        } else if (text.includes(from)) {
            text = text.replaceAll(from, to);
        } else if (!text.includes(to)) {
            warn(`"${from}" not found in ${rel(file)}`);
        }
    }
    if (text !== before) writeFileSync(file, text);
    return text !== before;
};

// index.html and manifest
patch(join(webapp, 'index.html'), [
    ['<title>Nango</title>', `<title>${BRAND}</title>`],
    ['content="Get OAuth tokens for APIs. Fast & secure."', `content="${DESCRIPTION}"`]
]);

const manifestFile = join(webapp, 'public', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
manifest.short_name = BRAND;
manifest.name = BRAND;
writeFileSync(manifestFile, JSON.stringify(manifest, null, 4) + '\n');

// Visible phrases, each tied to the screen where it shows up.
const phrases = [
    ['src/pages/Account/Signin.tsx', ['Log in to Nango', `Log in to ${BRAND}`]],
    ['src/pages/Account/Signin.tsx', ['access your Nango workspace', `access your ${BRAND} workspace`]],
    ['src/pages/Account/Signup.tsx', ['Sign up to Nango', `Sign up to ${BRAND}`]],
    ['src/pages/Onboarding/HearAboutUs.tsx', ['How did you hear about Nango?', `How did you hear about ${BRAND}?`]],
    ['src/pages/Onboarding/HearAboutUs.tsx', ['My team is already using Nango', `My team is already using ${BRAND}`]],
    ['src/pages/Onboarding/AccountDiscovery.tsx', ['Your team is already on Nango!', `Your team is already on ${BRAND}!`]],
    ['src/pages/Onboarding/AccountDiscovery.tsx', ['explore Nango on your temporary account', `explore ${BRAND} on your temporary account`]],
    ['src/pages/Homepage/Show.tsx', ['recent activity on Nango.', `recent activity on ${BRAND}.`]],
    ['src/pages/Integrations/Show.tsx', ['set up yet with Nango.', `set up yet with ${BRAND}.`]]
];
for (const [file, pair] of phrases) {
    patch(join(webapp, file), [pair]);
}

// Browser tab titles: "<title>Something - Nango</title>" and a bare "<title>Nango</title>".
const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : [];
    });
let titleFiles = 0;
for (const file of walk(join(webapp, 'src'))) {
    const changed = patch(file, [
        [/(<title>[^<]*?) - Nango(<\/title>)/g, `$1 - ${BRAND}$2`],
        [/<title>Nango<\/title>/g, `<title>${BRAND}</title>`]
    ]);
    if (changed) titleFiles++;
}
console.log(`[branding] page titles updated in ${titleFiles} files`);

console.log(`[branding] done${warnings ? ` with ${warnings} warning(s)` : ''}`);
