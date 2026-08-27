const KEY = 'lift-log-v1';
const WORKOUT_KEY = 'lift-workouts-v1';

let log = JSON.parse(localStorage.getItem(KEY) || '[]');
let workouts = JSON.parse(localStorage.getItem(WORKOUT_KEY) || 'null');

/* ---- Seed: Planet Fitness Push / Pull / Legs ---- */
const SEED_WORKOUTS = [
  {
    id: 'seed-push',
    label: 'A — Push',
    exercises: [
      { name: 'Smith Machine Incline Press', sets: 4, reps: '5–8', notes: 'Bench at 30°. Bar to upper chest, 3-second lowering, drive up explosively.' },
      { name: 'Machine Chest Press', sets: 3, reps: '8–12', notes: "Handles aligned with mid-chest. Full stretch at the bottom, don't slam the stack." },
      { name: 'Seated Dumbbell Shoulder Press', sets: 3, reps: '6–10', notes: 'Bench at 85–90°. At max DB weight, switch to 4-second negatives.' },
      { name: 'Cable Lateral Raise', sets: 3, reps: '12–15', notes: 'Lowest pulley, lean slightly away. Lead with the elbow.' },
      { name: 'Pec Deck Fly', sets: 2, reps: '12–15', notes: 'Squeeze 1 second at peak contraction. Pump finisher.' },
      { name: 'Rope Triceps Pushdown', sets: 3, reps: '10–12', notes: 'Elbows pinned to your sides, spread the rope at the bottom.' },
      { name: 'Overhead Cable Triceps Extension', sets: 2, reps: '12', notes: 'Face away from the stack, hinge slightly forward. Full stretch on the long head.' },
    ],
  },
  {
    id: 'seed-pull',
    label: 'B — Pull',
    exercises: [
      { name: 'Lat Pulldown', sets: 4, reps: '6–10', notes: 'Slightly wider than shoulder grip, pull to upper chest. Stack maxed? Add a 2-second pause.' },
      { name: 'Chest-Supported Row Machine', sets: 3, reps: '8–12', notes: 'Chest glued to the pad. Drive elbows back, squeeze shoulder blades.' },
      { name: 'Single-Arm Cable Row', sets: 3, reps: '10–12 / side', notes: 'Full stretch forward, then row to the hip.' },
      { name: 'Reverse Pec Deck (Rear Delts)', sets: 3, reps: '15', notes: 'Palms down or neutral. High reps, no swinging.' },
      { name: 'Cable Curl (Straight or EZ Bar)', sets: 3, reps: '8–12', notes: 'Elbows slightly in front of the body, full range.' },
      { name: 'Dumbbell Hammer Curl', sets: 2, reps: '10–12', notes: 'Neutral grip, controlled. Builds brachialis and grip.' },
    ],
  },
  {
    id: 'seed-legs',
    label: 'C — Legs',
    exercises: [
      { name: 'Smith Machine Squat', sets: 4, reps: '5–8', notes: 'Feet slightly forward of the bar path. Control the descent to just below parallel.' },
      { name: 'Leg Press', sets: 3, reps: '8–12', notes: 'Feet mid-platform, shoulder width. Stack maxed? 2-second pause at the bottom.' },
      { name: 'Smith Machine or DB Romanian Deadlift', sets: 3, reps: '8–10', notes: 'Soft knees, hips back, 3–4 second lowering. Bar stays close to your legs.' },
      { name: 'Leg Extension', sets: 3, reps: '12–15', notes: '1-second squeeze at the top. Toes slightly out hits the inner quad.' },
      { name: 'Lying or Seated Leg Curl', sets: 3, reps: '10–12', notes: "Slow eccentric. Don't let the pad crash back down." },
      { name: 'Calf Raise on Leg Press', sets: 4, reps: '12–15', notes: 'Full stretch at the bottom with a 2-second pause. No bouncing.' },
    ],
  },
];

if (!Array.isArray(workouts)) {
  workouts = SEED_WORKOUTS;
  localStorage.setItem(WORKOUT_KEY, JSON.stringify(workouts));
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(log));
  render();
}

function saveWorkouts() {
  localStorage.setItem(WORKOUT_KEY, JSON.stringify(workouts));
}

/* ---- Helpers ---- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dayKey = t => new Date(t).toDateString();

const note = m => {
  const el = document.getElementById('note');
  if (el) el.innerHTML = `<small>${m}</small>`;
};

const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---- Swaps: today-only substitutions when a machine is taken ----
   Keyed by workout + day + slot, so a swap survives a reload but never
   edits the saved workout, and quietly expires tomorrow. */
const SWAP_KEY = 'lift-swaps-v1';
let swaps = JSON.parse(localStorage.getItem(SWAP_KEY) || '{}');

const slotKey = (workoutId, i) => `${workoutId}|${dayKey(Date.now())}|${i}`;

// Drop anything left over from previous days.
for (const k of Object.keys(swaps)) {
  if (k.split('|')[1] !== dayKey(Date.now())) delete swaps[k];
}
localStorage.setItem(SWAP_KEY, JSON.stringify(swaps));

const saveSwaps = () => localStorage.setItem(SWAP_KEY, JSON.stringify(swaps));

/* ---- Machine settings: your seat height, pad position, foot plate ----
   Keyed by exercise name, not by workout, so the same machine carries the
   same reminder everywhere it shows up. These persist — they are not
   per-day like swaps. */
const SETTINGS_KEY = 'lift-settings-v1';
let exSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

const settingsKey = name => String(name).trim().toLowerCase();
const getSettings = name => exSettings[settingsKey(name)] || [];
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(exSettings));

/* Only decides whether the Settings prompt is shown up front — you can
   record settings on any exercise regardless. */
const isMachine = name =>
  /machine|cable|smith|pulldown|pushdown|pec deck|deck|leg press|leg extension|leg curl|seated row|hack squat|crossover|chest press|leg raise/i
    .test(String(name));

/* Chips summarising an exercise's saved settings, with an edit affordance.
   `hook` is the data-settings attribute value the click handler reads back. */
function settingsChipsHTML(name, hook) {
  const cfg = getSettings(name);
  if (cfg.length) {
    return `<div class="ex-settings">
      ${cfg.map(c => `<span class="setting-chip">${esc(c.label)}
        <strong>${esc(c.value)}</strong></span>`).join('')}
      <button class="btn-link" data-settings="${esc(hook)}">Edit</button>
    </div>`;
  }
  return isMachine(name)
    ? `<div class="ex-settings">
         <button class="btn-link" data-settings="${esc(hook)}">+ Machine settings</button>
       </div>`
    : `<div class="ex-settings ex-settings-quiet">
         <button class="btn-link" data-settings="${esc(hook)}">+ Settings</button>
       </div>`;
}

/* Inline label/value editor, rendered into `box`. Toggles closed if already
   open. Calls onSaved(count) after writing to storage. */
function openSettingsEditor(box, name, onSaved) {
  if (box.firstChild) return box.replaceChildren();

  const editor = document.createElement('div');
  editor.className = 'settings-box';
  editor.innerHTML = `
    <label>Settings for ${esc(name)}</label>
    <div class="setting-rows"></div>
    <button class="btn btn-ghost btn-sm add-setting">+ Add Setting</button>
    <div class="editor-actions">
      <button class="btn btn-primary btn-sm settings-ok">Save</button>
      <button class="btn btn-ghost btn-sm settings-cancel">Cancel</button>
    </div>`;

  const rows = editor.querySelector('.setting-rows');
  const addRow = (c = {}) => {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <input class="setting-label" placeholder="Seat height" value="${esc(c.label || '')}">
      <input class="setting-value" placeholder="4" value="${esc(c.value || '')}">
      <button class="btn btn-ghost btn-icon remove-setting" title="Remove">&times;</button>`;
    row.querySelector('.remove-setting').onclick = () => row.remove();
    rows.appendChild(row);
  };

  const cfg = getSettings(name);
  (cfg.length ? cfg : [{}]).forEach(addRow);
  box.replaceChildren(editor);

  editor.querySelector('.add-setting').onclick = () => addRow();
  editor.querySelector('.settings-cancel').onclick = () => box.replaceChildren();
  editor.querySelector('.settings-ok').onclick = () => {
    const next = [...rows.querySelectorAll('.setting-row')]
      .map(r => ({
        label: r.querySelector('.setting-label').value.trim(),
        value: r.querySelector('.setting-value').value.trim(),
      }))
      .filter(c => c.label || c.value);

    if (next.length) exSettings[settingsKey(name)] = next;
    else delete exSettings[settingsKey(name)];
    saveSettings();
    onSaved(next.length);
  };
}

/* Everything known about every exercise, merged from the catalog, your
   workouts, and your history. Keyed the same way settings are. */
function exerciseIndex() {
  const catalog = typeof EXERCISE_CATALOG === 'undefined' ? [] : EXERCISE_CATALOG;
  const idx = new Map();

  const ensure = (name, group) => {
    const k = settingsKey(name);
    if (!k) return null;
    if (!idx.has(k)) idx.set(k, { name: String(name).trim(), group: 'Other', slots: [], sets: [] });
    const e = idx.get(k);
    if (group && e.group === 'Other') e.group = group;
    return e;
  };

  catalog.forEach(e => ensure(e.name, e.group));
  workouts.forEach(w => w.exercises.forEach(ex => {
    const e = ensure(ex.name);
    if (e) e.slots.push({ label: w.label, sets: ex.sets, reps: ex.reps, notes: ex.notes });
  }));
  log.forEach(s => {
    const e = ensure(s.exercise);
    if (e) e.sets.push(s);
  });

  for (const e of idx.values()) e.sets.sort((a, b) => a.at - b.at);
  return idx;
}

/* Display order for muscle-group sections and optgroups. */
const GROUP_ORDER =
  ['Chest', 'Back', 'Shoulders', 'Arms', 'Forearms', 'Core', 'Legs', 'Glutes', 'Cardio', 'Other'];

/* Every exercise you could swap in, bucketed by muscle group. `firstGroup`
   floats one group to the top - used to surface same-group alternatives. */
function exercisePool(firstGroup) {
  const groups = new Map();
  for (const e of exerciseIndex().values()) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group).push(e.name);
  }
  for (const names of groups.values()) names.sort((a, b) => a.localeCompare(b));

  const rank = g => (g === firstGroup ? -1 : (GROUP_ORDER.indexOf(g) + 1 || 99));
  return new Map([...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0])));
}

/* ---- History (main page) ---- */
function render() {
  const body = document.getElementById('history-body');
  if (!body) return;
  const empty = document.getElementById('history-empty');
  empty.hidden = log.length > 0;
  body.innerHTML = log
    .slice()
    .reverse()
    .map(s => `<tr>
      <td>
        <strong>${esc(s.exercise)}</strong>
        ${s.workout ? `<br><span class="tag">${esc(s.workout)}</span>` : ''}
      </td>
      <td class="set-load">${esc(s.weight)} &times; ${esc(s.reps)}</td>
      <td class="set-when">${new Date(s.at).toLocaleString()}</td>
    </tr>`)
    .join('');
}

/* ============================================================
   WORKOUTS PAGE — build and label reusable workout lists
   ============================================================ */
const workoutList = document.getElementById('workout-list');

if (workoutList) {
  const editor = document.getElementById('workout-editor');
  const labelInput = document.getElementById('workout-label');
  const rowsBox = document.getElementById('exercise-rows');
  const editorTitle = document.getElementById('editor-title');
  let editingId = null;

  const exerciseRow = (ex = {}) => {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
      <div class="exercise-row-main">
        <input class="ex-name" placeholder="Exercise" autocapitalize="words" value="${esc(ex.name || '')}">
        <input class="ex-sets" type="number" inputmode="numeric" placeholder="Sets" value="${esc(ex.sets ?? '')}">
        <input class="ex-reps" placeholder="Reps" value="${esc(ex.reps || '')}">
        <button class="btn btn-ghost btn-icon remove-row" title="Remove exercise">&times;</button>
      </div>
      <input class="ex-notes" placeholder="Notes (optional)" value="${esc(ex.notes || '')}">`;
    row.querySelector('.remove-row').onclick = () => row.remove();
    return row;
  };

  function openEditor(workout) {
    editingId = workout ? workout.id : null;
    editorTitle.textContent = workout ? 'Edit Workout' : 'New Workout';
    labelInput.value = workout ? workout.label : '';
    rowsBox.innerHTML = '';
    const list = workout && workout.exercises.length ? workout.exercises : [{}];
    list.forEach(ex => rowsBox.appendChild(exerciseRow(ex)));
    editor.hidden = false;
    labelInput.focus();
  }

  function closeEditor() {
    editor.hidden = true;
    editingId = null;
  }

  function renderWorkouts() {
    document.getElementById('workouts-empty').hidden = workouts.length > 0;
    workoutList.innerHTML = workouts.map(w => `
      <div class="card workout-card">
        <div class="workout-head">
          <h3>${esc(w.label)}</h3>
          <div class="workout-actions">
            <button class="btn btn-ghost btn-sm" data-edit="${esc(w.id)}">Edit</button>
            <button class="btn btn-ghost btn-sm btn-danger" data-delete="${esc(w.id)}">Delete</button>
          </div>
        </div>
        <table class="sets-table">
          <tbody>
            ${w.exercises.map(ex => `<tr>
              <td>
                <strong>${esc(ex.name)}</strong>
                ${ex.notes ? `<br><span class="set-when">${esc(ex.notes)}</span>` : ''}
              </td>
              <td class="set-load">${esc(ex.sets || '')} &times; ${esc(ex.reps || '')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <a class="btn btn-primary btn-sm workout-start" href="./log.html?w=${encodeURIComponent(w.id)}">Start This Workout</a>
      </div>`).join('');

    workoutList.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => openEditor(workouts.find(w => w.id === b.dataset.edit));
    });
    workoutList.querySelectorAll('[data-delete]').forEach(b => {
      b.onclick = () => {
        const w = workouts.find(x => x.id === b.dataset.delete);
        if (!confirm(`Delete "${w.label}"? Sets you already logged are kept.`)) return;
        workouts = workouts.filter(x => x.id !== b.dataset.delete);
        saveWorkouts();
        renderWorkouts();
      };
    });
  }

  document.getElementById('new-workout').onclick = () => openEditor(null);
  document.getElementById('add-exercise').onclick = () => rowsBox.appendChild(exerciseRow());
  document.getElementById('cancel-workout').onclick = closeEditor;

  document.getElementById('save-workout').onclick = () => {
    const label = labelInput.value.trim();
    if (!label) return note('Give the workout a label first — "Legs", "B — Pull", anything.');

    const exercises = [...rowsBox.querySelectorAll('.exercise-row')]
      .map(r => ({
        name: r.querySelector('.ex-name').value.trim(),
        sets: r.querySelector('.ex-sets').value.trim(),
        reps: r.querySelector('.ex-reps').value.trim(),
        notes: r.querySelector('.ex-notes').value.trim(),
      }))
      .filter(ex => ex.name);

    if (!exercises.length) return note('Add at least one exercise.');

    if (editingId) {
      const w = workouts.find(x => x.id === editingId);
      w.label = label;
      w.exercises = exercises;
    } else {
      workouts.push({ id: uid(), label, exercises });
    }
    saveWorkouts();
    closeEditor();
    renderWorkouts();
    note(`Saved ${label} — ${exercises.length} exercise(s).`);
  };

  renderWorkouts();
}

/* ============================================================
   LOG PAGE — pick a workout, log sets against its exercises
   ============================================================ */
const workoutSelect = document.getElementById('workout-select');

if (workoutSelect) {
  const sessionBox = document.getElementById('session');
  const freeform = document.getElementById('freeform');

  workoutSelect.innerHTML =
    `<option value="">Free entry (no workout)</option>` +
    workouts.map(w => `<option value="${esc(w.id)}">${esc(w.label)}</option>`).join('');

  // Deep link from the Workouts tab: ./log.html?w=<id>
  const wanted = new URLSearchParams(location.search).get('w');
  if (wanted && workouts.some(w => w.id === wanted)) workoutSelect.value = wanted;

  const lastLoad = name => {
    for (let i = log.length - 1; i >= 0; i--) if (log[i].exercise === name) return log[i];
    return null;
  };

  const todaysSets = (name, label) =>
    log.filter(s => s.exercise === name && s.workout === label && dayKey(s.at) === dayKey(Date.now()));

  function renderSession() {
    const w = workouts.find(x => x.id === workoutSelect.value);
    freeform.hidden = !!w;
    sessionBox.hidden = !w;
    if (!w) return;

    sessionBox.innerHTML = w.exercises.map((slot, i) => {
      // A swap keeps the slot's prescription and replaces only the movement.
      const swappedFrom = swaps[slotKey(w.id, i)] ? slot.name : null;
      const ex = swappedFrom
        ? { name: swaps[slotKey(w.id, i)], sets: slot.sets, reps: slot.reps, notes: '' }
        : slot;

      const done = todaysSets(ex.name, w.label);
      const prev = lastLoad(ex.name);
      const target = [ex.sets, ex.reps].filter(Boolean).join(' × ');

      // One row per planned set. Past the plan, keep a single spare row open
      // so an extra set is still loggable.
      const planned = parseInt(ex.sets, 10) || 1;
      const rowCount = done.length >= planned ? done.length + 1 : planned;

      // Fall back through: last set today -> last time you did it -> the plan.
      const ref = done[done.length - 1] || prev;
      const wHint = ref ? esc(ref.weight) : '0';
      const rHint = ref ? esc(ref.reps) : esc(ex.reps || '0');

      const rows = Array.from({ length: rowCount }, (_, n) => {
        const s = done[n];
        const extra = n >= planned;
        if (s) {
          return `
            <div class="set-row set-row-done">
              <span class="set-no">${n + 1}</span>
              <span class="set-done-load">${esc(s.weight)} × ${esc(s.reps)}</span>
              <span class="set-check">&#10003;</span>
            </div>`;
        }
        return `
          <div class="set-row">
            <span class="set-no">${n + 1}${extra ? '<small>+</small>' : ''}</span>
            <input id="w-${i}-${n}" type="number" inputmode="decimal"
                   aria-label="Set ${n + 1} weight" placeholder="${wHint}">
            <input id="r-${i}-${n}" type="number" inputmode="numeric"
                   aria-label="Set ${n + 1} reps" placeholder="${rHint}">
            <button class="btn btn-primary btn-sm" data-log="${i}" data-set="${n}">Log</button>
          </div>`;
      }).join('');

      return `
        <div class="card exercise-card">
          <div class="workout-head">
            <h3>${esc(ex.name)}</h3>
            <div class="ex-head-right">
              ${target ? `<span class="target">${esc(target)}</span>` : ''}
              <button class="btn btn-ghost btn-sm" data-swap="${i}">Swap</button>
            </div>
          </div>
          ${swappedFrom
            ? `<p class="ex-note swapped">
                 Swapped in for <strong>${esc(swappedFrom)}</strong>
                 <button class="btn-link" data-revert="${i}">Undo</button>
               </p>`
            : ex.notes ? `<p class="ex-note">${esc(ex.notes)}</p>` : ''}
          <div class="swap-slot" data-swap-slot="${i}"></div>
          ${settingsChipsHTML(ex.name, i)}
          <div class="settings-slot" data-settings-slot="${i}"></div>
          <div class="set-head">
            <span class="set-no">Set</span>
            <span>Weight</span>
            <span>Reps</span>
            <span></span>
          </div>
          ${rows}
        </div>`;
    }).join('');

    sessionBox.querySelectorAll('[data-log]').forEach(btn => {
      btn.onclick = () => {
        const { log: i, set: n } = btn.dataset;
        const wEl = document.getElementById(`w-${i}-${n}`);
        const rEl = document.getElementById(`r-${i}-${n}`);
        const weight = wEl.value;
        const reps = rEl.value;
        const ex = w.exercises[i];
        // Placeholders are hints only — the rep hint can be a range ("5–8").
        if (!weight || !reps) return note('Enter a weight and reps first.');
        log.push({ exercise: ex.name, weight, reps, workout: w.label, at: Date.now() });
        save();
        renderSession();
        note(`Logged ${ex.name} — set ${Number(n) + 1}, ${weight} × ${reps}`);
      };
    });

    const resolvedName = i => swaps[slotKey(w.id, i)] || w.exercises[i].name;

    sessionBox.querySelectorAll('[data-settings]').forEach(btn => {
      btn.onclick = () => {
        const i = btn.dataset.settings;
        const name = resolvedName(i);
        openSettingsEditor(
          sessionBox.querySelector(`[data-settings-slot="${i}"]`),
          name,
          count => {
            renderSession();
            note(count ? `Saved settings for ${name}.` : `Cleared settings for ${name}.`);
          }
        );
      };
    });

    sessionBox.querySelectorAll('[data-revert]').forEach(btn => {
      btn.onclick = () => {
        const i = btn.dataset.revert;
        const back = w.exercises[i].name;
        delete swaps[slotKey(w.id, i)];
        saveSwaps();
        renderSession();
        note(`Back to ${back}.`);
      };
    });

    sessionBox.querySelectorAll('[data-swap]').forEach(btn => {
      btn.onclick = () => {
        const i = btn.dataset.swap;
        const box = sessionBox.querySelector(`[data-swap-slot="${i}"]`);
        if (box.firstChild) return box.replaceChildren(); // toggle closed

        const current = swaps[slotKey(w.id, i)] || w.exercises[i].name;
        const currentEntry = exerciseIndex().get(settingsKey(current));
        const sameGroup = currentEntry ? currentEntry.group : null;

        const groups = exercisePool(sameGroup);
        const options = [...groups.entries()].map(([g, names]) =>
          `<optgroup label="${esc(g)}${g === sameGroup ? ' — same group' : ''}">${names
            .map(n => `<option${n === current ? ' selected' : ''}>${esc(n)}</option>`)
            .join('')}</optgroup>`).join('');

        const picker = document.createElement('div');
        picker.className = 'swap-box';
        picker.innerHTML = `
          <div class="form-group">
            <label>Swap in</label>
            <select class="swap-select">${options}</select>
          </div>
          <div class="form-group">
            <label>Or type anything not listed</label>
            <input class="swap-custom" placeholder="Hammer Strength Incline" autocapitalize="words">
          </div>
          <div class="editor-actions">
            <button class="btn btn-primary btn-sm swap-ok">Swap In</button>
            <button class="btn btn-ghost btn-sm swap-cancel">Cancel</button>
          </div>`;
        box.replaceChildren(picker);

        picker.querySelector('.swap-cancel').onclick = () => box.replaceChildren();
        picker.querySelector('.swap-ok').onclick = () => {
          const custom = picker.querySelector('.swap-custom').value.trim();
          const pick = custom || picker.querySelector('.swap-select').value;
          if (!pick) return note('Pick an exercise or type one.');

          if (pick === w.exercises[i].name) delete swaps[slotKey(w.id, i)];
          else swaps[slotKey(w.id, i)] = pick;
          saveSwaps();
          renderSession();
          note(`${w.exercises[i].name} → ${pick} for today.`);
        };
      };
    });
  }

  workoutSelect.onchange = renderSession;
  renderSession();
}

/* ============================================================
   EXERCISES PAGE — reference: notes, your settings, your history
   ============================================================ */
const exerciseLibrary = document.getElementById('exercise-library');

if (exerciseLibrary) {
  const search = document.getElementById('ex-search');
  let openName = null; // only one card expanded at a time


  const bestSet = sets => sets.reduce(
    (b, s) => (b && Number(b.weight) >= Number(s.weight) ? b : s), null);

  function historyHTML(e) {
    if (!e.sets.length) {
      return `<p class="ex-note">No sets logged yet.</p>`;
    }
    const best = bestSet(e.sets);
    const recent = e.sets.slice(-15).reverse();
    return `
      <div class="ex-stats">
        <span class="setting-chip">Sets <strong>${e.sets.length}</strong></span>
        <span class="setting-chip">Best <strong>${esc(best.weight)} × ${esc(best.reps)}</strong></span>
        <span class="setting-chip">Last
          <strong>${new Date(e.sets[e.sets.length - 1].at).toLocaleDateString()}</strong></span>
      </div>
      <table class="sets-table">
        <thead><tr><th>When</th><th>Load</th><th>Workout</th></tr></thead>
        <tbody>
          ${recent.map(s => `<tr>
            <td class="set-when">${new Date(s.at).toLocaleDateString()}</td>
            <td class="set-load">${esc(s.weight)} × ${esc(s.reps)}</td>
            <td class="set-when">${s.workout ? esc(s.workout) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${e.sets.length > recent.length
        ? `<p class="ex-note">Showing the ${recent.length} most recent of ${e.sets.length}.</p>`
        : ''}`;
  }

  function renderLibrary() {
    const idx = exerciseIndex();
    const q = (search.value || '').trim().toLowerCase();

    const list = [...idx.values()].filter(e => !q || e.name.toLowerCase().includes(q));

    document.getElementById('ex-empty').hidden = list.length > 0;
    document.getElementById('ex-count').textContent =
      `${list.length} exercise${list.length === 1 ? '' : 's'}`;

    const groups = new Map();
    list.forEach(e => {
      if (!groups.has(e.group)) groups.set(e.group, []);
      groups.get(e.group).push(e);
    });
    const ordered = [...groups.keys()].sort(
      (a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99));

    exerciseLibrary.innerHTML = ordered.map(g => {
      const items = groups.get(g).sort((a, b) => a.name.localeCompare(b.name));
      return `
        <h2 class="group-heading">${esc(g)}</h2>
        ${items.map(e => {
          const open = e.name === openName;
          const notes = [...new Set(e.slots.map(s => s.notes).filter(Boolean))];
          return `
            <div class="card exercise-card">
              <div class="workout-head ex-row" data-toggle="${esc(e.name)}">
                <h3>${esc(e.name)}</h3>
                <div class="ex-head-right">
                  ${e.sets.length ? `<span class="target">${e.sets.length} set${e.sets.length === 1 ? '' : 's'}</span>` : ''}
                  <span class="chevron">${open ? '&minus;' : '+'}</span>
                </div>
              </div>
              ${open ? `
                ${notes.map(n => `<p class="ex-note">${esc(n)}</p>`).join('')}
                ${settingsChipsHTML(e.name, e.name)}
                <div class="settings-slot" data-settings-slot="${esc(e.name)}"></div>
                ${historyHTML(e)}
              ` : ''}
            </div>`;
        }).join('')}`;
    }).join('');

    exerciseLibrary.querySelectorAll('[data-toggle]').forEach(row => {
      row.onclick = () => {
        openName = openName === row.dataset.toggle ? null : row.dataset.toggle;
        renderLibrary();
      };
    });

    exerciseLibrary.querySelectorAll('[data-settings]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const name = btn.dataset.settings;
        openSettingsEditor(
          exerciseLibrary.querySelector(`[data-settings-slot="${CSS.escape(name)}"]`),
          name,
          count => {
            renderLibrary();
            note(count ? `Saved settings for ${name}.` : `Cleared settings for ${name}.`);
          }
        );
      };
    });
  }

  search.oninput = renderLibrary;
  renderLibrary();
}

/* ---- Free entry (log page) ---- */
const addBtn = document.getElementById('add');
if (addBtn) {
  addBtn.onclick = () => {
    const exercise = document.getElementById('exercise').value.trim();
    const weight = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;
    if (!exercise || !weight || !reps) return;
    log.push({ exercise, weight, reps, at: Date.now() });
    document.getElementById('weight').value = '';
    document.getElementById('reps').value = '';
    document.getElementById('exercise').focus();
    save();
    note(`Logged ${exercise} — ${weight} × ${reps}`);
  };
}

/* ---- Backup (backup page) ---- */
const exportBtn = document.getElementById('export');
if (exportBtn) {
  exportBtn.onclick = async () => {
    const name = `lift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify({ sets: log, workouts, settings: exSettings }, null, 2);
    const file = new File([text], name, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch (e) { /* cancelled */ }
      return;
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
  };
}

const importInput = document.getElementById('import-file');
if (importInput) {
  importInput.onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    let incoming;
    try {
      incoming = JSON.parse(await file.text());
    } catch {
      return note('Could not read that file. Pick a Lift backup .json file.');
    }

    // Older backups are a bare array of sets; newer ones carry workouts too.
    const sets = Array.isArray(incoming) ? incoming : incoming && incoming.sets;
    const incomingWorkouts = Array.isArray(incoming) ? [] : (incoming && incoming.workouts) || [];
    if (!Array.isArray(sets)) return note('That file is not a Lift backup.');

    const valid = sets.filter(s => s && typeof s === 'object' && s.exercise && s.at);
    const seen = new Set(log.map(s => s.at));
    const added = valid.filter(s => !seen.has(s.at));

    const haveWorkouts = new Set(workouts.map(w => w.id));
    const newWorkouts = incomingWorkouts.filter(w => w && w.id && w.label && !haveWorkouts.has(w.id));

    // Machine settings: only fill gaps, never overwrite what this phone knows.
    const incomingSettings = (!Array.isArray(incoming) && incoming && incoming.settings) || {};
    const newSettings = Object.entries(incomingSettings)
      .filter(([k, v]) => Array.isArray(v) && v.length && !exSettings[k]);

    if (!added.length && !newWorkouts.length && !newSettings.length) {
      return note('Already up to date. Nothing new to add.');
    }

    const parts = [];
    if (added.length) parts.push(`${added.length} set(s)`);
    if (newWorkouts.length) parts.push(`${newWorkouts.length} workout(s)`);
    if (newSettings.length) parts.push(`${newSettings.length} machine setting(s)`);
    if (!confirm(`Add ${parts.join(' and ')}? Nothing currently saved will be removed.`)) return;

    if (added.length) log = log.concat(added).sort((a, b) => a.at - b.at);
    if (newWorkouts.length) {
      workouts = workouts.concat(newWorkouts);
      saveWorkouts();
    }
    if (newSettings.length) {
      newSettings.forEach(([k, v]) => { exSettings[k] = v; });
      saveSettings();
    }
    save();
    note(`Imported ${parts.join(' and ')}.`);
  };
}

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
