// ============================================================
//  APP.JS — Inicialização e roteamento entre módulos
// ============================================================

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
  const sidebar   = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // ── Roteamento via nav ──────────────────────────────────────
  const navItems    = document.querySelectorAll('.nav__item');
  const moduleLabel = document.getElementById('currentModuleLabel');
  const modules     = document.querySelectorAll('.module');

  const MODULE_LABELS = {
    dashboard:  'Dashboard',
    curriculum: 'Grade Curricular',
    tasks:      'Tarefas e Eventos',
    schedule:   'Cronograma',
    content:    'Conteúdos'
  };

  function activateModule(moduleId) {
    // Atualiza itens do nav
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.module === moduleId);
    });

    // Atualiza label da topbar
    moduleLabel.textContent = MODULE_LABELS[moduleId] || moduleId;

    // Mostra apenas o módulo ativo
    modules.forEach(mod => {
      mod.classList.toggle('hidden', mod.id !== `module-${moduleId}`);
    });

    // Fecha sidebar no mobile
    if (window.innerWidth <= 768) sidebar.classList.remove('open');

    // Inicializa o módulo correto
    if (moduleId === 'dashboard')  updateDashboardStats();
    if (moduleId === 'curriculum') Curriculum.init();
    if (moduleId === 'tasks')      Tasks.init();
    if (moduleId === 'content')    Content.init();
    if (moduleId === 'schedule')   Schedule.init();
  }

  // ── Bind dos itens de navegação ─────────────────────────────
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      activateModule(item.dataset.module);
    });
  });

  // ── Dashboard: contadores ───────────────────────────────────
  function updateDashboardStats() {
    const disciplines

