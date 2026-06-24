# Roadmap v2 — Feedback-driven improvements

A second roadmap covering changes requested after the first round of friend
feedback. Same rules as `ROADMAP.md`: plain HTML/CSS/JS, localStorage only, no
frameworks. Build **one phase at a time**, test, commit, then move on.

> The original build (phases 0–4) is in `ROADMAP.md` and is complete.

---

## The 5 pieces of feedback (and which phase covers each)

1. Choose **reps per set** (not one rep count for all sets), defaulting to the
   number first chosen. → **Phase 2**
2. Add an optional **weight** when creating an exercise; the workout defaults to
   that weight. → **Phase 2**
3. When adding several exercises in a row, the day picker should **keep the day
   you were last on** instead of jumping back to today every time (today is only
   the default on the first add of a session). → **Phase 1**
4. **Save as you go**: update/persist each exercise during a workout instead of
   only being able to save once everything is finished. → **Phase 3**
5. **Edit or delete a completed workout** from history. → **Phase 4**

---

## Data model changes (the shared mental model)

We extend the existing shapes. Old data stays valid — new fields are filled in
on the fly, and the old saved-workout format is still read.

```
Exercise (extended)
  { id, profileId, name, icon, day, notes,
    sets,                       // number of sets (unchanged)
    reps,                       // DEFAULT reps, used to seed new sets
    repsPerSet:   [n, n, ...],  // NEW: length = sets
    weight,                     // NEW: optional DEFAULT weight (number | null)
    weightPerSet: [n, n, ...] } // NEW: length = sets (each number | null)

Session entry (extended)
  OLD: { exerciseId, setsDone, weight }
  NEW: { exerciseId, sets: [ { reps, weight, done } ] }
       // setsDone is derived = count of sets where done === true
```

localStorage keys are unchanged (`gym:profiles`, `gym:activeProfileId`,
`gym:exercises`, `gym:sessions`, `gym:theme`).

**Back-compat helpers (added in Phase 2/3):**
- `normalizeExercise(ex)` — guarantees `repsPerSet` / `weightPerSet` exist.
- `entrySetsDone(entry)` — works for both old (`setsDone`) and new (`sets[]`).

---

## Phases

### Phase 1 — Remember the day when adding exercises ✅
**Covers:** feedback #3
**Goal:** the Add-exercise form keeps the last-used day within a session.
- ✅ Track the last-chosen day in memory
- ✅ On "Add exercise", default the day to the last-chosen day (or today on the
      very first add after the page loads)
- ✅ Saving an exercise updates the remembered day

**Done when:** I can add three exercises to "Wednesday" in a row without
re-picking the day each time; a fresh page load still defaults to today.

---

### Phase 2 — Per-set reps & weights in the plan ✅
**Covers:** feedback #1 and #2
**Goal:** plan each set's reps and (optional) weight, seeded from a default.
- ✅ Extend the Exercise model with `repsPerSet`, `weight`, `weightPerSet`
- ✅ Add a `normalizeExercise()` helper so old exercises gain the new fields
- ✅ Add/edit form: a "default reps" and "default weight" field, plus a per-set
      list (one row per set) pre-filled from the defaults and editable
- ✅ Changing the number of sets grows/shrinks the per-set rows sensibly
- ✅ Exercise cards show a sensible summary (e.g. `3 × 10`, or `3 × 10,12,15`,
      with weight appended when set)

**Done when:** I can add an exercise with 3 sets of 10/12/15 reps at a default
weight, edit it, and see it summarised correctly; old exercises still work.

---

### Phase 3 — Save as you go ☐
**Covers:** feedback #4
**Goal:** a workout is saved continuously, not only at the end. On-the-day edits
are **session-only** — they never change the saved exercise/plan.
- ☐ New session-entry shape capturing per-set `{ reps, weight, done }`
- ☐ Starting a workout creates/opens a session seeded from the plan
- ☐ Each set row in workout mode shows reps + weight + a "done" toggle, all
      editable, and **persists immediately** on change
- ☐ **Add or remove a set for that day** (e.g. planned 3, did 4) — the count is
      per-session and does NOT change the master exercise
- ☐ Leaving and reopening the day resumes the in-progress workout
- ☐ "Finish" just marks it complete; progress/history read the new shape (and
      still read old sessions via `entrySetsDone()`)

**Done when:** I can start Pull Ups (planned 3×10), change it to 4 sets at
12/10/10/8 with a weight, refresh and see it preserved, finish it — and the Pull
Ups exercise still shows 3×10 for next time.

---

### Phase 4 — Edit & delete completed workouts ☐
**Covers:** feedback #5
**Goal:** manage history after the fact.
- ☐ Each history item gets **Edit** and **Delete**
- ☐ Delete removes the session (with a confirm)
- ☐ Edit reopens the saved workout in the Phase 3 editor and re-saves it
      (old-format sessions are upgraded to the new shape on save)

**Done when:** I can open a past workout, change a set or weight, save, and see
the change reflected in progress; and I can delete a workout from history.

---

## How we'll work
1. One phase at a time; I review the change before approving.
2. Test in Live Server against the phase's "Done when".
3. Commit with a short message, then push (auto-deploys to Netlify).
4. Tick the ☐ boxes as each phase lands.
