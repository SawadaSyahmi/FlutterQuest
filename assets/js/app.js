const tutorials = window.TUTORIALS || [];
const grid = document.getElementById('tutorialGrid');
const dialog = document.getElementById('tutorialDialog');
const dialogContent = document.getElementById('dialogContent');
const activityCount = document.getElementById('activityCount');
const questCount = document.getElementById('questCount');
const progressBar = document.getElementById('progressBar');
const rankText = document.getElementById('rankText');
const resetLocalBtn = document.getElementById('resetLocalBtn');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');
const randomMissionBtn = document.getElementById('randomMissionBtn');
const joinForm = document.getElementById('joinForm');
const playerPanel = document.getElementById('playerPanel');
const playerNameInput = document.getElementById('playerNameInput');
const studentIdInput = document.getElementById('studentIdInput');
const currentPlayerName = document.getElementById('currentPlayerName');
const currentStudentId = document.getElementById('currentStudentId');
const backendStatus = document.getElementById('backendStatus');
const leaderboardBody = document.getElementById('leaderboardBody');

const SUPABASE_CONFIG = window.FLUTTER_QUEST_SUPABASE || {};
const isConfigured =
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.anonKey &&
  !SUPABASE_CONFIG.url.includes('PASTE_') &&
  !SUPABASE_CONFIG.anonKey.includes('PASTE_');
const supabaseClient = isConfigured
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;
const BUCKET_NAME = 'tutorial-proofs';

let state = {
  player: null,
  progress: {},
  levelReleases: {},
};

const dartKeywords = new Set([
  'abstract',
  'async',
  'await',
  'break',
  'case',
  'class',
  'const',
  'continue',
  'default',
  'dynamic',
  'else',
  'enum',
  'extends',
  'false',
  'final',
  'for',
  'if',
  'implements',
  'import',
  'in',
  'mixin',
  'new',
  'null',
  'override',
  'required',
  'return',
  'super',
  'switch',
  'this',
  'true',
  'var',
  'void',
  'while',
  'with',
]);

const dartTypes = new Set([
  'bool',
  'BuildContext',
  'Color',
  'double',
  'Duration',
  'Future',
  'int',
  'List',
  'Map',
  'Set',
  'State',
  'StatefulWidget',
  'StatelessWidget',
  'String',
  'Widget',
]);

const flutterWidgets = new Set([
  'AppBar',
  'Center',
  'ChangeNotifierProvider',
  'CircleAvatar',
  'CircularProgressIndicator',
  'Column',
  'Consumer',
  'Divider',
  'Drawer',
  'DrawerHeader',
  'ElevatedButton',
  'FloatingActionButton',
  'FutureBuilder',
  'Icon',
  'ListTile',
  'ListView',
  'MaterialApp',
  'MultiProvider',
  'Provider',
  'Row',
  'Scaffold',
  'Selector',
  'Slider',
  'SnackBar',
  'SwitchListTile',
  'Text',
]);

const dartMethods = new Set([
  'builder',
  'changeTitle',
  'debugPrint',
  'fetchStudents',
  'getStudents',
  'jsonDecode',
  'jsonEncode',
  'map',
  'notifyListeners',
  'pop',
  'print',
  'push',
  'runApp',
  'setState',
  'showSnackBar',
  'toList',
  'toggleDarkMode',
]);


function defaultLevelRelease(tutorialId) {
  const released = Number(tutorialId) === 1;

  return {
    tutorial_id: tutorialId,
    is_released: released,
    release_label: released ? 'Released' : 'Locked by lecturer',
  };
}

function getLevelRelease(tutorialId) {
  return state.levelReleases[tutorialId] || defaultLevelRelease(tutorialId);
}

function isLevelReleased(tutorialId) {
  return Boolean(getLevelRelease(tutorialId).is_released);
}

function levelReleaseText(tutorialId) {
  const release = getLevelRelease(tutorialId);
  return release.release_label || (release.is_released ? 'Released' : 'Locked by lecturer');
}

function releasedTutorials() {
  return tutorials.filter((tutorial) => isLevelReleased(tutorial.id));
}

function getProgress(id) {
  return (
    state.progress[id] || {
      activity_completed: false,
      activity_proof_url: '',
      activity_proof_path: '',
      quest_completed: false,
      quest_proof_url: '',
      quest_proof_path: '',
    }
  );
}

function localKey() {
  return state.player
    ? `flutterQuestTwoUploads_${state.player.id}`
    : 'flutterQuestTwoUploadsNoPlayer';
}

function saveLocalFallback() {
  localStorage.setItem(localKey(), JSON.stringify({ progress: state.progress }));
}

function loadLocalFallback() {
  const saved = JSON.parse(localStorage.getItem(localKey()) || '{}');
  state.progress = saved.progress || {};
}

function totalActivityUploads() {
  return tutorials.filter((tutorial) => getProgress(tutorial.id).activity_completed).length;
}

function totalQuestUploads() {
  return tutorials.filter((tutorial) => getProgress(tutorial.id).quest_completed).length;
}

function totalScore() {
  return totalActivityUploads() * 60 + totalQuestUploads() * 40;
}

function rankName(percent) {
  if (percent >= 100) return 'Rank: Flutter Quest Champion 🏆';
  if (percent >= 75) return 'Rank: Tutorial Finisher 🔥';
  if (percent >= 50) return 'Rank: Activity Hero ⚔️';
  if (percent >= 25) return 'Rank: Quest Explorer 🧭';
  return 'Rank: Tutorial Rookie 🌱';
}

function renderPlayer() {
  if (!state.player) {
    joinForm.classList.remove('hidden');
    playerPanel.classList.add('hidden');
    return;
  }

  joinForm.classList.add('hidden');
  playerPanel.classList.remove('hidden');
  currentPlayerName.textContent = `Player: ${state.player.player_name}`;
  const studentId = state.player.student_id || state.player.group_name || '';
  currentStudentId.textContent = studentId
    ? `Student ID: ${studentId}`
    : 'Student ID: Not provided';
}

function renderStats() {
  const releasedCount = releasedTutorials().length;
  const maxUploads = Math.max(releasedCount * 2, 1);
  const completedUploads = totalActivityUploads() + totalQuestUploads();
  const percent = Math.min(100, Math.round((completedUploads / maxUploads) * 100));

  activityCount.textContent = totalActivityUploads();
  questCount.textContent = totalQuestUploads();
  progressBar.style.width = `${percent}%`;
  rankText.textContent = `${rankName(percent)} · Score: ${totalScore()}`;
}

function renderGrid() {
  grid.innerHTML = tutorials
    .map((tutorial) => {
      const progress = getProgress(tutorial.id);
      const complete = progress.activity_completed && progress.quest_completed;
      const released = isLevelReleased(tutorial.id);

      return `
        <article class="tutorial-card ${complete ? 'complete' : ''} ${released ? '' : 'locked'}">
          <div>
            <div class="level-mark">
              <div class="emoji">${tutorial.emoji}</div>
              <div class="level-no">${String(tutorial.id).padStart(2, '0')}</div>
            </div>
            <p class="eyebrow">${tutorial.world}</p>
            <h3>${escapeHtml(tutorial.title)}</h3>
            <p>${escapeHtml(tutorial.theme)}</p>
            <div class="pills">
              <span class="pill">${tutorial.activities.length} Activities</span>
              <span class="pill quest">${tutorial.quests.length} Quest Tasks</span>
              <span class="pill release ${released ? 'unlocked' : 'locked'}">
                ${released ? 'Released ✓' : 'Locked 🔒'}
              </span>
              <span class="pill activity">
                ${progress.activity_completed ? 'Activity Uploaded ✓' : 'Activity Upload Pending'}
              </span>
              <span class="pill quest">
                ${progress.quest_completed ? 'Quest Uploaded ✓' : 'Quest Upload Pending'}
              </span>
            </div>
          </div>
          <div class="card-actions">
            <button class="open-btn" ${released ? `onclick="openTutorial(${tutorial.id})"` : 'disabled'}>
              ${released ? 'Enter Level' : 'Locked'}
            </button>
            <div class="level-status ${!released ? 'locked' : complete ? 'done' : ''}">
              ${!released ? levelReleaseText(tutorial.id) : complete ? 'Level Completed ✓' : 'Two uploads needed'}
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  renderPlayer();
  renderStats();
}

function getActivityLanguage(code) {
  const source = String(code).trim();
  const terminalCommands = ['flutter ', 'cd ', 'code ', 'git ', 'mkdir ', 'npm ', 'node ', 'dart '];

  if (terminalCommands.some((command) => source.startsWith(command)) || source.includes('flutter run')) {
    return 'Terminal';
  }

  return 'Dart / Flutter';
}

function renderCodeBlock(code, elementId, languageLabel) {
  const displayCode = languageLabel === 'Terminal' ? String(code).trim() : formatDartCode(code);
  const lines = displayCode.replace(/\n$/u, '').split('\n');
  const rows = lines
    .map(
      (line, index) => `
        <tr class="code-row">
          <td class="line-no">${index + 1}</td>
          <td class="line-code">${highlightCodeLine(line)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <div class="code-card">
      <div class="code-toolbar">
        <div class="code-title">
          <span class="code-dot"></span>
          <span class="code-language">${escapeHtml(languageLabel)}</span>
        </div>
        <div class="code-actions">
          <button class="copy-btn" onclick="copyCodeById('${elementId}')">Copy Code</button>
        </div>
      </div>
      <div class="code-scroll">
        <table class="code-table" aria-label="Activity code">
          <tbody id="${elementId}" data-raw-code="${encodeURIComponent(displayCode)}">${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function formatDartCode(code) {
  const source = String(code).replace(/\r\n/g, '\n').trim();
  const lines = source.split('\n');
  const formatted = [];
  let indent = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      formatted.push('');
      continue;
    }

    const safeLine = removeStringsAndComments(trimmed);
    const leadingClosers = countLeadingClosers(safeLine.trimStart());
    const counts = countBrackets(safeLine);

    indent = Math.max(0, indent - leadingClosers);
    formatted.push(`${'  '.repeat(indent)}${trimmed}`);
    indent = Math.max(0, indent + counts.open - (counts.close - leadingClosers));
  }

  return formatted.join('\n');
}

function removeStringsAndComments(line) {
  let result = '';
  let quote = null;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (!quote && char === '/' && next === '/') {
      break;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      result += ' ';
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      result += ' ';
      continue;
    }

    result += char;
  }

  return result;
}

function countLeadingClosers(line) {
  let count = 0;

  for (const char of line) {
    if (char === '}' || char === ')' || char === ']') {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}

function countBrackets(line) {
  let open = 0;
  let close = 0;

  for (const char of line) {
    if (char === '{' || char === '(' || char === '[') open += 1;
    if (char === '}' || char === ')' || char === ']') close += 1;
  }

  return { open, close };
}

function highlightCodeLine(line) {
  let output = '';
  let index = 0;

  while (index < line.length) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '/' && next === '/') {
      output += `<span class="tok-comment">${escapeHtml(line.slice(index))}</span>`;
      break;
    }

    if (char === "'" || char === '"') {
      const token = readStringToken(line, index, char);
      output += `<span class="tok-string">${escapeHtml(token.value)}</span>`;
      index = token.end;
      continue;
    }

    if (/\d/u.test(char)) {
      const match = line.slice(index).match(/^\d+(\.\d+)?/u);
      if (match) {
        output += `<span class="tok-number">${escapeHtml(match[0])}</span>`;
        index += match[0].length;
        continue;
      }
    }

    if (/[A-Za-z_$]/u.test(char)) {
      const match = line.slice(index).match(/^[A-Za-z_$][A-Za-z0-9_$]*/u);
      if (match) {
        output += highlightIdentifier(match[0]);
        index += match[0].length;
        continue;
      }
    }

    output += escapeHtml(char);
    index += 1;
  }

  return output || '&nbsp;';
}

function readStringToken(line, start, quote) {
  let index = start + 1;
  let escaped = false;

  while (index < line.length) {
    const char = line[index];

    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === quote) {
      index += 1;
      break;
    }

    index += 1;
  }

  return {
    value: line.slice(start, index),
    end: index,
  };
}

function highlightIdentifier(identifier) {
  const className = getTokenClass(identifier.replace(/^\$/u, ''));
  const text = escapeHtml(identifier);

  return className ? `<span class="${className}">${text}</span>` : text;
}

function getTokenClass(identifier) {
  if (dartKeywords.has(identifier)) return 'tok-keyword';
  if (dartTypes.has(identifier)) return 'tok-type';
  if (flutterWidgets.has(identifier)) return 'tok-widget';
  if (dartMethods.has(identifier)) return 'tok-method';
  return '';
}

window.copyCodeById = async function copyCodeById(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const code = decodeURIComponent(element.dataset.rawCode || '');

  try {
    await navigator.clipboard.writeText(code);
    showToast('Code copied!');
  } catch {
    showToast('Could not copy. Select the code manually.');
  }
};

window.openTutorial = function openTutorial(id) {
  if (!state.player) {
    showToast('Join the game first.');
    document.querySelector('.status-card').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (!isLevelReleased(id)) {
    showToast('This level is still locked by your lecturer.');
    return;
  }

  const tutorial = tutorials.find((item) => item.id === id);
  if (!tutorial) return;

  const progress = getProgress(id);
  const questUnlocked = progress.activity_completed;
  const activityProof = progress.activity_proof_url
    ? proofBlock(progress.activity_proof_url, 'Activity proof')
    : '<span class="muted">No activity proof uploaded yet.</span>';
  const questProof = progress.quest_proof_url
    ? proofBlock(progress.quest_proof_url, 'Quest proof')
    : '<span class="muted">No quest proof uploaded yet.</span>';

  dialogContent.innerHTML = `
    <div class="dialog-wrap">
      <div class="dialog-top">
        <div>
          <p class="eyebrow">Tutorial ${tutorial.id} · ${tutorial.world}</p>
          <h2>${tutorial.emoji} ${escapeHtml(tutorial.title)}</h2>
          <p>${escapeHtml(tutorial.theme)}</p>
        </div>
        <button class="close-btn" onclick="closeTutorial()">×</button>
      </div>

      <section class="activity-panel">
        <p class="eyebrow">Activity Path</p>
        <h3>Clear the tutorial path step by step</h3>
        <p class="muted">Open each activity, copy the formatted code, run it, then move to the next checkpoint.</p>
        <div class="timeline">
          ${tutorial.activities
            .map(
              (activity, index) => `
                <div class="activity-item ${index === 0 ? 'open' : ''}" id="activity-${tutorial.id}-${index}">
                  <button class="activity-head" onclick="toggleActivity(${tutorial.id}, ${index})">
                    <span>${escapeHtml(activity.title)}</span>
                    <span>▼</span>
                  </button>
                  <div class="activity-body">
                    ${renderCodeBlock(activity.code, `code-${tutorial.id}-${index}`, getActivityLanguage(activity.code))}
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="upload-panel activity-upload">
        <p class="eyebrow">Upload 1 of 2</p>
        <h3>Activity Completion Proof</h3>
        <p class="muted">After completing all step-by-step activities, upload one screenshot or image as proof.</p>
        <div class="upload-row">
          <input class="file-input" type="file" id="activity-file-${tutorial.id}" accept="image/*" onchange="uploadTutorialProof(${tutorial.id}, 'activity')">
          <button class="proof-btn" onclick="document.getElementById('activity-file-${tutorial.id}').click()">Upload Activity Proof</button>
          ${activityProof}
        </div>
      </section>

      <section class="quest-panel">
        <p class="eyebrow">Boss Quest</p>
        <h3>${escapeHtml(tutorial.questTitle)}</h3>
        <p class="muted">These are the extra activities. Complete them after the main activity path.</p>
        <ul class="quest-list">
          ${tutorial.quests
            .map((quest, index) => `<li><strong>Quest Task ${index + 1}:</strong> ${escapeHtml(quest)}</li>`)
            .join('')}
        </ul>
        <div class="lock-note ${questUnlocked ? 'unlocked' : ''}">
          ${
            questUnlocked
              ? '✅ Boss Quest unlocked. Complete the quest tasks and upload one proof.'
              : '🔒 Upload Activity Proof first to unlock the Boss Quest upload.'
          }
        </div>
        <div class="upload-row">
          <input class="file-input" type="file" id="quest-file-${tutorial.id}" accept="image/*" onchange="uploadTutorialProof(${tutorial.id}, 'quest')" ${questUnlocked ? '' : 'disabled'}>
          <button class="proof-btn" ${questUnlocked ? '' : 'disabled'} onclick="document.getElementById('quest-file-${tutorial.id}').click()">Upload Boss Quest Proof</button>
          ${questProof}
        </div>
      </section>
    </div>
  `;

  dialog.showModal();
};

function proofBlock(url, label) {
  return `<a class="proof-link" href="${url}" target="_blank">View ${label}</a><img class="proof-preview" src="${url}" alt="${label}">`;
}

window.closeTutorial = function closeTutorial() {
  dialog.close();
};

window.toggleActivity = function toggleActivity(tutorialId, index) {
  document.getElementById(`activity-${tutorialId}-${index}`).classList.toggle('open');
};

window.copyActivityCode = async function copyActivityCode(tutorialId, index) {
  const tutorial = tutorials.find((item) => item.id === tutorialId);
  const activity = tutorial?.activities[index];
  if (!activity) return;

  const language = getActivityLanguage(activity.code);
  const code = language === 'Terminal' ? String(activity.code).trim() : formatDartCode(activity.code);

  try {
    await navigator.clipboard.writeText(code);
    showToast('Activity code copied!');
  } catch {
    showToast('Could not copy. Select the code manually.');
  }
};

async function uploadFileToStorage(file, tutorialId, type) {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const extension = safeFileName.includes('.') ? safeFileName.split('.').pop() : 'png';
  const path = `${state.player.id}/tutorial-${tutorialId}/${type}-${Date.now()}.${extension}`;

  if (!supabaseClient) {
    return {
      path: `local/${path}`,
      url: await fileToDataUrl(file),
    };
  }

  const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/png',
  });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.uploadTutorialProof = async function uploadTutorialProof(tutorialId, type) {
  if (!isLevelReleased(tutorialId)) {
    showToast('This level is still locked by your lecturer.');
    return;
  }

  const input = document.getElementById(`${type}-file-${tutorialId}`);
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image too large. Keep it below 5MB.');
    return;
  }

  showToast('Uploading proof...');

  try {
    const uploaded = await uploadFileToStorage(file, tutorialId, type);
    const progress = getProgress(tutorialId);

    if (type === 'activity') {
      progress.activity_completed = true;
      progress.activity_proof_path = uploaded.path;
      progress.activity_proof_url = uploaded.url;
    } else {
      if (!progress.activity_completed) {
        showToast('Upload activity proof first.');
        return;
      }

      progress.quest_completed = true;
      progress.quest_proof_path = uploaded.path;
      progress.quest_proof_url = uploaded.url;
    }

    state.progress[tutorialId] = progress;
    await saveProgressToBackend(tutorialId, progress);

    showToast(type === 'activity' ? 'Activity proof uploaded. Boss Quest unlocked!' : 'Boss Quest proof uploaded. Level completed!');
    if (type === 'quest') confetti();

    openTutorial(tutorialId);
    renderGrid();
    loadLeaderboard();
  } catch (error) {
    console.error(error);
    showToast('Upload failed. Check Supabase Storage setup.');
  }
};

async function saveProgressToBackend(tutorialId, progress) {
  if (!supabaseClient || !state.player) {
    saveLocalFallback();
    return;
  }

  const { error } = await supabaseClient.from('tutorial_progress').upsert(
    {
      player_id: state.player.id,
      tutorial_id: tutorialId,
      activity_completed: progress.activity_completed,
      activity_proof_path: progress.activity_proof_path,
      activity_proof_url: progress.activity_proof_url,
      activity_uploaded_at: progress.activity_completed ? new Date().toISOString() : null,
      quest_completed: progress.quest_completed,
      quest_proof_path: progress.quest_proof_path,
      quest_proof_url: progress.quest_proof_url,
      quest_uploaded_at: progress.quest_completed ? new Date().toISOString() : null,
    },
    { onConflict: 'player_id,tutorial_id' },
  );

  if (error) {
    console.error(error);
    showToast('Could not save progress to Supabase.');
    saveLocalFallback();
  }
}

async function createPlayer(name, studentId) {
  if (!supabaseClient) {
    const player = {
      id: crypto.randomUUID(),
      player_name: name,
      student_id: studentId || '',
    };

    localStorage.setItem('flutterQuestCurrentPlayer', JSON.stringify(player));
    state.player = player;
    loadLocalFallback();
    backendStatus.textContent = 'Offline mode: Supabase is not configured.';
    backendStatus.className = 'backend-status offline';
    return;
  }

  const { data, error } = await supabaseClient
    .from('players')
    .insert({ player_name: name, student_id: studentId || '' })
    .select()
    .single();

  if (error) {
    console.error(error);
    showToast('Could not create player. Check Supabase setup.');
    return;
  }

  localStorage.setItem('flutterQuestCurrentPlayer', JSON.stringify(data));
  state.player = data;
  await loadProgressFromBackend();
}


async function loadLevelReleases() {
  state.levelReleases = {};

  const applyDefaultReleases = () => {
    tutorials.forEach((tutorial) => {
      state.levelReleases[tutorial.id] = defaultLevelRelease(tutorial.id);
    });
  };

  if (!supabaseClient) {
    applyDefaultReleases();
    return;
  }

  const { data, error } = await supabaseClient
    .from('level_releases')
    .select('tutorial_id,is_released,release_label,released_at')
    .order('tutorial_id', { ascending: true });

  if (error) {
    console.error(error);
    showToast('Could not load level release flags. Defaulting to Level 1 only.');
    applyDefaultReleases();
    return;
  }

  applyDefaultReleases();
  (data || []).forEach((row) => {
    state.levelReleases[row.tutorial_id] = {
      tutorial_id: row.tutorial_id,
      is_released: row.is_released,
      release_label: row.release_label || (row.is_released ? 'Released' : 'Locked by lecturer'),
      released_at: row.released_at || null,
    };
  });
}

async function loadProgressFromBackend() {
  state.progress = {};

  if (!supabaseClient || !state.player) {
    loadLocalFallback();
    return;
  }

  const { data, error } = await supabaseClient
    .from('tutorial_progress')
    .select('*')
    .eq('player_id', state.player.id);

  if (error) {
    console.error(error);
    showToast('Could not load progress.');
    loadLocalFallback();
    return;
  }

  (data || []).forEach((row) => {
    state.progress[row.tutorial_id] = {
      activity_completed: row.activity_completed,
      activity_proof_url: row.activity_proof_url || '',
      activity_proof_path: row.activity_proof_path || '',
      quest_completed: row.quest_completed,
      quest_proof_url: row.quest_proof_url || '',
      quest_proof_path: row.quest_proof_path || '',
    };
  });
}

async function loadLeaderboard() {
  if (!supabaseClient) {
    leaderboardBody.innerHTML = '<tr><td colspan="6">Supabase not configured. Leaderboard disabled.</td></tr>';
    return;
  }

  const [{ data: players, error: playersError }, { data: progress, error: progressError }] = await Promise.all([
    supabaseClient.from('players').select('*').order('created_at', { ascending: true }),
    supabaseClient.from('tutorial_progress').select('*'),
  ]);

  if (playersError || progressError) {
    leaderboardBody.innerHTML = '<tr><td colspan="6">Could not load leaderboard. Check RLS policies.</td></tr>';
    return;
  }

  const rows = (players || [])
    .map((player) => {
      const records = (progress || []).filter((item) => item.player_id === player.id);
      const activities = records.filter((item) => item.activity_completed).length;
      const quests = records.filter((item) => item.quest_completed).length;

      return {
        player,
        activities,
        quests,
        score: activities * 60 + quests * 40,
      };
    })
    .sort((a, b) => b.score - a.score || b.quests - a.quests || b.activities - a.activities);

  leaderboardBody.innerHTML = rows.length
    ? rows
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.player.player_name)}</td>
              <td>${escapeHtml(row.player.student_id || row.player.group_name || 'Not provided')}</td>
              <td>${row.activities}</td>
              <td>${row.quests}</td>
              <td>${row.score}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="6">No players yet.</td></tr>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1700);
}

function confetti() {
  const colors = ['#38bdf8', '#c084fc', '#fb7185', '#34d399', '#facc15'];

  for (let i = 0; i < 34; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 220}ms`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1300);
  }
}

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = playerNameInput.value.trim();
  const studentId = studentIdInput.value.trim();
  if (!name || !studentId) return;

  await createPlayer(name, studentId);
  renderGrid();
  loadLeaderboard();
  showToast('Welcome to Flutter Quest Academy!');
});

resetLocalBtn.addEventListener('click', () => {
  if (!confirm('Logout from this browser? Supabase data will remain.')) return;

  localStorage.removeItem('flutterQuestCurrentPlayer');
  state = {
    player: null,
    progress: {},
    levelReleases: state.levelReleases,
  };
  renderGrid();
  showToast('Logged out.');
});

refreshBtn.addEventListener('click', async () => {
  await loadLevelReleases();
  await loadProgressFromBackend();
  renderGrid();
  loadLeaderboard();
  showToast('Refreshed!');
});

randomMissionBtn.addEventListener('click', () => {
  const availableTutorials = releasedTutorials();

  if (!availableTutorials.length) {
    showToast('No levels are released yet.');
    return;
  }

  const tutorial = availableTutorials[Math.floor(Math.random() * availableTutorials.length)];
  openTutorial(tutorial.id);
});

dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (outside) dialog.close();
});

async function init() {
  if (isConfigured) {
    backendStatus.textContent = 'Online mode: Supabase connected.';
    backendStatus.className = 'backend-status online';
  } else {
    backendStatus.textContent = 'Offline mode: paste Supabase URL and anon key in assets/js/config.js. Level 1 is open for local testing.';
    backendStatus.className = 'backend-status offline';
  }

  await loadLevelReleases();

  const savedPlayer = JSON.parse(localStorage.getItem('flutterQuestCurrentPlayer') || 'null');
  if (savedPlayer) {
    state.player = savedPlayer;
    await loadProgressFromBackend();
  }

  renderGrid();
  loadLeaderboard();
}

init();
