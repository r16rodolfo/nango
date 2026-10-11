# R16 Sync branding

This folder turns the upstream Nango dashboard into **R16 Sync**. The upstream code under `packages/` stays untouched in git. The branding is applied during the Docker build, so merging updates from NangoHQ/nango keeps working without conflicts.

## How it works

| Step | When | What |
|---|---|---|
| `scripts/generate.mjs` + `scripts/make-ico.py` | Locally, only when a logo changes | Builds `generated/` from `source/` (derived SVGs, favicons, PWA icons, logo component) |
| `apply.mjs` | Every Docker build, before the frontend build | Copies `generated/` into `packages/webapp` and the Connect UI footer, and replaces the visible "Nango" texts |

The Dockerfile has a single extra line for this: `RUN node branding/apply.mjs`.

## Changing the logo

1. Replace the files in `source/`, keeping the same names.
2. Regenerate:

```bash
npm i --no-save --prefix /tmp/r16raster @resvg/resvg-js@2.6.2
NODE_PATH=/tmp/r16raster/node_modules node branding/scripts/generate.mjs
python branding/scripts/make-ico.py
```

3. Commit `source/` and `generated/` and push to `master`. Railway deploys automatically.

## Changing texts

Edit the `BRAND`, `DESCRIPTION` and `phrases` list at the top of `apply.mjs`. A phrase that is not found prints a `[branding] WARN` line in the build log and does not fail the build. Check the build log after merging upstream updates.

## Out of scope, on purpose

- **Connect UI theme and colours** (`packages/connect-ui`), the screen end users see when connecting an account. Custom auth theming is an Enterprise feature of Nango and its plan checks are never patched. Only the "Secured by" footer is branded: it shows the R16 Sync colour logo and links to r16.com.br. The footer can be turned off per environment in the dashboard: Environment Settings, Connect UI.
- **Technical names** such as Nango API, Nango CLI, the SDKs and "Nango Connect", because they name the actual product and APIs.
- **LICENSE and copyright notices**, which the Elastic License 2.0 requires to be kept. See `MODIFICATIONS.md` at the repository root.
