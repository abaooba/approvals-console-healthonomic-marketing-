# Approvals Console

Internal dashboard for reviewing AI-drafted marketing content held in an
Airtable **Approvals Queue**. Reviewers see channel-accurate previews
(Instagram, Facebook, GBP, Blog, Newsletter/Email), the linked campaign brief,
and can **Approve** or **Send back for revision** — decisions are written back
to Airtable through Netlify Functions so the Airtable token never reaches the
browser.

- **Frontend:** Vite + React 18, plain CSS (design ported from
  `design/mockup.html`)
- **API:** Netlify Functions (TypeScript) proxying the Airtable API
- **Access control:** Netlify's site-wide password protection (enabled in the
  Netlify dashboard), which fronts every route on the site — including
  `/api/*` — so the functions carry no auth logic of their own

## Local development

Prerequisites: Node 18+ and the
[Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`npm i -g netlify-cli`).

```sh
npm install
cp .env.example .env  # then fill in AIRTABLE_PAT
netlify dev           # serves the app + functions at http://localhost:8888
```

`netlify dev` loads `.env` into the functions and proxies `/api/*` to
`/.netlify/functions/*`. There is no password prompt locally — password
protection is applied by Netlify's edge on the deployed site only.

`npm run build` type-checks the app and the functions, then builds the client
bundle.

## Environment variables

Set these in **Site settings → Environment variables** on Netlify (and in
`.env` for local dev). They are read only by the functions — never exposed to
the client.

| Variable | Value |
| --- | --- |
| `AIRTABLE_PAT` | Airtable personal access token (see scopes below) |
| `AIRTABLE_BASE_ID` | `appRKzeGVIpFGTiEu` |
| `AIRTABLE_QUEUE_TABLE` | `tbl0D84S0Er1m5UEg` (Approvals Queue) |
| `AIRTABLE_CAMPAIGN_TABLE` | `tblWe66mvAOvw5MTN` (Campaign Tracker) |
| `DEFAULT_ENTITY` | `Healthonomic` |

The entity is never hardcoded — point this console at a different entity's
queue by changing `DEFAULT_ENTITY` only.

## Airtable PAT scopes

Create the token at <https://airtable.com/create/tokens> with:

- **Scopes:** `data.records:read`, `data.records:write`
- **Access:** only the base above (base-scoped — do not grant all bases)

## Netlify setup

1. Create the site from this repo — `netlify.toml` provides the build command,
   publish directory, functions directory, and the `/api/*` redirect.
2. Turn on **password protection** (Site configuration → Access & security)
   and share the password with the reviewers.
3. Add the environment variables above.

## Reviewer attribution

The header's "Reviewing as …" field is an editable name, remembered in the
browser (localStorage). It is written to the `Reviewed By` field with every
decision, so reviewers should fill it in before approving.

Approving writes `Status: Approved` (plus `Reviewed By` and any notes);
sending back writes `Status: Needs Revision` with the required
`Reviewer Notes`. Downstream automation (Airtable → n8n → publishers) picks it
up from there.
