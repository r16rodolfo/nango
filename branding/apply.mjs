// Applies the R16 Sync branding on top of the upstream Nango dashboard (packages/webapp) and the
// "Secured by" footer of Connect UI (packages/connect-ui).
// Runs during the Docker build, after the sources are copied and before any build step (see Dockerfile).
// No dependencies. Safe to run more than once.
//
// Scope, on purpose:
//   - Connect UI: the "Secured by" footer logo and link, and the default primary colour the product
//     ships with. Per-environment theme customisation stays gated by Nango's own plan checks
//     (Enterprise feature), which are never patched here.
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
const BRAND_URL = 'https://r16.com.br';
const BRAND_COLOR = '#FF6600';

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

// Dashboard label of the Connect UI footer toggle.
patch(join(webapp, 'src/pages/Environment/Settings/ConnectUISettings/index.tsx'), [
    ['Show &quot;Secured by Nango&quot;', `Show &quot;Secured by ${BRAND}&quot;`]
]);

// ---- 4. Connect UI "Secured by" footer: R16 Sync colour logo and link ----
const connectUi = join(repo, 'packages', 'connect-ui');
copyFileSync(join(dist, 'connect-ui-src', 'logo.svg'), join(connectUi, 'src', 'svg', 'logo.svg'));
patch(join(connectUi, 'src', 'components', 'Layout.tsx'), [
    ['https://www.nango.dev?utm_source=connectui', BRAND_URL],
    // The logo's dark parts use currentColor: give them the theme's primary text colour.
    ['className="h-4 w-auto inline-block ml-2"', 'className="h-4 w-auto inline-block ml-2 text-text-primary"']
]);
console.log('[branding] replaced Connect UI footer logo and link');

// ---- 5. Connect UI default primary colour ----
// Changes the colour the product ships with. Per-environment theme customisation stays an
// Enterprise feature: canCustomizeConnectUITheme() is not touched, so saved custom colours are
// still ignored and every environment uses this default.
patch(join(repo, 'packages', 'shared', 'lib', 'services', 'connect-ui-settings.service.ts'), [
    [/primary: '#00B2E3'/gi, `primary: '${BRAND_COLOR}'`]
]);
patch(join(connectUi, 'src', 'index.css'), [['--color-brand-500: #00b2e3;', `--color-brand-500: ${BRAND_COLOR.toLowerCase()};`]]);
console.log(`[branding] Connect UI default primary colour set to ${BRAND_COLOR}`);

console.log(`[branding] done${warnings ? ` with ${warnings} warning(s)` : ''}`);
