/* Task navigation and disclosure presentation; the existing controls own state. */
(() => {
  'use strict';
  if (!document.body.classList.contains('trainer-workspace')) return;
  const byId = id => document.getElementById(id), panel = byId('panel');
  if (!panel) return;
  const paths = {
    shot: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    table: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="14" r="2"/>',
    notes: '<path d="M4 4h9M4 4v16h16v-9M10 14l2-5 7-7 3 3-7 7-5 2z"/>',
    capture: '<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/>',
    saved: '<path d="M2 6h8l2 3h10v12H2z"/>',
    options: '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
    stats: '<path d="M3 3v18h19M6 15l4-5 4 3 6-8"/>',
    rack: '<path d="M12 3L2 21h20L12 3z"/><circle cx="12" cy="10" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
    layout: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M9 10c0-4 6-4 6 0 0 2-6 2-6 5 0 4 6 4 6 0 0-3-6-3-6-5z"/>',
    marker: '<circle cx="12" cy="12" r="8"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>',
    video: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M7 4v4M17 4v4M7 16v4M17 16v4"/>',
    audio: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/>',
    files: '<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
    exchange: '<path d="M3 7h17l-5-5M21 17H4l5 5"/>',
    cue: '<circle cx="15" cy="15" r="6"/><path d="M2 2l9 9M14 15h2"/>',
    practice: '<path d="M5 3h14v18H5zM8 7h8M8 12h8M8 17h5"/>',
    calibration: '<path d="M3 5h18v14H3zM7 5v5M12 5v3M17 5v5"/>',
    physics: '<path d="M9 2h6M10 2v7L3 21h18L14 9V2M7 15h10"/>',
    line: '<path d="M3 19L21 5"/>',
    arrow: '<path d="M3 19L21 5M13 5h8v8"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    draw: '<path d="M2 17C3 3 10 4 9 12s8 10 13-7"/>',
    text: '<path d="M4 3h16M12 3v18M8 21h8"/>',
    erase: '<path d="M3 14L14 3l7 7-11 11H7zM8 9l7 7M10 21h12"/>'
  };
  function icon(key) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('aria-hidden', 'true');
    el.classList.add('menuIcon'); el.innerHTML = paths[key] || paths.layout;
    return el;
  }
  function header(el, title, key, description) {
    const label = document.createElement('span'); label.className = 'menuHeading';
    const name = document.createElement('span'); name.className = 'menuTitle'; name.textContent = title;
    label.append(name);
    if (description) { const sub = document.createElement('span'); sub.className = 'menuDescription'; sub.textContent = description; label.append(sub); }
    el.replaceChildren(icon(key), label); el.setAttribute('aria-label', title + (description ? ': ' + description : ''));
  }
  function disclosure(id, title, key, nodes, open = false) {
    const root = document.createElement('details'); root.id = id; root.className = 'toolDisclosure menuSubsection'; root.open = open;
    const summary = document.createElement('summary'); header(summary, title, key);
    const content = document.createElement('div'); content.className = 'menuContent';
    content.append(...nodes.filter(Boolean)); root.append(summary, content);
    return root;
  }
  function grid(nodes) { const el = document.createElement('div'); el.className = 'menuActionGrid'; el.append(...nodes.filter(Boolean)); return el; }
  function wrap(el, id, title, key, open = false) { const anchor = document.createComment(id); el.before(anchor); const d = disclosure(id, title, key, [el], open); anchor.replaceWith(d); return d; }
  const learning = document.createElement('div'); learning.id = 'learningSection'; learning.className = 'section';
  const learningToggle = document.createElement('button'); learningToggle.type = 'button'; learningToggle.className = 'sectionToggle';
  learningToggle.setAttribute('aria-controls', 'learningBody'); learningToggle.setAttribute('aria-expanded', 'false');
  const learningBody = document.createElement('div'); learningBody.id = 'learningBody'; learningBody.className = 'sectionBody';
  learning.append(learningToggle, learningBody); panel.append(learning);
  const menus = [
    ['shot', 'Shot', 'shot', 'Aim · Spin · Live Results'],
    ['liveStats', 'Live Shot', 'stats', ''],
    ['table', 'Table & Balls', 'table', 'Racks · Ball Placement · Targets'],
    ['learning', 'Learning', 'practice', ''],
    ['draw', 'Table Notes', 'notes', 'Lines · Shapes · Written Notes'],
    ['capture', 'Capture', 'capture', 'Photos · Video · Audio'],
    ['saved', 'Saved', 'saved', 'Ball Layouts · Files · Sharing'],
    ['options', 'Features & Options', 'options', 'Table · Cue · Aiming · Physics']
  ];
  const anchor = document.createComment('Task order'); byId('tableSection').before(anchor);
  for (const [id, title, key, description] of menus) {
    const section = byId(id + 'Section'); section.dataset.menuTask = id;
    const heading = section.querySelector(':scope > .sectionToggle');
    const label = document.createElement('span'); label.className = 'menuTitle'; label.textContent = title;
    heading.replaceChildren(label); heading.setAttribute('aria-label', title);
    anchor.before(section);
  }
  anchor.remove();

  // Table construction uses the same disclosure level for every task.
  const groups = [...byId('tableBody').children];
  const tableTitles = [['menuFullRacks', 'Pick & Play Full Racks', 'rack'], ['menuLayoutSetup', 'Layout Setup', 'layout'], ['menuSingleBall', 'Add a Single Ball', 'ball']];
  tableTitles.forEach(([id, title, key], i) => { groups[i].querySelector('.tableControlTitle')?.remove(); wrap(groups[i], id, title, key); });
  // The first three wrappers are new; find the original markers disclosure by its contents.
  const markerRoot = byId('markerZoneControls').closest('details');
  markerRoot.id = 'menuMarkers'; markerRoot.classList.add('menuSubsection');
  header(markerRoot.querySelector('summary'), 'Markers & Targets', 'marker');
  markerRoot.querySelector('.tableControlTitle')?.remove();

  // Results stay beside aiming. Their existing IDs, observers and expand controls are retained.
  const stats = byId('liveStatsSection');
  stats.querySelector(':scope > .sectionToggle').dataset.guideTopic = 'main-panel-live-stats';
  stats.querySelector('.liveStatsIntro')?.remove();
  for (const body of stats.querySelectorAll('.shotStatsBody')) {
    const nodes = [...body.children], grouped = []; let current;
    for (const node of nodes) {
      if (node.classList.contains('statsGroupTitle')) {
        const title = node.textContent.trim();
        current = disclosure(body.id + '-' + grouped.length, title, grouped.length === 0 ? 'shot' : grouped.length === 1 ? 'cue' : 'stats', [], grouped.length === 0);
        current.classList.add('menuMetricGroup'); grouped.push(current);
      } else current?.querySelector('.menuContent').append(node);
    }
    body.replaceChildren(...grouped);
  }

  // Notes use restrained tool samples rather than the ambiguous Draw heading.
  byId('trainerAnnotateGroup').querySelector('.tableControlTitle')?.remove();
  for (const button of panel.querySelectorAll('[data-annotate-tool]')) {
    const tool = button.dataset.annotateTool, name = tool === 'draw' ? 'Freehand' : button.textContent;
    button.replaceChildren(icon(tool), document.createTextNode(name));
  }

  // Framing choices precede the photo action; video and audio are distinct groups.
  const photo = byId('trainerPhotoControls'); photo.querySelector('.tableControlTitle')?.remove();
  const photoAction = byId('trainerAnnotateSnapshot');
  photoAction.textContent = 'Save Snapshot';
  byId('trainerSnapshotGroup').after(grid([photoAction, byId('trainerSnapshotFolder')]));
  wrap(photo, 'menuPhoto', 'Photo / Snapshot', 'capture');
  const clip = byId('trainerClipTools'); byId('trainerClipTitle').hidden = true;
  const [shotVideo, sessionVideo, cameraAudio] = [...clip.querySelectorAll(':scope > details')];
  for (const [root, id, title, key] of [[shotVideo, 'menuRecordShot', 'Record a Shot', 'video'], [sessionVideo, 'menuRecordSession', 'Record a Session', 'files']]) {
    root.id = id; root.classList.add('menuSubsection'); root.open = false;
    header(root.querySelector('summary'), title, key);
  }
  cameraAudio.remove();
  const camera = disclosure('menuCamera', 'Camera Recording', 'capture', [grid([byId('trainerCameraToggle') || cameraAudio.querySelector('#trainerCameraToggle')])]);
  const narrate = cameraAudio.querySelector('#trainerNarrateVideo');
  const audio = disclosure('menuAudio', 'Audio & Narration', 'audio', [disclosure('menuNarration', 'Narrate a Video', 'audio', [grid([narrate])])]);
  const nameLabel = clip.querySelector('label[for=trainerClipName]');
  const folderRow = byId('trainerClipFolder').parentElement;
  const video = disclosure('menuVideo', 'Video Recording', 'video', [nameLabel, byId('trainerClipName'), shotVideo, sessionVideo, camera, folderRow, byId('trainerClipStatus')]);
  clip.append(video, audio);

  // Existing device collections and file actions keep their state and handlers.
  const layouts = byId('savedBody').querySelector('.layoutManage');
  const counter = byId('layoutCount'); layouts.querySelector('.layoutManageTitle')?.remove();
  const layoutName = document.createElement('label'); layoutName.htmlFor = 'layoutNameInput'; layoutName.textContent = 'Layout name';
  byId('saveLayoutBtn').textContent = 'Save Layout'; byId('loadLayoutBtn').textContent = 'Recall Layout';
  const layoutSection = disclosure('menuSavedLayouts', 'Saved Ball Layouts', 'table', [layoutName, byId('layoutNameInput'), byId('layoutSelect'), grid(['saveLayoutBtn', 'loadLayoutBtn', 'layoutShareSelected', 'layoutShareCurrent'].map(byId))]);
  counter.classList.add('menuCount'); layoutSection.querySelector('summary').append(counter);
  const library = layouts.querySelector('.bt-file-library');
  if (library) {
    const label = library.querySelector('label');
    if (label?.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = 'Choose a file';
  }
  const savedFiles = disclosure('menuSavedFiles', 'Saved Files on This Device', 'files', [library]);
  const fileActions = disclosure('menuFileActions', 'Import, Export & Auto-save', 'exchange', [grid(['trainerLoadFile', 'trainerSaveFile', 'trainerSaveSession', 'sessionFolder'].map(byId)), byId('sessionFolderStatus'), byId('trainerLayoutFileInput')]);
  layouts.replaceChildren(layoutSection, savedFiles, fileActions);

  // Feature groups and Calibration/Advanced Physics are peers.
  for (const [id, title, key] of [['featureTableOptions', 'Table Display', 'table'], ['featureCueOptions', 'Cue & Training Ball', 'cue'], ['featureAimingOptions', 'Aiming Guides & Tools', 'shot'], ['featureOtherOptions', 'Practice', 'practice']]) wrap(byId(id), 'menu-' + id, title, key);
  const calibration = byId('calibrationSection'); calibration.classList.add('menuSubsection');
  header(calibration.querySelector(':scope > .sectionToggle'), 'Calibration', 'calibration');
  const advanced = byId('physicsAdvanced');
  const physics = disclosure('menuPhysics', 'Advanced Physics', 'physics', [advanced]);
  advanced.classList.add('menuPhysicsFields'); advanced.classList.remove('advancedBody');
  panel.querySelector('[data-advanced=physicsAdvanced]')?.remove();
  byId('optionsBody').append(physics);
  const appInfo = byId('trainerAppInfo');
  appInfo.classList.add('menuSubsection', 'menuInfo');
  header(appInfo, 'App Info', 'files');
  byId('optionsBody').append(appInfo);

  // Retain detailed reference text on demand and show concise, readable guidance.
  for (const el of panel.querySelectorAll('.hint')) {
    if (!el.textContent.trim() || el.hasAttribute('role') || el.id.endsWith('Status')) continue;
    if (advanced.contains(el)) { const ref = disclosure('menuPhysicsReference', 'Physics Reference', 'files', [el]); advanced.append(ref); continue; }
    const text = el.textContent.trim(); el.title = text;
    if (text.includes('Lock annotations')) el.textContent = 'Unlock to write · Lock to aim';
    else if (text.includes('Tap a label to edit')) el.textContent = 'Tap to edit · Drag to move';
    else if (text.includes('Drag the center')) el.textContent = 'Drag a target to move it.';
    else if (text.includes('Files saved or added')) el.textContent = 'Stored on this device · Export to share';
    else if (text.includes('Drag the ball to rotate')) el.textContent = 'Drag to rotate · Ring = cue-tip contact';
  }
  if (byId('sessionFolderStatus').textContent.startsWith('Saved layouts')) byId('sessionFolderStatus').textContent = 'Stored on this device · Export to share';
  const title = panel.querySelector('h1');
  title.querySelector('.editionSub').textContent = 'AI Edition';
  const headerActions = document.createElement('div'); headerActions.id = 'menuHeaderActions'; headerActions.dataset.btgAllow='1';
  headerActions.append(byId('btg-pool-launchers'), byId('trainerUpdateRow')); title.parentElement.append(headerActions);
  function openShot() {
    const section = byId('shotSection');
    if (!section.classList.contains('open')) section.querySelector(':scope > .sectionToggle').click();
    panel.scrollTop = 0;
    window.dispatchEvent(new Event('resize'));
  }
  byId('phoneControls').addEventListener('click', () => {
    if (document.body.classList.contains('phone-controls-open')) openShot();
    window.dispatchEvent(new Event('resize'));
  });
  for (const details of panel.querySelectorAll('details')) details.addEventListener('toggle', () => window.dispatchEvent(new Event('resize')));
  openShot();
  window.billiardsMenuReady = true;
})();
