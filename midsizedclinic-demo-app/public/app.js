(() => {
  const patientIdEl = document.getElementById('patientId');
  const patientSearchEl = document.getElementById('patientSearch');
  const suggestionsEl = document.getElementById('patientSuggestions');
  const chartTabsEl = document.getElementById('chartTabs');
  const roleEl = document.getElementById('role');
  const loadBtn = document.getElementById('loadBtn');
  const metaEl = document.getElementById('meta');
  const bodyEl = document.getElementById('studiesBody');
  const sqlStatusEl = document.getElementById('sqlStatus');
  const envBadgeEl = document.getElementById('envBadge');
  const bannerPatientIdEl = document.getElementById('bannerPatientId');
  const bannerEncounterEl = document.getElementById('bannerEncounter');
  const bannerSubjectRefEl = document.getElementById('bannerSubjectRef');
  const patientDisplayNameEl = document.getElementById('patientDisplayName');
  const patientAvatarEl = document.getElementById('patientAvatar');
  const resultCountEl = document.getElementById('resultCount');
  const lastRefreshedEl = document.getElementById('lastRefreshed');
  const roleBannerEl = document.getElementById('roleBanner');
  const roleBannerTitleEl = document.getElementById('roleBannerTitle');
  const roleBannerTextEl = document.getElementById('roleBannerText');
  const panelSubEl = document.getElementById('panelSub');
  const chipRow = document.querySelector('.chip-row');

  // Audit-only ids — not displayed; not a row filter.
  const ROLE_USERS = {
    clinicTechnician: {
      userId: 'tech-1204',
      label: 'Technician',
      encounter: 'Imaging check-in',
      title: 'Technician workflow',
      text: 'Review prior studies at check-in before capturing a new ultrasound.',
    },
    clinicRadiologist: {
      userId: 'rad-8841',
      label: 'Radiologist',
      encounter: 'Diagnostic review',
      title: 'Radiologist workflow',
      text: 'Same study list (READ). Next step in the real system is authoring DiagnosticReport.',
    },
  };

  /** @type {Array<{ id: string, display: string, initial: string }>} */
  let patientDirectory = [];
  /** @type {string} */
  let modalityFilter = '';
  let loadSeq = 0;
  let hasLoadedOnce = false;
  let activeSuggestIndex = -1;
  let suggestTimer = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function modalityCodes(resource) {
    const fromRoot = (resource.modality || []).map((m) => m.code).filter(Boolean);
    if (fromRoot.length) {
      return fromRoot;
    }
    return (resource.series || []).map((s) => s.modality?.code).filter(Boolean);
  }

  function formatStarted(iso) {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return escapeHtml(iso);
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  function modBadge(code) {
    const cls = code === 'US' ? 'mod-us' : code === 'CT' ? 'mod-ct' : 'mod-other';
    return `<span class="badge ${cls}">${escapeHtml(code)}</span>`;
  }

  function statusBadge(status) {
    const cls = status === 'available' ? 'status-available' : 'status-other';
    return `<span class="badge ${cls}">${escapeHtml(status || 'unknown')}</span>`;
  }

  function setMeta(text, kind) {
    metaEl.textContent = text;
    metaEl.classList.remove('error', 'ok');
    if (kind) {
      metaEl.classList.add(kind);
    }
  }

  function findPatient(id) {
    return patientDirectory.find((p) => p.id === id) || null;
  }

  function currentSession() {
    const role = roleEl.value;
    return ROLE_USERS[role] || ROLE_USERS.clinicTechnician;
  }

  function syncRoleChrome() {
    const session = currentSession();
    roleBannerEl.dataset.role = roleEl.value;
    roleBannerTitleEl.textContent = session.title;
    roleBannerTextEl.textContent = session.text;
    bannerEncounterEl.textContent = session.encounter;
  }

  function renderChartTabs() {
    chartTabsEl.innerHTML = patientDirectory
      .map((p) => {
        const active = p.id === patientIdEl.value ? ' active' : '';
        const short = p.display.split(',')[0] || p.id;
        return `<button type="button" class="chart-tab${active}" data-id="${escapeHtml(p.id)}" role="tab" aria-selected="${p.id === patientIdEl.value}">
          ${escapeHtml(short)}
          <span class="tab-id">${escapeHtml(p.id)}</span>
        </button>`;
      })
      .join('');
  }

  function setModalityFilter(next, { silent = false } = {}) {
    modalityFilter = next;
    chipRow.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.modality === next);
    });
    if (!silent) {
      loadWorklist();
    }
  }

  function syncPatientChrome() {
    const patientId = patientIdEl.value;
    const info = findPatient(patientId);
    const display = info?.display || (patientId ? `Patient ${patientId}` : 'Select a patient');
    const initial = info?.initial || (display.replace(/[^A-Za-z]/g, '').charAt(0) || 'P').toUpperCase();

    bannerPatientIdEl.textContent = patientId || '—';
    bannerSubjectRefEl.textContent = patientId ? `Patient/${patientId}` : '—';
    patientDisplayNameEl.textContent = display;
    patientAvatarEl.textContent = initial;
    panelSubEl.textContent = patientId
      ? `Compartment: Patient/${patientId} only — other patients never appear in this list.`
      : 'Select a patient chart to load studies.';

    if (info && document.activeElement !== patientSearchEl) {
      patientSearchEl.value = `${info.display} (${info.id})`;
    }

    renderChartTabs();
  }

  function renderLoading() {
    bodyEl.innerHTML = `<tr class="empty-row"><td colspan="6">Loading studies…</td></tr>`;
    resultCountEl.textContent = 'Loading…';
  }

  function renderEmpty(message) {
    bodyEl.innerHTML = `<tr class="empty-row"><td colspan="6">${escapeHtml(message)}</td></tr>`;
    resultCountEl.textContent = hasLoadedOnce ? 'No matching studies' : '—';
  }

  function renderRows(entries) {
    bodyEl.innerHTML = entries
      .map((entry, index) => {
        const r = entry.resource || {};
        const mods = modalityCodes(r);
        const modHtml = mods.length ? mods.map(modBadge).join(' ') : '—';
        const selected = index === 0 ? ' class="selected"' : '';
        return `<tr${selected} data-study-id="${escapeHtml(r.id || '')}">
          <td class="mono">${escapeHtml(r.id || '—')}</td>
          <td class="mono">${formatStarted(r.started)}</td>
          <td>${modHtml}</td>
          <td>${statusBadge(r.status)}</td>
          <td class="desc">${escapeHtml(r.description || '—')}</td>
          <td class="mono">${escapeHtml(r.subject?.reference || '—')}</td>
        </tr>`;
      })
      .join('');

    const n = entries.length;
    resultCountEl.textContent = `${n} stud${n === 1 ? 'y' : 'ies'} for ${patientIdEl.value}`;
  }

  function hideSuggestions() {
    suggestionsEl.hidden = true;
    suggestionsEl.innerHTML = '';
    patientSearchEl.setAttribute('aria-expanded', 'false');
    activeSuggestIndex = -1;
  }

  function normalizeQuery(q) {
    return String(q || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim()
      .toLowerCase();
  }

  function showSuggestions(matches) {
    if (!matches.length) {
      suggestionsEl.innerHTML =
        '<li class="suggest-empty" role="presentation">No matching patients</li>';
      suggestionsEl.hidden = false;
      patientSearchEl.setAttribute('aria-expanded', 'true');
      activeSuggestIndex = -1;
      return;
    }

    suggestionsEl.innerHTML = matches
      .map(
        (p, i) => `<li role="option" data-id="${escapeHtml(p.id)}" data-index="${i}" id="suggest-${i}">
          <span class="suggest-name">${escapeHtml(p.display)}</span>
          <span class="suggest-id">${escapeHtml(p.id)}</span>
        </li>`,
      )
      .join('');
    suggestionsEl.hidden = false;
    patientSearchEl.setAttribute('aria-expanded', 'true');
    activeSuggestIndex = -1;
  }

  function filterDirectory(q) {
    const needle = normalizeQuery(q);
    if (!needle) {
      return patientDirectory.slice(0, 12);
    }
    return patientDirectory
      .filter((p) => `${p.display} ${p.id}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }

  function selectPatient(patient, { reload = true, resetModality = true } = {}) {
    if (!patient) {
      return;
    }
    patientIdEl.value = patient.id;
    patientSearchEl.value = `${patient.display} (${patient.id})`;
    hideSuggestions();

    // Opening a new chart resets modality so Blake isn't "empty" under a leftover CT filter.
    if (resetModality) {
      setModalityFilter('', { silent: true });
    }

    syncPatientChrome();
    if (reload) {
      loadWorklist();
    }
  }

  function highlightSuggestion(index) {
    const options = [...suggestionsEl.querySelectorAll('[role="option"]')];
    options.forEach((el, i) => el.classList.toggle('active', i === index));
    activeSuggestIndex = index;
    if (options[index]) {
      patientSearchEl.setAttribute('aria-activedescendant', options[index].id);
    }
  }

  async function loadPatientDirectory() {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      patientDirectory = Array.isArray(data.patients) ? data.patients : [];
    } catch {
      patientDirectory = [];
    }

    const current = findPatient(patientIdEl.value) || patientDirectory[0];
    if (current) {
      selectPatient(current, { reload: false, resetModality: false });
    } else {
      syncPatientChrome();
    }
  }

  async function refreshHealth() {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      if (envBadgeEl && data.label) {
        envBadgeEl.textContent = data.label;
        envBadgeEl.dataset.target = data.target === 'dev' ? 'dev' : 'local';
        envBadgeEl.title = data.stack
          ? `${data.stack} via ${data.how || data.backend}`
          : '';
      }
      if (data.sql === 'up') {
        sqlStatusEl.textContent = 'DB connected';
        sqlStatusEl.className = 'sys-status up';
      } else {
        sqlStatusEl.textContent = 'DB unavailable';
        sqlStatusEl.className = 'sys-status down';
      }
    } catch {
      sqlStatusEl.textContent = 'DB unavailable';
      sqlStatusEl.className = 'sys-status down';
    }
  }

  async function loadWorklist() {
    const seq = ++loadSeq;
    const patientId = patientIdEl.value;
    const session = currentSession();

    if (!patientId) {
      renderEmpty('Select Alex or Blake (or search) to open a chart.');
      setMeta('No patient selected', 'error');
      return;
    }

    syncRoleChrome();
    syncPatientChrome();
    renderLoading();
    setMeta(`Loading ${patientId}…`);

    const params = new URLSearchParams({ _sort: '-started', _count: '100' });
    if (modalityFilter) {
      params.set('modality', modalityFilter);
    }

    loadBtn.disabled = true;

    try {
      const res = await fetch(`/Patient/${encodeURIComponent(patientId)}/ImagingStudy?${params}`, {
        headers: {
          Accept: 'application/fhir+json',
          'X-User-Role': roleEl.value,
          'X-User-Id': session.userId,
        },
      });
      const data = await res.json();

      if (seq !== loadSeq) {
        return;
      }

      hasLoadedOnce = true;

      if (!res.ok) {
        const diag = data?.issue?.[0]?.diagnostics || `HTTP ${res.status}`;
        renderEmpty(`Unable to load studies (${res.status}).`);
        setMeta(diag, 'error');
        lastRefreshedEl.textContent = '';
        return;
      }

      const entries = data.entry || [];
      if (!entries.length) {
        if (modalityFilter) {
          renderEmpty(
            `No ${modalityFilter} studies for ${patientId}. Tip: Blake is ultrasound-only — choose All or Ultrasound.`,
          );
        } else {
          renderEmpty(`No prior studies for ${patientId}.`);
        }
        setMeta(`0 matches · chart ${patientId} · ${session.label}`, 'ok');
      } else {
        renderRows(entries);
        const filterNote = modalityFilter ? ` · ${modalityFilter}` : ' · all modalities';
        setMeta(
          `${entries.length} stud${entries.length === 1 ? 'y' : 'ies'} · ${patientId}${filterNote} · ${session.label} (read)`,
          'ok',
        );
      }

      lastRefreshedEl.textContent = `Updated ${new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date())}`;
    } catch (err) {
      if (seq !== loadSeq) {
        return;
      }
      hasLoadedOnce = true;
      renderEmpty('Could not reach the imaging service.');
      setMeta(err.message || 'Request failed', 'error');
      lastRefreshedEl.textContent = '';
    } finally {
      if (seq === loadSeq) {
        loadBtn.disabled = false;
      }
    }
  }

  chartTabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.chart-tab');
    if (!tab) {
      return;
    }
    selectPatient(findPatient(tab.dataset.id), { resetModality: true });
  });

  patientSearchEl.addEventListener('focus', () => {
    patientSearchEl.select();
    showSuggestions(filterDirectory(patientSearchEl.value));
  });

  patientSearchEl.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => {
      showSuggestions(filterDirectory(patientSearchEl.value));
    }, 80);
  });

  patientSearchEl.addEventListener('keydown', (e) => {
    const options = [...suggestionsEl.querySelectorAll('[role="option"]')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestionsEl.hidden) {
        showSuggestions(filterDirectory(patientSearchEl.value));
        return;
      }
      highlightSuggestion(Math.min(activeSuggestIndex + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightSuggestion(Math.max(activeSuggestIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestIndex >= 0 && options[activeSuggestIndex]) {
        selectPatient(findPatient(options[activeSuggestIndex].dataset.id));
      } else {
        const matches = filterDirectory(patientSearchEl.value);
        if (matches.length === 1) {
          selectPatient(matches[0]);
        }
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
      syncPatientChrome();
    }
  });

  suggestionsEl.addEventListener('mousedown', (e) => {
    const option = e.target.closest('[role="option"]');
    if (!option) {
      return;
    }
    e.preventDefault();
    selectPatient(findPatient(option.dataset.id));
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#patientCombo')) {
      hideSuggestions();
      syncPatientChrome();
    }
  });

  chipRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) {
      return;
    }
    setModalityFilter(chip.dataset.modality ?? '');
  });

  roleEl.addEventListener('change', () => {
    syncRoleChrome();
    // Same ImagingStudy READ list — reload only to refresh audit headers / messaging.
    loadWorklist();
  });
  loadBtn.addEventListener('click', loadWorklist);

  bodyEl.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row || row.classList.contains('empty-row')) {
      return;
    }
    bodyEl.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'));
    row.classList.add('selected');
  });

  (async () => {
    syncRoleChrome();
    await loadPatientDirectory();
    await refreshHealth();
    await loadWorklist();
  })();
})();
