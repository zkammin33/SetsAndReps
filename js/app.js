const KEY = 'lift-log-v1';
let log = JSON.parse(localStorage.getItem(KEY) || '[]');

function save() {
  localStorage.setItem(KEY, JSON.stringify(log));
  render();
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
      <td><strong>${s.exercise}</strong></td>
      <td class="set-load">${s.weight} &times; ${s.reps}</td>
      <td class="set-when">${new Date(s.at).toLocaleString()}</td>
    </tr>`)
    .join('');
}

/* ---- Log a Set (log page) ---- */
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

/* ---- Shared status line ---- */
const note = m => {
  const el = document.getElementById('note');
  if (el) el.innerHTML = `<small>${m}</small>`;
};

/* ---- Backup (backup page) ---- */
const exportBtn = document.getElementById('export');
if (exportBtn) {
  exportBtn.onclick = async () => {
    const name = `lift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(log, null, 2);
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
    if (!Array.isArray(incoming)) return note('That file is not a Lift backup.');

    const valid = incoming.filter(s => s && typeof s === 'object' && s.exercise && s.at);
    if (!valid.length) return note('No sets found in that file.');

    const seen = new Set(log.map(s => s.at));
    const added = valid.filter(s => !seen.has(s.at));
    if (!added.length) return note('Already up to date. Nothing new to add.');

    if (!confirm(`Add ${added.length} set(s)? Nothing currently in your log will be removed.`)) return;
    log = log.concat(added).sort((a, b) => a.at - b.at);
    save();
    note(`Imported ${added.length} set(s).`);
  };
}

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
