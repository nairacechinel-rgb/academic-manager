// Inicialização e roteamento entre módulos

document.addEventListener('DOMContentLoaded', () => {

  // ── Data na topbar ──────────────────────────────────────────
  const topbarDate = document.getElementById('topbarDate');
  if (topbarDate) {
    const now = new Date();
    topbarDate.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  // ── Toggle sidebar (mobile) ─────────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Fecha sidebar ao clicar fora (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // ── Roteamento via nav ──────────────────────────────────────
  const navItems = document.querySelectorAll('.nav__item');
  const moduleLabel = document.getElementById('currentModuleLabel');
  const modules = document.querySelectorAll('.module');

  const MODULE_LABELS = {
    dashboard:  'Dashboard',
    curriculum: 'Grade Curricular',
    tasks:      'Tarefas e Eventos',
    schedule:   'Cronograma',
    content:    'Conteúdos'
  };

    function activateModule(moduleId) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.module === moduleId);
    });

    moduleLabel.textContent = MODULE_LABELS[moduleId] || moduleId;

    modules.forEach(mod => {
      mod.classList.toggle('hidden', mod.id !== `module-${moduleId}`);
    });

    if (window.innerWidth <= 768) sidebar.classList.remove('open');

    // Inicializa o módulo correto
    if (moduleId === 'dashboard') updateDashboardStats();
    if (moduleId === 'curriculum') Curriculum.init();
  }
  // ── Dashboard: contadores ───────────────────────────────────
  function updateDashboardStats() {
    const disciplines = Storage.getArray('disciplines');
    const tasks       = Storage.getArray('tasks');
    const events      = Storage.getArray('events');
    const contents    = Storage.getArray('contents');

    document.getElementById('stat-disciplines').textContent = disciplines.length;
    document.getElementById('stat-tasks').textContent =
      tasks.filter(t => !t.done).length;
    document.getElementById('stat-contents').textContent = contents.length;

    // Eventos da semana atual
    const today    = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekEvents = events.filter(ev => {
      const d = new Date(ev.date);
      return d >= weekStart && d <= weekEnd;
    });
    document.getElementById('stat-events').textContent = weekEvents.length;

    // Próximos compromissos
    renderUpcoming([...tasks, ...events]);
  }

  function renderUpcoming(items) {
    const container = document.getElementById('upcomingList');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = items
      .filter(item => item.date && new Date(item.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    if (upcoming.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">📅</span>
          <p>Nenhum compromisso próximo cadastrado.</p>
        </div>`;
      return;
    }

    container.innerHTML = upcoming.map(item => {
      const d = new Date(item.date + 'T00:00:00');
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      const type = item.type || 'task';
      const badgeClass = type === 'exam' ? 'badge--danger'
                        : type === 'event' ? 'badge--moss'
                        : 'badge--green';
      const typeLabel = type === 'exam' ? 'Prova'
                       : type === 'event' ? 'Evento'
                       : 'Tarefa';
      return `
        <div class="card" style="display:flex;align-items:center;gap:14px;margin-bottom:10px;padding:14px 18px;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:.9rem;">${item.title || item.name}</div>
            <div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px;">${dateStr}</div>
          </div>
          <span class="badge ${badgeClass}">${typeLabel}</span>
        </div>`;
    }).join('');
  }

  // ── Init ────────────────────────────────────────────────────
  activateModule('dashboard');
});
