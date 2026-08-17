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
- **Auth:** Netlify Identity (invite-only); functions reject requests without
  a valid Identity JWT

## Local development

Prerequisites: Node 18+, the [Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`npm i -g netlify-cli`), and a Netlify site with Identity enabled.

```sh
npm install
netlify link          # link to the Netlify site so Identity works locally
cp .env.example .env  # then fill in AIRTABLE_PAT
netlify dev           # serves the app + functions at http://localhost:8888
```

`netlify dev` loads `.env` into the functions, proxies `/api/*` to
`/.netlify/functions/*`, and wires the Identity widget to the linked site.
Sign in with an invited Identity user to see the queue.

`npm run build` type-checks the app and the functions, then builds the client
bundle.



## Airtable PAT scopes

Create the token at <https://airtable.com/create/tokens> with:

- **Scopes:** `data.records:read`, `data.records:write`
- **Access:** only the base above (base-scoped — do not grant all bases)

## Netlify setup

1. Create the site from this repo — `netlify.toml` provides the build command,
   publish directory, functions directory, and the `/api/*` redirect.
2. Enable **Identity**, set registration to **Invite only**, and invite the
   reviewers.
3. Add the environment variables above.

Approving writes `Status: Approved` (plus `Reviewed By` and any notes);
sending back writes `Status: Needs Revision` with the required
`Reviewer Notes`. Downstream automation (Airtable → n8n → publishers) picks it
up from there.
