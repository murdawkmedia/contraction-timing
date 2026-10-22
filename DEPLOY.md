# Cloudflare Pages deployment

Live app: [contraction-timing.pages.dev](https://contraction-timing.pages.dev/).

The Nostr repository is the source of truth. GitHub is a distribution mirror;
Actions remain disabled. Hosting is a separate reviewed release step.

The tracked `.ngit/act/workflows/pages.yml` runs synthetic, offline checks and
assembles exactly the six served files. It uses Node 24 and no package install.
Run `node .ngit/check-site.mjs` in a fresh checkout to perform the same checks.
Nostr CI runs are maintainer-directed; publishing a commit does not itself
deploy the site. Verify the signed result for the exact commit and workflow,
retain every artifact hash, and release those same bytes only when live differs.
No production credentials belong in a CI job.

1. Check out the reviewed Nostr `main` commit and confirm a clean worktree.
2. Review the public payload and preserve existing application behavior and data.
3. Copy only `index.html`, `apple-touch-icon.png`, `favicon.ico`, `og-image.jpg`,
   `robots.txt`, and `sitemap.xml` to an empty deployment directory.
4. With Wrangler authenticated to the project owner's Cloudflare account, run:

   ```sh
   wrangler pages deploy ./site --project-name contraction-timing --branch main --commit-hash "$(git rev-parse HEAD)" --commit-dirty=false
   ```

5. Confirm the production deployment records that exact commit, compare every
   served asset to the approved files, and test start/stop, reload recovery,
   reports, and mobile layout on the actual URL using synthetic records only.

No build or GitHub integration is needed. Do not upload the repository root.
There is no server-side storage. Browser records stay at their original origin;
changing hosting does not transfer them. Keep the previous source and verified
release bundle so a reviewed earlier version can be redeployed if necessary.
