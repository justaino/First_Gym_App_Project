/*
  exercise-library.js — a built-in list of common gym exercises (Phase 8).

  What this is for:
  When you type in the "Exercise name" box in the add/edit form, the app looks
  through this list and offers matching suggestions, so you don't have to type
  the whole name (and so the sets/reps/icon get sensible starting values).

  This file is just DATA — there is no behaviour here. The code that searches
  the list and shows the dropdown lives in app.js (section "7b. EXERCISE
  SUGGESTIONS"). This file is loaded BEFORE app.js in index.html, which is why
  app.js can see the EXERCISE_LIBRARY variable below.

  Each entry looks like:
    {
      name:        "Bench press",  // what gets typed into the name box
      icon:        "🏋️",           // must be one of EMOJI_PRESETS in app.js!
      muscleGroup: "Chest",        // shown as a small grey label in the dropdown
      defaultSets: 4,              // suggested number of sets
      defaultReps: 8,              // suggested reps per set
    }

  Want to add your own? Just copy a line, change the words, and save. The only
  rule is that `icon` must be an emoji that already exists in the EMOJI_PRESETS
  list near the top of app.js — otherwise the icon picker won't highlight it.
*/

const EXERCISE_LIBRARY = [
  /* ---------------- CHEST ---------------- */
  { name: "Bench press", icon: "🏋️", muscleGroup: "Chest", defaultSets: 4, defaultReps: 8 },
  { name: "Incline bench press", icon: "🏋️", muscleGroup: "Chest", defaultSets: 4, defaultReps: 8 },
  { name: "Decline bench press", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 10 },
  { name: "Dumbbell bench press", icon: "🏋️", muscleGroup: "Chest", defaultSets: 4, defaultReps: 10 },
  { name: "Incline dumbbell press", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 10 },
  { name: "Dumbbell fly", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 12 },
  { name: "Cable fly", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 12 },
  { name: "Pec deck", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 12 },
  { name: "Chest press machine", icon: "🏋️", muscleGroup: "Chest", defaultSets: 3, defaultReps: 12 },
  { name: "Push-ups", icon: "🤸", muscleGroup: "Chest", defaultSets: 3, defaultReps: 15 },
  { name: "Dips", icon: "🤸", muscleGroup: "Chest", defaultSets: 3, defaultReps: 10 },

  /* ---------------- BACK ---------------- */
  { name: "Deadlift", icon: "🏋️", muscleGroup: "Back", defaultSets: 4, defaultReps: 5 },
  { name: "Sumo deadlift", icon: "🏋️", muscleGroup: "Back", defaultSets: 3, defaultReps: 8 },
  { name: "Pull-ups", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 8 },
  { name: "Chin-ups", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 8 },
  { name: "Lat pulldown", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 12 },
  { name: "Seated cable row", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 12 },
  { name: "Barbell row", icon: "🧗", muscleGroup: "Back", defaultSets: 4, defaultReps: 8 },
  { name: "Dumbbell row", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 10 },
  { name: "T-bar row", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 10 },
  { name: "Straight-arm pulldown", icon: "🧗", muscleGroup: "Back", defaultSets: 3, defaultReps: 12 },
  { name: "Back extension", icon: "🤸", muscleGroup: "Back", defaultSets: 3, defaultReps: 12 },
  { name: "Shrugs", icon: "🏋️", muscleGroup: "Back", defaultSets: 3, defaultReps: 12 },

  /* ---------------- SHOULDERS ---------------- */
  { name: "Overhead press", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 4, defaultReps: 8 },
  { name: "Dumbbell shoulder press", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 10 },
  { name: "Arnold press", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 10 },
  { name: "Lateral raise", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 15 },
  { name: "Cable lateral raise", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 15 },
  { name: "Front raise", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 12 },
  { name: "Rear delt fly", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 15 },
  { name: "Face pull", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 15 },
  { name: "Upright row", icon: "🤾", muscleGroup: "Shoulders", defaultSets: 3, defaultReps: 12 },

  /* ---------------- ARMS ---------------- */
  { name: "Barbell curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 10 },
  { name: "Dumbbell curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Hammer curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Preacher curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 10 },
  { name: "Concentration curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Cable curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Tricep pushdown", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Overhead tricep extension", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Skull crushers", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 10 },
  { name: "Tricep kickback", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Close-grip bench press", icon: "🏋️", muscleGroup: "Arms", defaultSets: 3, defaultReps: 10 },
  { name: "Bench dips", icon: "🤸", muscleGroup: "Arms", defaultSets: 3, defaultReps: 12 },
  { name: "Wrist curl", icon: "💪", muscleGroup: "Arms", defaultSets: 3, defaultReps: 15 },

  /* ---------------- LEGS ---------------- */
  { name: "Back squat", icon: "🦵", muscleGroup: "Legs", defaultSets: 4, defaultReps: 8 },
  { name: "Front squat", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 8 },
  { name: "Goblet squat", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Hack squat", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 10 },
  { name: "Leg press", icon: "🦵", muscleGroup: "Legs", defaultSets: 4, defaultReps: 12 },
  { name: "Lunges", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Walking lunges", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Bulgarian split squat", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 10 },
  { name: "Step-ups", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Leg extension", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 15 },
  { name: "Leg curl", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Romanian deadlift", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 10 },
  { name: "Hip thrust", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 12 },
  { name: "Glute bridge", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 15 },
  { name: "Calf raise", icon: "🦵", muscleGroup: "Legs", defaultSets: 4, defaultReps: 15 },
  { name: "Seated calf raise", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 15 },
  { name: "Box jumps", icon: "🦵", muscleGroup: "Legs", defaultSets: 3, defaultReps: 10 },

  /* ---------------- CORE ----------------
     Note: for holds like the plank, "reps" means SECONDS. */
  { name: "Plank", icon: "⏱️", muscleGroup: "Core", defaultSets: 3, defaultReps: 30 },
  { name: "Side plank", icon: "⏱️", muscleGroup: "Core", defaultSets: 3, defaultReps: 30 },
  { name: "Crunches", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },
  { name: "Sit-ups", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },
  { name: "Bicycle crunches", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },
  { name: "Russian twists", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },
  { name: "Leg raises", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 15 },
  { name: "Hanging leg raise", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 12 },
  { name: "Mountain climbers", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },
  { name: "Ab wheel rollout", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 10 },
  { name: "Cable crunch", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 15 },
  { name: "Dead bug", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 12 },
  { name: "Flutter kicks", icon: "🔥", muscleGroup: "Core", defaultSets: 3, defaultReps: 20 },

  /* ---------------- CARDIO ----------------
     For cardio, "reps" is usually MINUTES — adjust to whatever suits you. */
  { name: "Treadmill run", icon: "🏃", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 20 },
  { name: "Outdoor run", icon: "🏃", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 30 },
  { name: "Elliptical", icon: "🏃", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 20 },
  { name: "Stair climber", icon: "🏃", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 15 },
  { name: "Stationary bike", icon: "🚴", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 20 },
  { name: "Cycling", icon: "🚴", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 30 },
  { name: "Rowing machine", icon: "🚣", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 15 },
  { name: "Swimming", icon: "🏊", muscleGroup: "Cardio", defaultSets: 1, defaultReps: 30 },
  { name: "Jump rope", icon: "🤸", muscleGroup: "Cardio", defaultSets: 3, defaultReps: 60 },
  { name: "Burpees", icon: "🤸", muscleGroup: "Cardio", defaultSets: 3, defaultReps: 15 },
  { name: "Boxing / bag work", icon: "🥊", muscleGroup: "Cardio", defaultSets: 3, defaultReps: 3 },

  /* ---------------- MOBILITY / RECOVERY ---------------- */
  { name: "Yoga flow", icon: "🧘", muscleGroup: "Mobility", defaultSets: 1, defaultReps: 20 },
  { name: "Stretching", icon: "🧘", muscleGroup: "Mobility", defaultSets: 1, defaultReps: 10 },
  { name: "Foam rolling", icon: "🧘", muscleGroup: "Mobility", defaultSets: 1, defaultReps: 10 },
];
