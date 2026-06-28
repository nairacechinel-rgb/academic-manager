// ============================================================
//  MÓDULO — GRADE CURRICULAR
//  Gerencia disciplinas: nome, professor, horários e cor.
// ============================================================

const Curriculum = (() => {

  const STORAGE_KEY = 'disciplines';

  // Dias e turnos para os horários
  const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const COLORS = [
    '#2ECC71', '#4A7C59', '#52D98A', '#1fa855',
    '#4a9eba', '#d4a84b', '#e05252', '#9b59b6'
  ];

  // ── Helpers ─────────────────────────────────────────────────

  function getDisciplines() {
    return Storage.getArray(STORAGE_KEY);
  }

  function saveDisciplines(list) {
    Storage.set(STORAGE_KEY, list);
  }

  function getDayBadge(day) {
    return `<span class="badge badge--moss" style="margin-right:4px;">${day}</span>`;
  }

  // ── Renderização principal ───────────────────────────────────

  function render() {
    const container = document.getElementById('module-curriculum');
    if (!container) return;

    container.innerHTML = `
      <div class="module__header">
        <h1 class="module__title">Grade Curricular</h1>
        <p class="module__subtitle">Cadastre suas disciplinas, professores e horários semanais.</p>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
        <button class="btn btn--primary" id="btnNewDiscipline">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Disciplina
        </button>
      </div>

      <div id="disciplinesList"></div>

      <!-- MODAL -->
      <div class="modal-overlay" id="disciplineModal">
        <div class="modal">
          <div class="modal__header">
            <span class="modal__title" id="modalDisciplineTitle">Nova Disciplina</span>
            <button class="modal__close" id="closeDisciplineModal">✕</button>
          </div>

          <form id="disciplineForm" autocomplete="off">
            <input type="hidden" id="disciplineId" />

            <div class="form-group">
              <label for="disciplineName">Nome da Disciplina *</label>
              <input type="text" id="disciplineName" placeholder="Ex: Anatomia Humana" required />
            </div>

            <div class="form-group">
              <label for="disciplineTeacher">Professor(a)</label>
              <input type="text" id="disciplineTeacher" placeholder="Ex: Prof. João Silva" />
            </div>

            <div class="form-group">
              <label>Cor de Identificação</label>
              <div class="color-picker" id="colorPicker"></div>
            </div>

            <div class="form-group">
              <label>Horários Semanais</label>
              <div id="scheduleSlots">
                <div class="schedule-slot" data-index="0">
                  <select class="slot-day">
                    ${DAYS.map(d => `<option value="${d}">${d}</option>`).join('')}
                  </select>
                  <input type="time" class="slot-start" value="08:00" />
                  <span style="color:var(--text-muted);font-size:.85rem;">até</span>
                  <input type="time" class="slot-end" value="10:00" />
                  <button type="button" class="btn-remove-slot" title="Remover">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn--secondary" id="btnAddSlot"
                style="margin-top:10px; font-size:.8rem; padding:6px 14px;">
                + Adicionar Horário
              </button>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
              <button type="button" class="btn btn--secondary" id="cancelDisciplineModal">Cancelar</button>
              <button type="submit" class="btn btn--primary">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    renderColorPicker();
    renderList();
    bindEvents();
  }

  // ── Color Picker ─────────────────────────────────────────────

  function renderColorPicker(selected) {
    const picker = document.getElementById('colorPicker');
    if (!picker) return;
    picker.innerHTML = COLORS.map(c => `
      <div class="color-swatch ${selected === c ? 'selected' : ''}"
        data-color="${c}"
        style="background:${c};"
        title="${c}">
      </div>
    `).join('');

    picker.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });

    // Seleciona o primeiro por padrão se nenhum estiver selecionado
    if (!selected) {
      picker.querySelector('.color-swatch')?.classList.add('selected');
    }
  }

  function getSelectedColor() {
    const sel = document.querySelector('.color-swatch.selected');
    return sel ? sel.dataset.color : COLORS[0];
  }

  // ── Lista de Disciplinas ─────────────────────────────────────

  function renderList() {
    const list = getDisciplines();
    const container = document.getElementById('disciplinesList');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">📚</span>
          <p>Nenhuma disciplina cadastrada ainda.<br/>Clique em <strong>Nova Disciplina</strong> para começar.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="disciplines-grid">
        ${list.map(d => renderDisciplineCard(d)).join('')}
      </div>`;

    // Bind nos botões dos cards
    container.querySelectorAll('.btn-edit-discipline').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete-discipline').forEach(btn => {
      btn.addEventListener('click', () => deleteDiscipline(btn.dataset.id));
    });
  }

  function renderDisciplineCard(d) {
    const slots = (d.schedule || []).map(s =>
      `${getDayBadge(s.day)} <span style="font-size:.78rem;color:var(--text-secondary);">${s.start}–${s.end}</span>`
    ).join('<br/>');

    return `
      <div class="discipline-card" style="border-left: 4px solid ${d.color || 'var(--emerald)'};">
        <div class="discipline-card__top">
          <div>
            <div class="discipline-card__name">${d.name}</div>
            <div class="discipline-card__teacher">
              ${d.teacher ? `👨‍🏫 ${d.teacher}` : '<span style="color:var(--text-muted)">Sem professor cadastrado</span>'}
            </div>
          </div>
          <div class="discipline-card__actions">
            <button class="btn btn--secondary btn-edit-discipline" data-id="${d.id}"
              style="padding:5px 10px; font-size:.78rem;">Editar</button>
            <button class="btn btn--danger btn-delete-discipline" data-id="${d.id}"
              style="padding:5px 10px; font-size:.78rem;">Excluir</button>
          </div>
        </div>
        <div class="discipline-card__schedule">
          ${slots || '<span style="color:var(--text-muted);font-size:.8rem;">Sem horários cadastrados</span>'}
        </div>
      </div>`;
  }

  // ── Modal ────────────────────────────────────────────────────

  function openModal() {
    document.getElementById('disciplineModal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('disciplineModal').classList.remove('open');
    document.getElementById('disciplineForm').reset();
    document.getElementById('disciplineId').value = '';
    document.getElementById('modalDisciplineTitle').textContent = 'Nova Disciplina';
    resetSlots();
    renderColorPicker();
  }

  function openEditModal(id) {
    const list = getDisciplines();
    const d = list.find(x => x.id === id);
    if (!d) return;

    document.getElementById('modalDisciplineTitle').textContent = 'Editar Disciplina';
    document.getElementById('disciplineId').value = d.id;
    document.getElementById('disciplineName').value = d.name;
    document.getElementById('disciplineTeacher').value = d.teacher || '';

    renderColorPicker(d.color);

    // Preenche horários
    const slotsContainer = document.getElementById('scheduleSlots');
    slotsContainer.innerHTML = '';
    const slots = d.schedule && d.schedule.length > 0
      ? d.schedule
      : [{ day: 'Segunda', start: '08:00', end: '10:00' }];

    slots.forEach((s, i) => addSlotRow(s.day, s.start, s.end));

    openModal();
  }

  // ── Slots de Horário ─────────────────────────────────────────

  function resetSlots() {
    const slotsContainer = document.getElementById('scheduleSlots');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '';
    addSlotRow('Segunda', '08:00', '10:00');
  }

  function addSlotRow(day = 'Segunda', start = '08:00', end = '10:00') {
    const slotsContainer = document.getElementById('scheduleSlots');
    const div = document.createElement('div');
    div.className = 'schedule-slot';
    div.innerHTML = `
      <select class="slot-day">
        ${DAYS.map(d => `<option value="${d}" ${d === day ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <input type="time" class="slot-start" value="${start}" />
      <span style="color:var(--text-muted);font-size:.85rem;">até</span>
      <input type="time" class="slot-end" value="${end}" />
      <button type="button" class="btn-remove-slot" title="Remover">✕</button>
    `;
    div.querySelector('.btn-remove-slot').addEventListener('click', () => {
      if (slotsContainer.children.length > 1) div.remove();
    });
    slotsContainer.appendChild(div);
  }

  function getSlots() {
    return Array.from(document.querySelectorAll('.schedule-slot')).map(row => ({
      day:   row.querySelector('.slot-day').value,
      start: row.querySelector('.slot-start').value,
      end:   row.querySelector('.slot-end').value,
    }));
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function saveDiscipline(e) {
    e.preventDefault();

    const id     = document.getElementById('disciplineId').value;
    const name   = document.getElementById('disciplineName').value.trim();
    const teacher= document.getElementById('disciplineTeacher').value.trim();
    const color  = getSelectedColor();
    const schedule = getSlots();

    if (!name) return;

    let list = getDisciplines();

    if (id) {
      // Editar
      list = list.map(d => d.id === id
        ? { ...d, name, teacher, color, schedule }
        : d
      );
    } else {
      // Novo
      list.push({ id: Storage.generateId(), name, teacher, color, schedule });
    }

    saveDisciplines(list);
    closeModal();
    renderList();
  }

  function deleteDiscipline(id) {
    if (!confirm('Deseja excluir esta disciplina?')) return;
    const list = getDisciplines().filter(d => d.id !== id);
    saveDisciplines(list);
    renderList();
  }

  // ── Eventos ──────────────────────────────────────────────────

  function bindEvents() {
    document.getElementById('btnNewDiscipline')
      .addEventListener('click', () => { resetSlots(); openModal(); });

    document.getElementById('closeDisciplineModal')
      .addEventListener('click', closeModal);

    document.getElementById('cancelDisciplineModal')
      .addEventListener('click', closeModal);

    document.getElementById('disciplineModal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'disciplineModal') closeModal();
      });

    document.getElementById('disciplineForm')
      .addEventListener('submit', saveDiscipline);

    document.getElementById('btnAddSlot')
      .addEventListener('click', () => addSlotRow());
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    render();
  }

  return { init, render };

})();
