// ============================================================
//  MÓDULO — CONTEÚDOS DE ESTUDO
//  Cadastro de tópicos de estudo vinculados a disciplinas e provas.
// ============================================================

const Content = (() => {

  const STORAGE_KEY = 'contents';

  const STATUS = [
    { value: 'pending',     label: 'Pendente',      badge: 'badge--warn'   },
    { value: 'studying',    label: 'Estudando',     badge: 'badge--moss'   },
    { value: 'reviewed',    label: 'Revisado',      badge: 'badge--green'  },
    { value: 'done',        label: 'Concluído',     badge: 'badge--green'  },
  ];

  const DIFFICULTY = [
    { value: 'easy',   label: 'Fácil',   color: 'var(--emerald)' },
    { value: 'medium', label: 'Médio',   color: 'var(--warning)' },
    { value: 'hard',   label: 'Difícil', color: 'var(--danger)'  },
  ];

  // ── Helpers ─────────────────────────────────────────────────

  function getContents() {
    return Storage.getArray(STORAGE_KEY);
  }

  function saveContents(list) {
    Storage.set(STORAGE_KEY, list);
  }

  function getDisciplines() {
    return Storage.getArray('disciplines');
  }

  function getTasks() {
    const tasks  = Storage.getArray('tasks');
    const events = Storage.getArray('events');
    return [...tasks, ...events].filter(t =>
      t.type === 'exam' || t.type === 'work'
    );
  }

  function getStatusInfo(value) {
    return STATUS.find(s => s.value === value) || STATUS[0];
  }

  function getDifficultyInfo(value) {
    return DIFFICULTY.find(d => d.value === value) || DIFFICULTY[1];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Renderização principal ───────────────────────────────────

  function render() {
    const container = document.getElementById('module-content');
    if (!container) return;

    const disciplines = getDisciplines();
    const exams       = getTasks();

    container.innerHTML = `
      <div class="module__header">
        <h1 class="module__title">Conteúdos de Estudo</h1>
        <p class="module__subtitle">Cadastre os tópicos que precisam ser estudados para cada prova ou trabalho.</p>
      </div>

      <!-- Toolbar -->
      <div class="tasks-toolbar">
        <div class="tasks-filters" id="contentFilters">
          <button class="filter-btn active" data-filter="all">Todos</button>
          <button class="filter-btn" data-filter="pending">Pendentes</button>
          <button class="filter-btn" data-filter="studying">Estudando</button>
          <button class="filter-btn" data-filter="reviewed">Revisados</button>
          <button class="filter-btn" data-filter="done">Concluídos</button>
        </div>
        <button class="btn btn--primary" id="btnNewContent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Conteúdo
        </button>
      </div>

      <!-- Progresso geral -->
      <div id="contentProgress"></div>

      <!-- Lista agrupada por disciplina -->
      <div id="contentList"></div>

      <!-- MODAL -->
      <div class="modal-overlay" id="contentModal">
        <div class="modal" style="max-width:540px;">
          <div class="modal__header">
            <span class="modal__title" id="modalContentTitle">Novo Conteúdo</span>
            <button class="modal__close" id="closeContentModal">✕</button>
          </div>

          <form id="contentForm" autocomplete="off">
            <input type="hidden" id="contentId" />

            <div class="form-group">
              <label for="contentTopic">Tópico / Conteúdo *</label>
              <input type="text" id="contentTopic"
                placeholder="Ex: Sistema Nervoso Central — Neurônios" required />
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label for="contentDiscipline">Disciplina *</label>
                <select id="contentDiscipline" required>
                  <option value="">— Selecionar —</option>
                  ${disciplines.map(d =>
                    `<option value="${d.id}">${d.name}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label for="contentDifficulty">Dificuldade</label>
                <select id="contentDifficulty">
                  ${DIFFICULTY.map(d =>
                    `<option value="${d.value}">${d.label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;">
              <div class="form-group" style="margin-bottom:0;">
                <label for="contentStatus">Status</label>
                <select id="contentStatus">
                  ${STATUS.map(s =>
                    `<option value="${s.value}">${s.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label for="contentExam">Prova / Trabalho</label>
                <select id="contentExam">
                  <option value="">— Nenhum —</option>
                  ${exams.map(e =>
                    `<option value="${e.id}">${e.title} (${formatDate(e.date)})</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-top:14px;">
              <label for="contentHours">Horas estimadas de estudo</label>
              <input type="number" id="contentHours" min="0.5" max="20" step="0.5"
                placeholder="Ex: 2.5" />
            </div>

            <div class="form-group">
              <label for="contentNotes">Anotações / Fontes</label>
              <textarea id="contentNotes"
                placeholder="Capítulo do livro, página, link, resumo..."></textarea>
            </div>

            <!-- Subtópicos -->
            <div class="form-group">
              <label>Subtópicos</label>
              <div id="subtopicsList"></div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <input type="text" id="subtopicInput"
                  placeholder="Ex: Sinapses químicas"
                  style="flex:1; background:var(--bg-raised); border:1px solid var(--bg-border);
                    border-radius:var(--radius-sm); color:var(--text-primary);
                    font-size:.85rem; padding:7px 10px; outline:none;" />
                <button type="button" class="btn btn--secondary" id="btnAddSubtopic"
                  style="padding:7px 14px; font-size:.82rem;">+ Adicionar</button>
              </div>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
              <button type="button" class="btn btn--secondary" id="cancelContentModal">Cancelar</button>
              <button type="submit" class="btn btn--primary">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    renderProgress();
    renderList('all');
    bindEvents();
  }

  // ── Barra de progresso geral ─────────────────────────────────

  function renderProgress() {
    const container = document.getElementById('contentProgress');
    if (!container) return;

    const all   = getContents();
    const total = all.length;
    if (total === 0) { container.innerHTML = ''; return; }

    const done    = all.filter(c => c.status === 'done' || c.status === 'reviewed').length;
    const pct     = Math.round((done / total) * 100);

    container.innerHTML = `
      <div class="progress-bar-wrap">
        <div class="progress-bar-header">
          <span class="progress-bar-label">Progresso Geral</span>
          <span class="progress-bar-value">${done} de ${total} concluídos (${pct}%)</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  // ── Lista agrupada ───────────────────────────────────────────

  function renderList(filter) {
    const container   = document.getElementById('contentList');
    if (!container) return;

    const disciplines = getDisciplines();
    let   contents    = getContents();

    if (filter !== 'all') {
      contents = contents.filter(c => c.status === filter);
    }

    if (contents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">📖</span>
          <p>Nenhum conteúdo encontrado.<br/>
          ${filter === 'all' ? 'Clique em <strong>Novo Conteúdo</strong> para começar.' : 'Tente outro filtro.'}</p>
        </div>`;
      return;
    }

    // Agrupa por disciplina
    const groups = {};
    const noDisc = [];

    contents.forEach(c => {
      if (c.disciplineId) {
        if (!groups[c.disciplineId]) groups[c.disciplineId] = [];
        groups[c.disciplineId].push(c);
      } else {
        noDisc.push(c);
      }
    });

    let html = '';

    // Renderiza cada grupo
    disciplines.forEach(d => {
      if (!groups[d.id] || groups[d.id].length === 0) return;
      const items    = groups[d.id];
      const doneQty  = items.filter(c => c.status === 'done' || c.status === 'reviewed').length;
      const pct      = Math.round((doneQty / items.length) * 100);

      html += `
        <div class="content-group">
          <div class="content-group__header">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="content-group__dot" style="background:${d.color};"></span>
              <span class="content-group__name">${d.name}</span>
              <span class="badge badge--moss">${items.length} tópico${items.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="content-group__progress">
              <span style="font-size:.75rem; color:var(--text-muted);">${pct}%</span>
              <div class="mini-progress-track">
                <div class="mini-progress-fill" style="width:${pct}%; background:${d.color};"></div>
              </div>
            </div>
          </div>
          <div class="content-group__items">
            ${items.map(c => renderContentCard(c)).join('')}
          </div>
        </div>`;
    });

    // Sem disciplina
    if (noDisc.length > 0) {
      html += `
        <div class="content-group">
          <div class="content-group__header">
            <span class="content-group__name" style="color:var(--text-muted);">Sem disciplina</span>
          </div>
          <div class="content-group__items">
            ${noDisc.map(c => renderContentCard(c)).join('')}
          </div>
        </div>`;
    }

    container.innerHTML = html;

    // Bind ações
    container.querySelectorAll('.btn-edit-content').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete-content').forEach(btn => {
      btn.addEventListener('click', () => deleteContent(btn.dataset.id));
    });
    container.querySelectorAll('.btn-cycle-status').forEach(btn => {
      btn.addEventListener('click', () => cycleStatus(btn.dataset.id));
    });
  }

  function renderContentCard(c) {
    const statusInfo = getStatusInfo(c.status);
    const diffInfo   = getDifficultyInfo(c.difficulty);
    const exams      = getTasks();
    const exam       = exams.find(e => e.id === c.examId);
    const subtopics  = c.subtopics || [];
    const doneSubtopics = subtopics.filter(s => s.done).length;

    return `
      <div class="content-card">
        <div class="content-card__top">
          <div class="content-card__info">
            <span class="content-card__topic">${c.topic}</span>
            <div class="content-card__badges">
              <span class="badge ${statusInfo.badge}" style="cursor:pointer;"
                data-id="${c.id}" title="Clique para avançar status">
                ${statusInfo.label}
              </span>
              <span class="badge" style="color:${diffInfo.color};
                background:${diffInfo.color}22; border:1px solid ${diffInfo.color}44;">
                ${diffInfo.label}
              </span>
              ${c.estimatedHours ? `
                <span class="badge badge--moss">⏱ ${c.estimatedHours}h</span>` : ''}
              ${exam ? `
                <span class="badge badge--warn" title="${exam.title}">
                  📝 ${exam.title.slice(0,20)}${exam.title.length>20?'…':''}
                </span>` : ''}
            </div>
          </div>
          <div class="content-card__actions">
            <button class="badge ${statusInfo.badge} btn-cycle-status"
              data-id="${c.id}"
              style="cursor:pointer; border:none; padding:4px 10px; font-size:.72rem;">
              Avançar
            </button>
            <button class="btn btn--secondary btn-edit-content"
              data-id="${c.id}"
              style="padding:4px 10px; font-size:.75rem;">Editar</button>
            <button class="btn btn--danger btn-delete-content"
              data-id="${c.id}"
              style="padding:4px 10px; font-size:.75rem;">Excluir</button>
          </div>
        </div>

        ${c.notes ? `
          <div class="content-card__notes">💬 ${c.notes}</div>` : ''}

        ${subtopics.length > 0 ? `
          <div class="content-card__subtopics">
            <span style="font-size:.75rem; color:var(--text-muted); margin-bottom:6px; display:block;">
              Subtópicos: ${doneSubtopics}/${subtopics.length}
            </span>
            ${subtopics.map((s, i) => `
              <div class="subtopic-item">
                <button class="subtopic-check ${s.done ? 'done' : ''}"
                  data-content-id="${c.id}" data-sub-index="${i}"
                  onclick="Content.toggleSubtopic('${c.id}', ${i})">
                  ${s.done ? '✓' : ''}
                </button>
                <span class="${s.done ? 'subtopic-done-text' : ''}">${s.label}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  // ── Subtópicos ───────────────────────────────────────────────

  let tempSubtopics = [];

  function renderSubtopicsList() {
    const container = document.getElementById('subtopicsList');
    if (!container) return;
    container.innerHTML = tempSubtopics.map((s, i) => `
      <div class="subtopic-item" style="margin-bottom:6px;">
        <span style="flex:1; font-size:.85rem; color:var(--text-primary);">• ${s.label}</span>
        <button type="button" onclick="Content.removeSubtopic(${i})"
          class="btn-remove-slot" style="padding:2px 8px; font-size:.75rem;">✕</button>
      </div>`).join('');
  }

  function addSubtopic() {
    const input = document.getElementById('subtopicInput');
    const val   = input.value.trim();
    if (!val) return;
    tempSubtopics.push({ label: val, done: false });
    input.value = '';
    renderSubtopicsList();
  }

  function removeSubtopic(index) {
    tempSubtopics.splice(index, 1);
    renderSubtopicsList();
  }

  function toggleSubtopic(contentId, subIndex) {
    const list = getContents();
    const idx  = list.findIndex(c => c.id === contentId);
    if (idx < 0) return;
    list[idx].subtopics[subIndex].done = !list[idx].subtopics[subIndex].done;
    saveContents(list);
    const activeFilter = document.querySelector('#contentFilters .filter-btn.active')?.dataset.filter || 'all';
    renderProgress();
    renderList(activeFilter);
  }

  // ── Ciclar status ────────────────────────────────────────────

  function cycleStatus(id) {
    const order = ['pending', 'studying', 'reviewed', 'done'];
    const list  = getContents();
    const idx   = list.findIndex(c => c.id === id);
    if (idx < 0) return;
    const current = list[idx].status || 'pending';
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    list[idx].status = order[nextIdx];
    saveContents(list);
    const activeFilter = document.querySelector('#contentFilters .filter-btn.active')?.dataset.filter || 'all';
    renderProgress();
    renderList(activeFilter);
  }

  // ── Modal ────────────────────────────────────────────────────

  function openModal() {
    tempSubtopics = [];
    renderSubtopicsList();
    document.getElementById('contentModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('contentModal').classList.remove('open');
    document.getElementById('contentForm').reset();
    document.getElementById('contentId').value = '';
    document.getElementById('modalContentTitle').textContent = 'Novo Conteúdo';
    tempSubtopics = [];
    renderSubtopicsList();
  }

  function openEditModal(id) {
    const list = getContents();
    const c    = list.find(x => x.id === id);
    if (!c) return;

    document.getElementById('modalContentTitle').textContent  = 'Editar Conteúdo';
    document.getElementById('contentId').value                = c.id;
    document.getElementById('contentTopic').value             = c.topic;
    document.getElementById('contentDiscipline').value        = c.disciplineId || '';
    document.getElementById('contentDifficulty').value        = c.difficulty || 'medium';
    document.getElementById('contentStatus').value            = c.status || 'pending';
    document.getElementById('contentExam').value              = c.examId || '';
    document.getElementById('contentHours').value             = c.estimatedHours || '';
    document.getElementById('contentNotes').value             = c.notes || '';

    tempSubtopics = c.subtopics ? [...c.subtopics] : [];
    renderSubtopicsList();
    openModal();
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function saveContent(e) {
    e.preventDefault();

    const id             = document.getElementById('contentId').value;
    const topic          = document.getElementById('contentTopic').value.trim();
    const disciplineId   = document.getElementById('contentDiscipline').value;
    const difficulty     = document.getElementById('contentDifficulty').value;
    const status         = document.getElementById('contentStatus').value;
    const examId         = document.getElementById('contentExam').value;
    const estimatedHours = document.getElementById('contentHours').value;
    const notes          = document.getElementById('contentNotes').value.trim();

    if (!topic || !disciplineId) return;

    const list = getContents();
    const item = {
      id:             id || Storage.generateId(),
      topic, disciplineId, difficulty, status, examId,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      notes,
      subtopics:      [...tempSubtopics],
    };

    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);

    saveContents(list);

    const activeFilter = document.querySelector('#contentFilters .filter-btn.active')?.dataset.filter || 'all';
    closeModal();
    renderProgress();
    renderList(activeFilter);
  }

  function deleteContent(id) {
    if (!confirm('Deseja excluir este conteúdo?')) return;
    const list = getContents().filter(c => c.id !== id);
    saveContents(list);
    const activeFilter = document.querySelector('#contentFilters .filter-btn.active')?.dataset.filter || 'all';
    renderProgress();
    renderList(activeFilter);
  }

  // ── Eventos ──────────────────────────────────────────────────

  function bindEvents() {
    document.getElementById('btnNewContent')
      .addEventListener('click', openModal);

    document.getElementById('closeContentModal')
      .addEventListener('click', closeModal);

    document.getElementById('cancelContentModal')
      .addEventListener('click', closeModal);

    document.getElementById('contentModal')
      .addEventListener('click', e => {
        if (e.target.id === 'contentModal') closeModal();
      });

    document.getElementById('contentForm')
      .addEventListener('submit', saveContent);

    document.getElementById('btnAddSubtopic')
      .addEventListener('click', addSubtopic);

    document.getElementById('subtopicInput')
      .addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addSubtopic(); }
      });

    document.querySelectorAll('#contentFilters .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#contentFilters .filter-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList(btn.dataset.filter);
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    render();
  }

  return { init, toggleSubtopic, removeSubtopic };

})();
