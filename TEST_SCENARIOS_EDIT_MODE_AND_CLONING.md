# Test Scenarios: Edit Mode & Cloning Fixes

Run these tests after the fixes for bugs #2–#6. Each section maps to one fix.

---

## Fix #2: In-memory state after removing a clone

**What was fixed:** After removing a clone, the remaining clone is reindexed (e.g. instance-2 → instance-1). The app now reloads that widget type from localStorage so in-memory state (scoreboard config, stopwatch time, etc.) matches the reindexed IDs.

### Test 2a – Scoreboard (remove middle clone)

1. On one page, add a **Scoreboard** widget if needed.
2. Clone it twice so you have **3 scoreboards** (original + 2 clones).
3. On the **second clone** (instance-2): change team names and set scores (e.g. Team A 5, Team B 3).
4. In the side panel, **remove the first clone** (instance-1) using the trash icon.
5. **Without refreshing the page:** use the remaining clone (the one that was instance-2, now instance-1).
6. **Pass:** It still shows Team A 5, Team B 3 and the custom names. +/- and Reset work. No wrong data and no errors.

### Test 2b – Stopwatch (remove middle clone)

1. Add a **Stopwatch** widget, clone it twice (3 total).
2. On the **second clone**: start the stopwatch and let it run a few seconds (e.g. 00:05.00).
3. **Remove the first clone** (instance-1) from the side panel.
4. **Without refreshing:** check the remaining clone (formerly instance-2).
5. **Pass:** It still shows the same elapsed time (e.g. 00:05.xx) and Start/Pause/Reset work.

### Test 2c – Stoplight (remove middle clone)

1. Add a **Stoplight** widget, clone it twice (3 total).
2. On the **second clone**: click a light (e.g. green) so it’s on.
3. **Remove the first clone** (instance-1).
4. **Without refreshing:** check the remaining clone.
5. **Pass:** The same light (green) is still on and you can toggle lights normally.

---

## Fix #3: Scoreboard winners copied on clone/move

**What was fixed:** When cloning or moving a scoreboard, the app now also copies `dakboard-scoreboard-winners-*` so the new instance shows the same winner state (and confetti if applicable).

### Test 3a – Clone scoreboard with winner

1. Add a **Scoreboard** widget. Set a low target (e.g. 3).
2. Score one team to the target so it wins (confetti/winner state).
3. **Clone** that scoreboard from the side panel (clone icon).
4. **Pass:** The **clone** shows the same winner state (and confetti if the original had it). Team that won is still marked as winner.

### Test 3b – Move scoreboard with winner to another page

1. On **Page 1**, add a Scoreboard, score to a win, and note which team won.
2. Use **Move to page** (arrow icon) to move that scoreboard to **Page 2**.
3. Go to **Page 2** and check the scoreboard.
4. **Pass:** The moved scoreboard shows the same winner and scores. Reset and +/- work on Page 2.

---

## Fix #4: Clone when original is missing (same-page template)

**What was fixed:** When cloning and the source widget isn’t in the DOM, the app now tries to use a widget of that type from the **same page** as the template before falling back to any page. This keeps layout/context correct when the “original” is missing.

### Test 4 – Clone when original is hidden or missing

1. On one page, add a **Blank** or **Scoreboard** widget.
2. Use the **eye icon** in the side panel to **hide** that widget (so it’s not visible on the page).
3. In the side panel, use the **clone** button for that same (hidden) widget.
4. **Pass:** A **new clone** appears on the page, visible and usable. It doesn’t inherit wrong content from a widget on another page. Position/size are reasonable (no obvious wrong template).

*Note: If your app never allows cloning a hidden widget or never has “missing original” in normal use, this test may be hard to trigger; the fix still ensures that when it does happen, the template comes from the same page when possible.*

---

## Fix #5: Edit mode checkbox stays in sync

**What was fixed:** Whenever edit mode is set (e.g. by code or by switching pages), the **Edit Layout** checkbox is updated to match the actual edit mode state.

### Test 5a – Toggle and checkbox

1. Turn **Edit Layout** ON (checkbox checked). Confirm watermark and drag handles.
2. Turn **Edit Layout** OFF (checkbox unchecked). Confirm watermark and handles go away.
3. **Pass:** The checkbox always matches whether edit mode is on or off.

### Test 5b – Page switch with different edit states

1. On **Page 1**: turn **Edit Layout** ON.
2. Go to **Page 2**: turn **Edit Layout** OFF.
3. Switch back to **Page 1**, then to **Page 2**, then to **Page 1** again.
4. **Pass:** On Page 1 the checkbox is checked; on Page 2 it is unchecked. No “stale” checkbox state.

### Test 5c – New page and panel open

1. Turn **Edit Layout** ON and open the **side panel** (Widget Visibility).
2. **Add a new page** (you should land on the new page).
3. **Pass:** The **Edit Layout** checkbox is **unchecked** on the new page (new pages start with edit mode off). Side panel shows the new page’s widgets.

---

## Fix #6: Move widget uses source-page template

**What was fixed:** When moving a widget that isn’t found in the DOM (e.g. hidden or edge case), the app now looks for a template widget on the **source page** first, then falls back to any page. The moved widget is built from the correct page’s instance.

### Test 6 – Move widget when source is hidden (multi-page)

1. Have **at least 2 pages**. On **Page 1**, add a **Scoreboard** (or Blank) and customize it (e.g. team names “Home” and “Away”, scores 2–1).
2. **Hide** that widget with the eye icon (so it’s not visible but still exists).
3. Stay on Page 1, open the side panel, and use **Move to page** to move that (hidden) scoreboard to **Page 2**.
4. Go to **Page 2** and find the moved scoreboard.
5. **Pass:** The scoreboard on Page 2 shows **Home / Away** and **2–1** (or your custom state). It was built from the source page’s widget, not from a different page’s default or wrong instance.

---

## Quick regression checks

After running the above, do a short pass to ensure nothing broke:

- **Edit Mode:** Turn Edit Layout on/off on two different pages; switch pages and confirm checkbox and side-panel button states (only eye enabled in edit mode).
- **Clone:** Clone a scoreboard and a stopwatch; use both without refresh; remove one clone and confirm the other still works (Tests 2a/2b).
- **Move:** Move a scoreboard to another page and confirm it appears with correct config and state (Tests 3b and 6).

---

*Document generated for the Edit Mode and Cloning bug fixes (bugs #2–#6).*
