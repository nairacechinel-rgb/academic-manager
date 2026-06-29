// ============================================================
//  MÓDULO — GERADOR DE CRONOGRAMA AUTOMÁTICO
//  Distribui conteúdos de estudo nos horários livres da semana,
//  respeitando aulas e compromissos já cadastrados.
// ============================================================

const Schedule = (() => {

  const STORAGE_KEY = 'schedule_blocks';

  const DAYS_WEEK = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const DAYS_ABBR = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // Horário comercial de estudo: 06h às 23h, blocos de 30min
  const DAY_START = 6;   // hora início
  const DAY_END   = 23;  // hora fim

  // ── Helpers gerais ───────────────────────────────────────────

  function getDisciplines()  { return Storage.getArray('disciplines');  }
  function getTasks()        { return Storage.getArray('tasks');        }
  function getEvents()       { return Storage.getArray('events');       }
  function getContents()     { return Storage.getArray('contents');     }
  function getBlocks()       { return Storage.getArray(STORAGE_KEY);   }
  function saveBlocks(list)  { Storage.set(STORAGE_KEY, list);         }

  // Retorna a segunda-feira da semana atual
  function getWeekStart(offset = 0) {
    const today = new Date();
    const day   = today.getDay(); // 0=Dom
    const diff  = (day === 0 ? -6 : 1 - day) + offset * 7;
    const mon   = new Date(today);
    mon.setDate(today.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function toTimeStr(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  function dateToYMD(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatDateBR(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  // ── Algoritmo principal ──────────────────────────────────────

  function generateSchedule(weekOffset = 0) {
    const weekStart  = getWeekStart(weekOffset);
    const disciplines = getDisciplines();
    const tasks       = getTasks();
    const events      = getEvents();
    const contents    = getContents().filter(c =>
      c.status !== 'done'
    );

    if (contents.length === 0) return [];

    // Monta mapa de blocos ocupados por dia (0=Seg ... 6=Sáb)
    // Cada dia da semana tem um array de intervalos { start, end } em minutos
    const busyMap = buildBusyMap(weekStart, disciplines, tasks, events);

    // Calcula horas de estudo necessárias por conteúdo
    const studyItems = contents.map(c => {
      const disc = disciplines.find(d => d.id === c.disciplineId);
      return {
        ...c,
        discName:   disc ? disc.name  : 'Geral',
        discColor:  disc ? disc.color : 'var(--emerald)',
        hoursLeft:  c.estimatedHours || 1,
        minutesLeft: Math.round((c.estimatedHours || 1) * 60),
      };
    });

    // Prioriza: difícil > médio > fácil, e examId definido sobe na fila
    studyItems.sort((a, b) => {
      const examPrio = (!!b.examId ? 1 : 0) - (!!a.examId ? 1 : 0);
      if (examPrio !== 0) return examPrio;
      const diffOrder = { hard: 0, medium: 1, easy: 2 };
      return (diffOrder[a.difficulty] || 1) - (diffOrder[b.difficulty] || 1);
    });

    const blocks = [];

    // Para cada dia da semana (Seg=0 até Sáb=5, Dom=6 opcional)
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const date    = addDays(weekStart, dayIdx);
      const dateStr = dateToYMD(date);
      const busy    = busyMap[dayIdx] || [];

      // Slots livres do dia em minutos
      const freeSlots = getFreeSlots(busy, DAY_START * 60, DAY_END * 60);

      for (const slot of freeSlots) {
        let cursor = slot.start;

        while (cursor + 30 <= slot.end && studyItems.some(s => s.minutesLeft > 0)) {
          // Pega próximo conteúdo com tempo restante
          const item = studyItems.find(s => s.minutesLeft > 0);
          if (!item) break;

          // Duração do bloco: mínimo 30min, máximo 90min ou o que restar
          const blockDuration = Math.min(90, item.minutesLeft, slot.end - cursor);
          if (blockDuration < 30) break;

          // Arredonda para múltiplos de 30
          const rounded = Math.floor(blockDuration / 30) * 30;

          blocks.push({
            id:         Storage.generateId(),
            date:       dateStr,
            dayIdx,
            start:      toTimeStr(cursor),
            end:        toTimeStr(cursor + rounded),
            contentId:  item.id,
            topic:      item.topic,
            discName:   item.discName,
            discColor:  item.discColor,
            type:       'study',
            generated:  true,
          });

          item.minutesLeft -= rounded;
          cursor += rounded;

          // Pausa de 10min a cada 90min (não aloca, só avança cursor)
          if (rounded >= 90) cursor += 10;
        }
      }
    }

    return blocks;
  }

  // Monta mapa de ocupação: { dayIdx: [{start, end, label, color, type}] }
  function buildBusyMap(weekStart, disciplines, tasks, events) {
    const map = {};
    for (let i = 0; i < 7; i++) map[i] = [];

    // 1. Horários de aula das disciplinas (recorrentes por dia da semana)
    const dayNameToIdx = {
      'Segunda': 0, 'Terça': 1, 'Quarta': 2,
      'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6
    };

    disciplines.forEach(d => {
      (d.schedule || []).forEach(slot => {
        const idx = dayNameToIdx[slot.day];
        if (idx === undefined) return;
        map[idx].push({
          start: toMinutes(slot.start),
          end:   toMinutes(slot.end),
          label: d.name,
          color: d.color,
          type:  'class',
        });
      });
    });

    // 2. Tarefas e eventos com hora definida na semana atual
    [...tasks, ...events].forEach(item => {
      if (!item.date || !item.time) return;
      const itemDate = new Date(item.date + 'T00:00:00');
      const diff = Math.round((itemDate - weekStart) / 86400000);
      if (diff < 0 || diff > 6) return;

      const startMin = toMinutes(item.time);
      map[diff].push({
        start: startMin,
        end:   startMin + 60, // assume 1h se não tiver duração
        label: item.title,
        color: 'var(--warning)',
        type:  'event',
      });
    });

    // Ordena e mescla sobreposições
    for (let i = 0; i < 7; i++) {
      map[i].sort((a, b) => a.start - b.start);
    }

    return map;
  }

  // Retorna slots livres dado um array de busy e o intervalo do dia
  function getFreeSlots(busy, dayStart, dayEnd) {
    const free = [];
    let cursor = dayStart;

    busy.forEach(b => {
      if (b.start > cursor) {
        free.push({ start: cursor, end: Math.min(b.start, dayEnd) });
      }
      cursor = Math.max(cursor, b.end);
    });

    if (cursor < dayEnd) {
      free.push({ start: cursor, end: dayEnd });
    }

    // Filtra slots menores que 30min
    return free.filter(s => s.end - s.start >= 30);
  }

  // ── Renderização ─────────────────────────────────────────────

  let currentWeekOffset = 0;

  function render() {
    const container = document.getElementById('module-schedule');
    if (!container) return;

    container.innerHTML = `
      <div class="module__header">
        <h1 class="module__title">Cronograma Automático</h1>
        <p class="module__subtitle">
          Distribuição inteligente dos seus conteúdos nos horários livres da semana.
        </p>
      </div>

      <!-- Controles -->
      <div class="schedule-controls">
        <div class="schedule-nav">
          <button class="btn btn--secondary" id="btnPrevWeek">← Semana anterior</button>
          <span class="schedule-week-label" id="weekLabel"></span>
          <button class="btn btn--secondary" id="btnNextWeek">Próxima semana →</button>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn--secondary" id="btnClearSchedule">🗑 Limpar</button>
          <button class="btn btn--primary"   id="btnGenerate">
            ⚡ Gerar Cronograma
          </button>
        </div>
      </div>

      <!-- Legenda -->
      <div class="schedule-legend" id="scheduleLegend"></div>

      <!-- Grade semanal -->
      <div class="schedule-grid-wrap">
        <div class="schedule-grid" id="scheduleGrid"></div>
      </div>

      <!-- Lista do dia (mobile/detalhe) -->
      <div id="scheduleDayDetail"></div>
    `;

    currentWeekOffset = 0;
    updateWeekLabel();
    renderGrid();
    bindEvents();
  }

  function updateWeekLabel() {
    const label     = document.getElementById('weekLabel');
    const weekStart = getWeekStart(currentWeekOffset);
    const weekEnd   = addDays(weekStart, 6);
    label.textContent = `${formatDateBR(dateToYMD(weekStart))} – ${formatDateBR(dateToYMD(weekEnd))}`;
  }

  // ── Grade semanal ────────────────────────────────────────────

  function renderGrid() {
    const grid = document.getElementById('scheduleGrid');
    if (!grid) return;

    const weekStart   = getWeekStart(currentWeekOffset);
    const disciplines = getDisciplines();
    const tasks       = getTasks();
    const events      = getEvents();
    const blocks      = getBlocks();
    const busyMap     = buildBusyMap(weekStart, disciplines, tasks, events);

    // Filtra blocos gerados para esta semana
    const weekDates = Array.from({ length: 7 }, (_, i) => dateToYMD(addDays(weekStart, i)));
    const weekBlocks = blocks.filter(b => weekDates.includes(b.date));

    // Cabeçalho dos dias
    let headerHtml = '<div class="sg-corner"></div>';
    for (let i = 0; i < 7; i++) {
      const date    = addDays(weekStart, i);
      const dateStr = dateToYMD(date);
      const today   = dateToYMD(new Date());
      const isToday = dateStr === today;
      headerHtml += `
        <div class="sg-day-header ${isToday ? 'sg-today' : ''}">
          <span class="sg-day-name">${DAYS_ABBR[i === 6 ? 0 : i + 1]}</span>
          <span class="sg-day-date">${date.getDate()}/${date.getMonth() + 1}</span>
        </div>`;
    }

    // Linhas de hora
    let rowsHtml = '';
    for (let hour = DAY_START; hour < DAY_END; hour++) {
      rowsHtml += `
        <div class="sg-time-label">${hour.toString().padStart(2,'0')}:00</div>`;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dateStr  = weekDates[dayIdx];
        const slotMin  = hour * 60;
        const busy     = busyMap[dayIdx] || [];

        // Verifica se há aula neste slot
        const classBlock = busy.find(b =>
          b.type === 'class' && b.start <= slotMin && b.end > slotMin
        );

        // Verifica se há evento neste slot
        const eventBlock = busy.find(b =>
          b.type === 'event' && b.start <= slotMin && b.end > slotMin
        );

        // Verifica se há bloco de estudo gerado
        const studyBlock = weekBlocks.find(b => {
          if (b.date !== dateStr) return false;
          const bStart = toMinutes(b.start);
          const bEnd   = toMinutes(b.end);
          return bStart <= slotMin && bEnd > slotMin;
        });

        let cellContent = '';
        let cellClass   = 'sg-cell';

        if (classBlock) {
          cellClass += ' sg-cell--class';
          // Só mostra label no primeiro slot do bloco
          if (classBlock.start === slotMin) {
            cellContent = `<span class="sg-block-label"
              style="border-left:3px solid ${classBlock.color};">
              ${classBlock.label}
            </span>`;
          }
        } else if (studyBlock) {
          cellClass += ' sg-cell--study';
          if (toMinutes(studyBlock.start) === slotMin) {
            cellContent = `<span class="sg-block-label"
              style="border-left:3px solid ${studyBlock.discColor}; cursor:pointer;"
              title="${studyBlock.topic}">
              📚 ${studyBlock.topic.slice(0, 22)}${studyBlock.topic.length > 22 ? '…' : ''}
            </span>`;
          }
        } else if (eventBlock) {
          cellClass += ' sg-cell--event';
          if (eventBlock.start === slotMin) {
            cellContent = `<span class="sg-block-label">📅 ${eventBlock.label}</span>`;
          }
        }

        rowsHtml += `<div class="${cellClass}" data-day="${dayIdx}" data-hour="${hour}">
          ${cellContent}
        </div>`;
      }
    }

    grid.innerHTML = headerHtml + rowsHtml;

    // Aplica grid-template-columns
    grid.style.gridTemplateColumns = '60px repeat(7, 1fr)';

    renderLegend(disciplines);
    renderDayDetail(weekBlocks, weekDates);
  }

  function renderLegend(disciplines) {
    const legend = document.getElementById('scheduleLegend');
    if (!legend) return;

    const items = [
      { color: 'var(--moss)',    label: 'Aula' },
      { color: 'var(--emerald)', label: 'Estudo gerado' },
      { color: 'var(--warning)', label: 'Evento/Tarefa' },
    ];

    legend.innerHTML = `
      <div class="legend-items">
        ${items.map(i => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${i.color};"></span>
            <span>${i.label}</span>
          </div>`).join('')}
        ${disciplines.slice(0, 5).map(d => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${d.color};"></span>
            <span>${d.name}</span>
          </div>`).join('')}
      </div>`;
  }

  function renderDayDetail(weekBlocks, weekDates) {
    const container = document.getElementById('scheduleDayDetail');
    if (!container) return;

    if (weekBlocks.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Agrupa por dia
    const byDay = {};
    weekDates.forEach(d => byDay[d] = []);
    weekBlocks.forEach(b => {
      if (byDay[b.date]) byDay[b.date].push(b);
    });

    let html = '<h2 class="section__title" style="margin-top:28px;">Resumo da Semana</h2>';
    html += '<div class="schedule-summary">';

    weekDates.forEach((dateStr, i) => {
      const dayBlocks = byDay[dateStr];
      if (!dayBlocks || dayBlocks.length === 0) return;

      const dayName   = DAYS_ABBR[i === 6 ? 0 : i + 1];
      const totalMin  = dayBlocks.reduce((acc, b) =>
        acc + toMinutes(b.end) - toMinutes(b.start), 0
      );
      const totalHrs  = (totalMin / 60).toFixed(1);

      html += `
        <div class="summary-day">
          <div class="summary-day__header">
            <span class="summary-day__name">${dayName} ${formatDateBR(dateStr)}</span>
            <span class="badge badge--green">⏱ ${totalHrs}h</span>
          </div>
          ${dayBlocks.sort((a,b) => a.start.localeCompare(b.start)).map(b => `
            <div class="summary-block" style="border-left:3px solid ${b.discColor};">
              <span class="summary-block__time">${b.start}–${b.end}</span>
              <span class="summary-block__topic">📚 ${b.topic}</span>
              <span class="summary-block__disc" style="color:${b.discColor};">${b.discName}</span>
            </div>`).join('')}
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // ── Bind de eventos ──────────────────────────────────────────

  function bindEvents() {
    document.getElementById('btnGenerate').addEventListener('click', () => {
      const existing = getBlocks();
      const weekStart = getWeekStart(currentWeekOffset);
      const weekDates = Array.from({ length: 7 }, (_, i) =>
        dateToYMD(addDays(weekStart, i))
      );

      // Remove blocos gerados desta semana antes de regerar
      const kept = existing.filter(b => !weekDates.includes(b.date) || !b.generated);

      const newBlocks = generateSchedule(currentWeekOffset);

      if (newBlocks.length === 0) {
        alert('Nenhum horário livre encontrado ou nenhum conteúdo pendente cadastrado.\n\nCadastre conteúdos em "Conteúdos de Estudo" com horas estimadas.');
        return;
      }

      saveBlocks([...kept, ...newBlocks]);
      renderGrid();
    });

    document.getElementById('btnClearSchedule').addEventListener('click', () => {
      if (!confirm('Limpar todos os blocos de estudo desta semana?')) return;
      const weekStart = getWeekStart(currentWeekOffset);
      const weekDates = Array.from({ length: 7 }, (_, i) =>
        dateToYMD(addDays(weekStart, i))
      );
      const kept = getBlocks().filter(b => !weekDates.includes(b.date));
      saveBlocks(kept);
      renderGrid();
    });

    document.getElementById('btnPrevWeek').addEventListener('click', () => {
      currentWeekOffset--;
      updateWeekLabel();
      renderGrid();
    });

    document.getElementById('btnNextWeek').addEventListener('click', () => {
      currentWeekOffset++;
      updateWeekLabel();
      renderGrid();
    });
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    render();
  }

  return { init };

})();
