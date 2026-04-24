# Contraction Timer & Provider Report

[![License: MIT](https://img.shields.io/badge/License-MIT-48c6b0.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-yes-f2b84b)](https://github.com/murdawkmedia/contraction-timing)
[![Live App](https://img.shields.io/badge/Live%20App-GitHub%20Pages-48c6b0)](https://murdawkmedia.github.io/contraction-timing)

Live app: [murdawkmedia.github.io/contraction-timing](https://murdawkmedia.github.io/contraction-timing)

A privacy-first, dependency-free labor tracking app for timing contractions and preparing provider-ready summaries for midwives, doulas, doctors, and support people. It runs as a single static HTML file and stores data only in the user's browser.

## Features

- Large one-tap START/STOP contraction timer.
- Active timer recovery after refresh.
- Contraction history with edit, delete, undo, and manual entry.
- Optional post-contraction intensity and note capture.
- Provider dashboard with duration, interval, last-hour, trend, regularity, and intensity statistics.
- Customizable timing guideline, defaulting to 5 minutes apart, 60 seconds long, across 60 minutes.
- Labor event timeline for water breaking, provider calls, hospital/birth-center travel, cervical checks, medication, position changes, and other notes.
- No-library trend chart for recent contraction interval, duration, and intensity.
- Copyable provider summary, CSV download, and print/save-as-PDF report.
- Notes autosaved to local browser storage.
- 4-box breathing modal.

## Privacy

All contractions, events, notes, and settings are stored locally in `localStorage`. The app has no accounts, no server, no analytics, and no remote data storage.

## Data Model

Existing saved contractions shaped like `{ start, duration, end }` are migrated lazily in the browser.

Current local storage keys:

- `contractions`: array of `{ id, start, end, duration, intensity, note, createdAt, updatedAt }`
- `laborEvents`: array of `{ id, type, time, note, createdAt, updatedAt }`
- `laborSettings`: `{ intervalMinutes, durationSeconds, windowMinutes }`
- `contractionNotes`: freeform notes
- `activeContractionStart`: active timer recovery timestamp

## Development

No build tools or package install are required.

1. Edit `index.html`.
2. Open `index.html` directly in a browser.
3. Test timing, editing, event entry, CSV export, and print/save-as-PDF.

## Medical Note

This app is a timing and reporting aid, not medical advice. Users should follow their care team's instructions and seek urgent care for concerning symptoms such as heavy bleeding, decreased fetal movement, severe constant pain, preterm labor signs, or when directed after water breaking.

## License

MIT License. Created by [Murdawk Media](https://www.murdawkmedia.com).
