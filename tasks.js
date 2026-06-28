// ============================================================
//  MÓDULO — TAREFAS E EVENTOS
//  Gerencia tarefas, provas e compromissos com data e prioridade.
// ============================================================

const Tasks = (() => {

  const STORAGE_TASKS  = 'tasks';
  const STORAGE_EVENTS = 'events';

  const TYPES = [
    { value: 'task',  label: 'Tarefa',    badge: 'badge--green'  },
    { value: 'exam',  label: 'Prova',     badge: 'badge--danger' },
    { value: 'event', label: 'Evento',    badge: 'badge--moss'   },
    { value: 'work',  label: 'Trabalho',  badge: 'badge--warn'   },
  ];

  const PRIORITIES = [
    { value: 'high',   label: 'Alta',   color: 'var(--danger)'  },
    { value: 'medium', label: 'Média',  color: 'var(--warning)' },
    { value: 'low',    label: 'Baixa',  color: 'var(--emerald)' },
  ];

  // ── Helpers ─────────────────────────────────────────────────

  function getAllItems() {
    const tasks  = Storage.getArray(STORAGE_TASKS).map(t => ({ ...t, _store: 'tasks' }));
    const events = Storage.getArray(STORAGE_EVENTS).map(e => ({ ...e, _store: 'events' }));
    return [...tasks, ...events];
  }

  function saveItem(item) {
    const key = item.type === 'event' ? STORAGE_EVENTS : STORAGE_TASKS;
    const list = Storage.getArray(key);
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    Storage.set(key, list);
  }

  function removeItem(id, store) {
    const list = Storage.getArray(store).filter(x => x.id !== id);
    Storage.set(store, list);
  }

  function getTypeInfo(value) {
    return TYPES.find(t => t.value === value) || TYPES[0];
  }

  function getPriorityInfo(value) {
    return PRIORITIES.find(p => p.value === value) || PRIORITIES[1];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getDisciplines() {
    return Storage.getArray('disciplines');
  }

  // ── Renderização principal ───────────────────────────────────

  function render() {
    const container = document.getElementById('module-tasks');
    if (!container) return;

    container.innerHTML = `
      <div class="module__header">
        <h1 class="module__title">Tarefas e Eventos</h1>
        <p class="module__subtitle">Gerencie compromissos, provas, trabalhos e prazos.</p>
      </div>

      <!-- Filtros + botão -->
      <div class="tasks-toolbar">
        <div class="tasks-filters">
          <button class="filter-btn active" data-filter="all">Todos</button>
          <button class="filter-btn" data-filter="task">Tarefas</button>
          <button class="filter-btn" data-filter="exam">Provas</button>
          <button class="filter-btn" data-filter="work">Trabalhos</button>
          <button class="filter-btn" data-filter="event">Eventos</button>
          <button class="filter-btn" data-filter="done">Concluídos</button>
        </div>
        <button class="btn btn--primary" id="btnNewTask">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Item
        </button>
      </div>

      <!-- Lista -->
      <div id="tasksList"></div>

      <!-- MODAL -->
      <div class="modal-overlay" id="taskModal">
        <div class="modal" style="max-width:520px;">
          <div class="modal__header">
            <span class="modal__title" id="modalTaskTitle">Novo Item</span>
            <button class="modal__close" id="closeTaskModal">✕</button>
          </div>

          <form id="taskForm" autocomplete="off">
            <input type="hidden" id="taskId" />
            <input type="hidden" id="taskStore" />

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label for="taskType">Tipo *</label>
                <select id="taskType">
                  ${TYPES.map(t =>
                    `<option value="${t.value}">${t.label}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label for="taskPriority">Prioridade</label>
                <select id="taskPriority">
                  ${PRIORITIES.map(p =>
                    `<option value="${p.value}">${p.label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-top:14px;">
              <label for="taskTitle">Título *</label>
              <input type="text" id="taskTitle" placeholder="Ex: Prova de Anatomia — Unidade 3" required />
            </div>

            <div class="form-group">
              <label for="taskDiscipline">Disciplina (opcional)</label>
              <select id="taskDiscipline">
                <option value="">— Selecionar disciplina —</option>
                ${getDisciplines().map(d =>
                  `<option value="${d.id}">${d.name}</option>`
                ).join('')}
              </select>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label for="taskDate">Data *</label>
                <input type="date" id="taskDate" required />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label for="taskTime">Horário</label>
                <input type="time" id="taskTime" />
              </div>
            </div>

            <div class="form-group" style="margin-top:14px;">
              <label for="taskNotes">Observações</label>
              <textarea id="taskNotes" placeholder="Detalhes, localização, lembretes..."></textarea>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
              <button type="button" class="btn btn--secondary" id="cancelTaskModal">Cancelar</button>
              <button type="submit" class="btn btn--primary">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    renderList('all');
    bindEvents();
  }

  // ── Lista filtrada ───────────────────────────────────────────

  function renderList(filter) {
    const container = document.getElementById('tasksList');
    if (!container) return;

    let items = getAllItems();

    // Ordena por data
    items.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    // Aplica filtro
    if (filter === 'done') {
      items = items.filter(i => i.done);
    } else if (filter !== 'all') {
      items = items.filter(i => i.type === filter && !i.done);
    } else {
      items = items.filter(i => !i.done);
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">✅</span>
          <p>Nenhum item encontrado para este filtro.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="tasks-list">
        ${items.map(item => renderTaskRow(item)).join('')}
      </div>`;

    // Bind ações dos cards
    container.querySelectorAll('.btn-toggle-done').forEach(btn => {
      btn.addEventListener('click', () => toggleDone(btn.dataset.id, btn.dataset.store, filter));
    });
    container.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id, btn.dataset.store));
    });
    container.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', () => deleteItem(btn.dataset.id, btn.dataset.store, filter));
    });
  }

  function renderTaskRow(item) {
    const typeInfo     = getTypeInfo(item.type);
    const priorityInfo = getPriorityInfo(item.priority);
    const disciplines  = getDisciplines();
    const disc         = disciplines.find(d => d.id === item.disciplineId);
    const today        = new Date(); today.setHours(0,0,0,0);
    const itemDate     = item.date ? new Date(item.date + 'T00:00:00') : null;
    const isOverdue    = itemDate && itemDate < today && !item.done;
    const isToday      = itemDate && itemDate.toDateString() === today.toDateString();

    return `
      <div class="task-row ${item.done ? 'task-row--done' : ''} ${isOverdue ? 'task-row--overdue' : ''}">
        <button class="task-row__check btn-toggle-done"
          data-id="${item.id}" data-store="${item._store}"
          title="${item.done ? 'Marcar como pendente' : 'Marcar como concluído'}">
          ${item.done
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>`
            : `<span class="check-circle"></span>`
          }
        </button>

        <div class="task-row__body">
          <div class="task-row__top">
            <span class="task-row__title">${item.title}</span>
            <div class="task-row__badges">
              <span class="badge ${typeInfo.badge}">${typeInfo.label}</span>
              <span class="badge" style="background:rgba(0,0,0,0.2);color:${priorityInfo.color};
                border:1px solid ${priorityInfo.color}33;">
                ${priorityInfo.label}
              </span>
            </div>
          </div>

          <div class="task-row__meta">
            ${itemDate ? `
              <span class="${isOverdue ? 'text-danger' : isToday ? 'text-emerald' : 'text-muted'}">
                📅 ${isToday ? 'Hoje' : formatDate(item.date)}
                ${item.time ? '· ' + item.time : ''}
              </span>` : ''}
            ${disc ? `<span class="text-muted" style="margin-left:8px;">
              <span style="display:inline-block;width:8px;height:8px;
                border-radius:50%;background:${disc.color};margin-right:4px;"></span>
              ${disc.name}
            </span>` : ''}
            ${item.notes ? `<span class="text-muted" style="margin-left:8px;">💬 ${item.notes.slice(0,40)}${item.notes.length>40?'…':''}</span>` : ''}
          </div>
        </div>

        <div class="task-row__actions">
          <button class="btn btn--secondary btn-edit-task"
            data-id="${item.id}" data-store="${item._store}"
            style="padding:4px 10px;font-size:.75rem;">Editar</button>
          <button class="btn btn--danger btn-delete-task"
            data-id="${item.id}" data-store="${item._store}"
            style="padding:4px 10px;font-size:.75rem;">Excluir</button>
        </div>
      </div>`;
  }

  // ── Modal ────────────────────────────────────────────────────

  function openModal() {
    document.getElementById('taskModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('taskModal').classList.remove('open');
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value    = '';
    document.getElementById('taskStore').value = '';
    document.getElementById('modalTaskTitle').textContent = 'Novo Item';
  }

  function openEditModal(id, store) {
    const list = Storage.getArray(store);
    const item = list.find(x => x.id === id);
    if (!item) return;

    document.getElementById('modalTaskTitle').textContent   = 'Editar Item';
    document.getElementById('taskId').value                 = item.id;
    document.getElementById('taskStore').value              = store;
    document.getElementById('taskType').value               = item.type;
    document.getElementById('taskPriority').value           = item.priority || 'medium';
    document.getElementById('taskTitle').value              = item.title;
    document.getElementById('taskDiscipline').value         = item.disciplineId || '';
    document.getElementById('taskDate').value               = item.date || '';
    document.getElementById('taskTime').value               = item.time || '';
    document.getElementById('taskNotes').value              = item.notes || '';

    openModal();
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function saveTask(e) {
    e.preventDefault();

    const id           = document.getElementById('taskId').value;
    const type         = document.getElementById('taskType').value;
    const priority     = document.getElementById('taskPriority').value;
    const title        = document.getElementById('taskTitle').value.trim();
    const disciplineId = document.getElementById('taskDiscipline').value;
    const date         = document.getElementById('taskDate').value;
    const time         = document.getElementById('taskTime').value;
    const notes        = document.getElementById('taskNotes').value.trim();

    if (!title || !date) return;

    const store = type === 'event' ? STORAGE_EVENTS : STORAGE_TASKS;

    // Se editando e o tipo mudou, remove do store antigo
    const oldStore = document.getElementById('taskStore').value;
    if (id && oldStore && oldStore !== store) {
      removeItem(id, oldStore);
    }

    const item = {
      id:           id || Storage.generateId(),
      type, priority, title, disciplineId, date, time, notes,
      done:         false,
    };

    // Preserva o done original se estiver editando
    if (id) {
      const old = Storage.getArray(oldStore || store).find(x => x.id === id);
      if (old) item.done = old.done;
    }

    saveItem(item);

    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    closeModal();
    renderList(activeFilter);
  }

  function deleteItem(id, store, filter) {
    if (!confirm('Deseja excluir este item?')) return;
    removeItem(id, store);
    renderList(filter || 'all');
  }

  function toggleDone(id, store, filter) {
    const list = Storage.getArray(store);
    const idx  = list.findIndex(x => x.id === id);
    if (idx < 0) return;
    list[idx].done = !list[idx].done;
    Storage.set(store, list);
    renderList(filter || 'all');
  }

  // ── Eventos ──────────────────────────────────────────────────

  function bindEvents() {
    document.getElementById('btnNewTask')
      .addEventListener('click', openModal);

    document.getElementById('closeTaskModal')
      .addEventListener('click', closeModal);

    document.getElementById('cancelTaskModal')
      .addEventListener('click', closeModal);

    document.getElementById('taskModal')
      .addEventListener('click', e => {
        if (e.target.id === 'taskModal') closeModal();
      });

    document.getElementById('taskForm')
      .addEventListener('submit', saveTask);

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList(btn.dataset.filter);
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    render();
  }

  return { init };

})();
