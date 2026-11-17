# CanCon Desk

**A bilingual research desk for Canadian music programming.** Every day it reads the public Apple Music charts for Canada and joins them with three other kinds of data:
- where each artist is from
- who owns each release
- how each song ranks in four other countries

From that it surfaces the stories an editorial team could program around, then drafts the pitch.

**▶ Live:** https://dhannarula.github.io/cancon-desk/ · English / Français

---

## What it answers

| Question an editor asks | Where |
|---|---|
| How Canadian is the chart today? Who's leading? | **Pulse** (share of Canadian artists, top Canadian song and its ranks abroad, albums, top 10) |
| What exactly is on the chart, and what's behind each song? | **The chart, annotated** (origin and hometown, label and owner, release age, rank in the US/UK/AU/FR, daily movement; filterable and searchable) |
| What is Canada championing that the rest of the world isn't? | **Home & away** (each song's rank in Canada vs. another market) and **Canadian exports** |
| Where is the music coming from? | **Scenes** (a map of charting Canadian artists by hometown) |
| Who releases it: majors or independents? Canadian labels? | **Who releases it** (ownership tiers, parent companies, labels on the chart) |
| How does Canada's taste differ from the US? | **The sound of the chart** (genre share and release-age mix, Canada vs. US) |
| What's coming out that we should prepare for? | **Release radar** (new and upcoming releases from charting Canadian artists and Polaris Music Prize alumni) |
| What should we program next? | **Programming opportunities** → **pitch builder** (editable one-page pitches with evidence, a tracklist and the label partners to loop in; export to text, Markdown or print) |

### Example findings, first snapshot (17 November 2026)
- **11 of the 100** most-played songs in Canada are by Canadian artists, along with **16 of the top 100 albums**. Tate McRae's "Housewife" is #1 in Canada and also top 3 in the US, UK and Australia.
- **Country is 34% of Canada's top 100 vs. 20% in the US.** Hip-hop is the reverse: 10% vs. 43%.
- **28 songs in Canada's top 50** are missing from the US chart or sit 25+ places lower there.
- **Catalogue is 40% of Canada's chart vs. 57% in the US.** Holiday songs (Michael Bublé among them) are already climbing in mid-November.
- **82% of the chart is released by the three major-label groups.** Among Canadian artists it's 91%, and the one independent is Feist on Arts & Crafts.

---

## How it works

```
Apple Music charts ──┐  CA songs + albums, US / UK / AU / FR songs (daily)
                     ▼
               scripts/fetch.mjs ──► Wikidata (artist origin, by exact Apple artist ID)
                     │            ├► MusicBrainz (fallback)
                     │            ├► Apple catalog lookup (copyright line → label)
                     │            └► Wikidata (Polaris Music Prize alumni) → release radar
                     ▼
            js/shared/analyze.js   pure analysis, unit-tested, shared by Node and browser
                     ▼
              data/latest.json ──► static site (vanilla JS, hand-built SVG charts)
                     ▲
     GitHub Actions: daily refresh → commit data → deploy to Pages
```

- **No guessing on nationality.** Artists are matched on their exact Apple Music artist ID (Wikidata property P2850), not by name. "Canadian" means Canadian citizenship or origin, a group formed in Canada, or an artist born in Canada. This mirrors the *A* (artist) part of the CRTC's MAPL definition. Anything unresolved is shown as **unverified**, never assumed.
- **Label ownership from the source.** Each release's copyright line is parsed (for example, *"OVO, under exclusive license to Republic Records, a division of UMG"* becomes label OVO, partner Republic Records, owner Universal). Releases are then classed as *major*, *major-distributed* or *independent*. Canadian labels and imprints (Arts & Crafts, Secret City, Bonsound, Audiogram, OVO, XO…) are flagged.
- **Editorial corrections are first-class.** `editorial/overrides.json` holds editor-verified fixes (for example, artist-owned masters released through a major). They're applied on every refresh.
- **Resilient pipeline.** Retries with backoff and polite per-host pacing. If a comparison market's feed is down, its most recent snapshot is used and flagged as stale. If the Canadian chart is down, the run exits without touching any data.
- **History builds over time.** Daily rank history adds movement, debuts and days on chart.

### Design notes
- Every chart is hand-built SVG with a hover layer, thin marks and recessive grids. Colours come from a colour-blind-validated palette, with light and dark modes. Canada is always orange, other artists or markets are always blue, and label tiers use a one-hue ordinal ramp.
- Fully bilingual: interface, generated editorial copy and pitches (French uses Canadian French conventions).
- No framework, no build step, no dependencies.

---

## Run it

```bash
node scripts/fetch.mjs        # refresh data (Node 20+)
python3 -m http.server 8000   # then open http://localhost:8000
node test/analyze.test.mjs    # tests: label parsing, release age, geography, analysis
```

**Add artists to watch.** Put them in `editorial/watchlist.json`:

```json
{ "artists": [ { "name": "Artist Name", "appleId": "1234567", "note": "why I'm watching" } ] }
```

## Sources & limits
Apple Music public "most played" charts (© Apple) · Wikidata (CC0) · MusicBrainz (CC0) · Natural Earth (public domain).

Apple Music charts reflect Apple Music listeners, not the whole market, and each one is a snapshot in time. This is an independent research project, not affiliated with Apple.
