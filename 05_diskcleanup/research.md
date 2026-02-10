# 05_diskcleanup: Research

## Research Question
How has digital clutter been represented over the last 50 years? How can users understand (1) what and how much of a certain kind of file they have, and (2) how much space could be freed if they deleted some?

---

## Part 1: 50-Year Timeline of Digital Clutter Representation

### Phase 1 — The Desktop Metaphor (1970–1984)

The first challenge was that digital storage had no visual form. Xerox PARC's answer (Alan Kay, David C. Smith, 1970) was to borrow from the physical world: files, folders, trash cans. The Xerox Alto (1973) introduced bitmapped icons; the Xerox Star (1981) delivered the first full WIMP interface; Apple's Lisa (1983) and Macintosh (1984) popularized it.

**Skeuomorphism** made digital objects look like physical ones — manila folders, paper documents, metal trash cans. This solved the *recognition* problem ("what is this thing?") but not the *scale* problem ("how much do I have?"). A 4GB video and a 4KB text file look identical as desktop icons. The desktop metaphor gave individual files identity and presence but couldn't communicate accumulation.

### Phase 2 — Space-Filling Visualizations (1990–2010)

Ben Shneiderman's **treemap** algorithm (1990) was the paradigm shift: area directly encodes size. Every pixel corresponds to a proportion of disk usage. Suddenly the invisible became visible — a 4GB video is thousands of times larger *on screen* than a 4KB text file.

**Treemap tools:**
- **SequoiaView** (Eindhoven) — early treemap disk analyzer
- **KDirStat** (Linux) — inspired the entire lineage
- **WinDirStat** (2003, Windows) — 9M+ downloads, still 54K/week in 2024. Three views: directory list, color-coded treemap, extension statistics
- **Disk Inventory X** (Mac) — treemap based on KDirStat's algorithm
- **GrandPerspective** (2006–present, Mac) — 20 years old as of Jan 2026, novel layout algorithm

**Sunburst/radial tools** emerged in parallel from 1990s academic research on nested pie charts:
- **Filelight** (Max Howell) — radial disk visualization
- **Scanner** (Steffen Gerlach) — early sunburst tool
- **DaisyDisk** (Mac, premium) — 3x App Store "Best of Year." Design innovations: sectors sorted by size for comparison, small files consolidated into a "smaller objects" sector, color-coded folder lineage, "blossom" animations illustrating folder relationships, depth beyond 5 ring levels (outer rings progressively thinner)

**Key distinction:** Treemaps fill a rectangle and show everything at once — good for spotting outliers. Sunbursts use concentric rings and emphasize hierarchy — good for understanding folder structure. Both use area to encode size.

### Phase 3 — OS-Level Storage Management (2010s–present)

Apple simplified the visualization to a **color-coded stacked bar** with categories (Apps, Photos, System Data, Documents, Trash) plus **personalized recommendations**: Store in iCloud, Optimize Storage, Offload Unused Apps. iOS does per-app size lists sorted by usage, with "Offload App" as a notable innovation — deletes the app binary but preserves user data.

Windows introduced Storage Sense (reports "We were able to free up 2.4 GB" after cleanup) and Microsoft PC Manager with deep cleanup checklists. The traditional Windows Disk Cleanup (cleanmgr) notably closes without showing results — no summary, no before/after feedback.

**The shift here was from exploration to action** — the visualization became simpler but was paired with opinionated recommendations about what to do.

### Phase 4 — Gamified Cleanup Tools (2010s–present)

- **CleanMyMac X + Gemini 2** (MacPaw): Self-learning duplicate detection that remembers user preferences and suggests rules; Easter egg animations; smart cleanup vs. manual review modes; recently deleted recovery as a safety net; satisfying summary screens
- **WizTree**: Reads NTFS Master File Table directly for near-instant scans; interactive treemap with hover details
- **BleachBit**: Open-source cross-platform cleaner

These tools recognized that cleanup is not just a technical task but an emotional one. Gemini 2's self-learning algorithm analyzes how users choose which duplicates to keep and proactively suggests new rules based on behavior patterns.

### Phase 5 — Data Physicalization (2020s frontier)

2024 TEI conference research explores metaphors in physical data representations — making abstract data tangible through material form. Researchers found that "tacit data" (implicitly known, hard to uncover) particularly benefits from physical metaphors. The concept of "metaphorical distance" measures how far a physical representation is from the data it encodes. This is the research frontier — not just how to show data on screen, but what data *feels like* as a material.

Examples from data physicalization research: honey used to represent bee colony collapse data; 3D-printed DNA structures; interactive sculptures where touching the form reveals data layers.

### Summary: The 50-Year Arc

| Era | Approach | Core Question Answered | Key Innovation |
|-----|----------|------------------------|----------------|
| 1970s–84 | Desktop metaphor / skeuomorphic icons | "What *is* this?" | Physical -> digital mapping |
| 1990–2010 | Treemaps / sunbursts | "How *much* do I have?" | Area encodes size |
| 2010s | OS storage bars + recommendations | "What *should I do*?" | Simplified categories + actions |
| 2010s+ | Gamified cleanup tools | "How does cleanup *feel*?" | Emotional UX + learning algorithms |
| 2020s | Data physicalization | "What does data *feel like*?" | Material metaphors, tangibility |

The trajectory: from making individual files recognizable -> making accumulation visible -> making decisions easy -> making cleanup satisfying -> making data tangible.

---

## Part 2: Design Patterns for the Two User Questions

### Question 1: "What do I have and how much of each kind?"

| Pattern | Example | Strength | Weakness |
|---------|---------|----------|----------|
| **Categorical bar** | macOS storage bar | Instant read, no learning curve | No drill-down, categories are rigid and pre-defined |
| **Treemap** | WinDirStat | Every file visible, outliers jump out, space-efficient | Overwhelming at scale, abstract, labels hard to read |
| **Sunburst** | DaisyDisk | Hierarchy is clear, click-to-zoom is natural, beautiful | Less precise comparison than rectangles, outer rings compress |
| **Sorted list** | iOS storage | Most actionable (swipe to delete), precise readable sizes | No proportional/spatial understanding, must scroll |
| **Extension stats** | WinDirStat sidebar | Shows file type distribution across entire disk | No spatial context, disconnected from file locations |

Most effective tools **combine patterns**: WinDirStat pairs a treemap with a sorted directory list and extension statistics. macOS pairs a category bar with a sorted list and recommendation cards. This layering lets users move between overview and detail.

### Question 2: "How much space could I free?"

| Pattern | Example | Strength | Weakness |
|---------|---------|----------|----------|
| **Collect-then-delete** | DaisyDisk drag-to-collect | Separates choosing from deleting; running total; reversible before commit | More complex interaction model |
| **Checkbox + running total** | CleanMyMac, Windows Cleanup | Simple, precise, familiar metaphor | Less viscerally satisfying |
| **Recommendation cards** | macOS/iOS suggestions | Lowest cognitive load, system does the thinking | Least user control, limited to preset categories |
| **Before/after summary** | Storage Sense | Satisfying closure, concrete number | No preview *before* action, only feedback *after* |
| **Offload** (keep data, remove app) | iOS | Reduces fear of loss — app is gone but data stays | Only works for apps, not general files |

The **most satisfying pattern** is collect-then-delete because it gives users a staging area — a visual pile of things they're choosing to remove — with a live counter showing cumulative savings. This separation of *choosing* from *committing* reduces anxiety and increases the feeling of control.

---

## Part 3: User Psychology of Digital Clutter

### Why people hoard digital files
- **Emotional attachment** — especially photos and music, which encode memories and identity. Research shows anxiety when participants even *consider* losing these items
- **Fear of Missing Out (FoMO)** — social comparison drives accumulation; seeing others' digital collections makes people keep more
- **"Just in case" / future use** — keeping files as evidence, for hypothetical future need
- **Identity extension** — digital content becomes part of who a person is, making deletion feel like self-erasure
- **Invisible accumulation** — unlike a messy desk, no physical pile grows. Awareness of digital accumulation is dramatically lower than physical accumulation
- **Low perceived cost of storage** — storage cost < organization cost, so people rationally choose clutter over effort
- **Dispositional greed** — higher greed correlates with lower deletion willingness
- **Lack of methodology** — many people simply don't know how to decide what's worth keeping

### Barriers to decluttering
- **Fear of irreversible loss** — the single biggest barrier. "What if I need this later?"
- **Overwhelm -> ego depletion** — when confronted with the full scale of accumulation, cognitive resources deplete, leading to surface-level "I'll deal with it later" thinking
- **Time/effort asymmetry** — hoarding is effortless (drag, download, save); decluttering requires active evaluation of every item
- **Emotional difficulty** — photos of ex-partners, old projects, deceased relatives. Deciding means confronting feelings
- **"Not my server, not my problem"** — cloud storage removes the sense of personal responsibility for data

### What motivates successful cleanup
- **Visible progress** — seeing freed space accumulate in real time
- **Manageable chunks** — progressive disclosure, one category at a time rather than everything at once
- **Celebrating completion** — before/after comparisons, satisfying animations, concrete numbers
- **Safety nets** — undo, recently deleted, offload (keeps data while removing the app). These reduce the "what if" anxiety
- **Separating choosing from committing** — staging areas let users build confidence in their decisions before executing

### Core insight
Digital clutter is fundamentally different from physical clutter because it's **invisible**. A full hard drive gives no visual or tactile signal — no overflowing drawer, no tower of papers. The only cue is typically a warning notification when space runs critically low. This means:
1. Users don't develop natural awareness of accumulation
2. The scale of the problem is always surprising when first revealed
3. Any visualization must first **make the invisible tangible** before it can help with decisions

The most interesting design space lies in bridging this gap — giving digital accumulation a sense of weight, volume, or physical presence that triggers the same intuitive "I should clean this up" response that a messy room does.

---

## Sources

### Disk Visualization Tools
- [WinDirStat](https://en.wikipedia.org/wiki/WinDirStat) — treemap disk analyzer (2003)
- [DaisyDisk Sunburst History](https://daisydiskapp.com/guide/2/en/SunburstHistory/) — history of radial visualization
- [GrandPerspective](https://grandperspectiv.sourceforge.net/) — macOS treemap tool (2006)
- [Disk Space Visualizer Alternatives](https://alternativeto.net/software/disk-space-visualizer/) — comprehensive tool listing

### Desktop Metaphor & Skeuomorphism
- [Desktop Metaphor — Wikipedia](https://en.wikipedia.org/wiki/Desktop_metaphor)
- [Skeuomorphism — Wikipedia](https://en.wikipedia.org/wiki/Skeuomorph)
- [Apple and Skeuomorphism — AppleInsider](https://appleinsider.com/articles/22/08/23/what-apple-learned-from-skeuomorphism-and-why-it-still-matters)
- [Icon Evolution — Streamline](https://blog.streamlinehq.com/evolution-of-icons-in-ui/)

### UX & Design Patterns
- [Clearing the Clutter — UX Case Study](https://uxdesign.cc/clearing-the-clutter-a-case-study-6f8574d4e69e)
- [Display Clutter Impact — ResearchGate](https://www.researchgate.net/publication/325497103_Impact_of_Display_Clutter_on_User_Experience)
- [UX Design Patterns 2025](https://www.pages.report/blog/user-experience-design-patterns)
- [Decluttering Design — Designmodo](https://designmodo.com/improve-usability-decluttering-designs/)

### Digital Hoarding Psychology
- [Digital Hoarding Motivations — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0747563218301365)
- [Digital Hoarding & Personal Data — Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/07370024.2023.2293001)
- [FoMO and Digital Hoarding — SAGE](https://journals.sagepub.com/doi/pdf/10.1177/20563051221150420)
- [Digital Hoarding — Wikipedia](https://en.wikipedia.org/wiki/Digital_hoarding)

### Data Physicalization
- [Metaphors in Physical Data Representations — ACM](https://dl.acm.org/doi/fullHtml/10.1145/3623509.3633355) (TEI '24)
- [Data Physicalization — INRIA](https://inria.hal.science/hal-02113248v2/document)

### Storage Management UX
- [macOS Storage Management — Setapp](https://setapp.com/how-to/manage-storage-on-mac)
- [iOS Storage — Apple Support](https://support.apple.com/en-us/108429)
- [Gemini 2 — MacPaw](https://macpaw.com/gemini)
