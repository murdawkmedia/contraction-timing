# Timer deployment and recovery

Primary app: https://www.murdawkmedia.com/contraction-timer/
Recovery app: https://contraction-timing.pages.dev/

Nostr is authoritative. The existing Murdawk Media GitHub repository is a
passive mirror; preserve original branches and keep Actions disabled.

Run `node .ngit/check-site.mjs` to validate JavaScript, metadata, synthetic
start/stop/reload/report/CSV behavior, lossless backup/import, integrity and
cancellation checks, storage rollback and recovery downloads. It exports the
six served files plus `_headers` into `dist/`. Serve only this output for local
checks. Use disposable browser contexts and synthetic records.

In the separate studio website source, run
`node scripts/import-contraction-timer.mjs <reviewed-dist>`.
The importer records hashes and scopes headers to the app path. Run website
checks/build and verify the actual combined deployment, sibling apps, canonical
URL, local assets, active-timer refresh and an actual synthetic export/import.

Publish the accepted static artifact to the existing original Pages project as
well, so its users can export complete backups. That origin keeps its original
bare storage keys; only the new hosted path uses the `contractionTimer.` prefix.
A move does not automatically transfer browser storage. Keep the old app fully
working; do not replace it with a redirect or delete it merely because traffic
analytics is empty. Retain the prior artifact and source recovery bundles.

A full JSON backup contains all five app storage fields, including general
notes and an active timer. Imports require explicit overwrite confirmation and
preserve unrelated app storage. Files are local and unencrypted. No real patient
records, provider messages, medical decisions or external record transfers are
part of deployment acceptance. Existing medical guidance is unchanged.
