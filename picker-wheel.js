// Picker Wheel widget — configurable weighted slices, center tap to spin
(function () {
  const MAX_CHOICES = 20;
  const SPIN_DURATION_MS = 4000;
  const pickerWheelStates = new Map();

  function getDefaultPickerWheelConfig() {
    return {
      choices: [
        { id: 'choice-1', label: 'YES', color: '#22c55e', weight: 1 },
        { id: 'choice-2', label: 'NO', color: '#ef4444', weight: 1 }
      ]
    };
  }

  function normalizePickerWheelConfig(config) {
    const defaults = getDefaultPickerWheelConfig();
    if (!config || !Array.isArray(config.choices) || config.choices.length < 2) {
      return JSON.parse(JSON.stringify(defaults));
    }
    const choices = config.choices.slice(0, MAX_CHOICES).map((choice, index) => ({
      id: choice.id || `choice-${index + 1}`,
      label: String(choice.label || `Choice ${index + 1}`).trim() || `Choice ${index + 1}`,
      color: choice.color || '#4a90e2',
      weight: Math.max(1, parseInt(choice.weight, 10) || 1)
    }));
    while (choices.length < 2) {
      choices.push({
        id: `choice-${choices.length + 1}`,
        label: `Choice ${choices.length + 1}`,
        color: '#4a90e2',
        weight: 1
      });
    }
    return { choices };
  }

  function polarToCartesian(cx, cy, radius, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.sin(rad),
      y: cy - radius * Math.cos(rad)
    };
  }

  function describeSlice(cx, cy, radius, startAngle, endAngle) {
    if (endAngle - startAngle >= 360) {
      return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} Z`;
    }
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  }

  function computeSliceAngles(choices) {
    const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
    let cursor = 0;
    return choices.map((choice) => {
      const sweep = (choice.weight / totalWeight) * 360;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      return { start, end, mid: start + sweep / 2 };
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function buildPickerWheelHtml(config, options = {}) {
    const normalized = normalizePickerWheelConfig(config);
    const compact = options.compact === true;
    const selectedIndex = typeof options.selectedIndex === 'number' ? options.selectedIndex : -1;
    const interactive = options.interactive !== false;
    const size = options.size || (compact ? 180 : 220);
    const cx = 100;
    const cy = 100;
    const radius = 92;
    const slices = computeSliceAngles(normalized.choices);

    const slicePaths = normalized.choices.map((choice, index) => {
      const { start, end, mid } = slices[index];
      const path = describeSlice(cx, cy, radius, start, end);
      const selectedClass = index === selectedIndex ? ' picker-wheel-slice-selected' : '';
      const dimClass = selectedIndex >= 0 && index !== selectedIndex ? ' picker-wheel-slice-dimmed' : '';
      const labelRadius = radius * 0.62;
      const labelPos = polarToCartesian(cx, cy, labelRadius, mid);
      const fontSize = normalized.choices.length > 8 ? 7 : normalized.choices.length > 5 ? 8 : 10;
      const label = escapeHtml(choice.label);
      return `
        <path class="picker-wheel-slice${selectedClass}${dimClass}" data-choice-index="${index}"
          d="${path}" fill="${choice.color}" stroke="#1a1a1a" stroke-width="1.5"/>
        <text class="picker-wheel-slice-label" x="${labelPos.x}" y="${labelPos.y}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="${fontSize}" fill="#ffffff" font-weight="700"
          style="pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.65);">${label}</text>`;
    }).join('');

    const spinBtn = interactive
      ? `<button type="button" class="picker-wheel-spin-btn" aria-label="Spin wheel" title="Spin">▶</button>`
      : '';

    return `
      <div class="picker-wheel-stage${compact ? ' picker-wheel-stage-compact' : ''}" style="width:${size}px;height:${size}px;">
        <div class="picker-wheel-pointer" aria-hidden="true"></div>
        <div class="picker-wheel-rotator">
          <svg class="picker-wheel-svg" viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
            <circle cx="${cx}" cy="${cy}" r="${radius + 2}" fill="none" stroke="#3a3a3a" stroke-width="3"/>
            <g class="picker-wheel-slices">${slicePaths}</g>
          </svg>
        </div>
        ${spinBtn}
      </div>`;
  }

  function getPickerWheelConfigForWidget(widget) {
    if (!widget) return getDefaultPickerWheelConfig();
    const page = widget.closest('.dashboard.page');
    const pageIndex = page ? parseInt(page.dataset.pageId, 10) : (window.currentPageIndex || 0);
    const fullId = typeof resolveWidgetFullId === 'function'
      ? resolveWidgetFullId(widget, pageIndex)
      : null;
    if (!fullId) return getDefaultPickerWheelConfig();
    try {
      const saved = localStorage.getItem(`dakboard-widget-styles-${fullId}`);
      if (saved) {
        const styles = JSON.parse(saved);
        if (styles.pickerWheelConfig) {
          return normalizePickerWheelConfig(styles.pickerWheelConfig);
        }
      }
    } catch (e) {
      console.warn('Error reading picker wheel config:', e);
    }
    return getDefaultPickerWheelConfig();
  }

  function pickWeightedIndex(choices) {
    const total = choices.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < choices.length; i++) {
      roll -= choices[i].weight;
      if (roll <= 0) return i;
    }
    return choices.length - 1;
  }

  function highlightSlice(widget, selectedIndex) {
    widget.querySelectorAll('.picker-wheel-slice').forEach((slice, index) => {
      slice.classList.toggle('picker-wheel-slice-selected', index === selectedIndex);
      slice.classList.toggle('picker-wheel-slice-dimmed', selectedIndex >= 0 && index !== selectedIndex);
    });
  }

  function spinPickerWheel(widget, fullWidgetId) {
    if (!widget || widget.classList.contains('hidden')) return;
    if (typeof window.isEditMode === 'boolean' && window.isEditMode) return;

    const state = pickerWheelStates.get(fullWidgetId) || { rotation: 0, spinning: false, selectedIndex: -1 };
    if (state.spinning) return;

    const config = getPickerWheelConfigForWidget(widget);
    const winnerIndex = pickWeightedIndex(config.choices);
    const slices = computeSliceAngles(config.choices);
    const midAngle = slices[winnerIndex].mid;

    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const currentMod = ((state.rotation % 360) + 360) % 360;
    let delta = -midAngle - currentMod;
    while (delta < 180) delta += 360;
    const targetRotation = state.rotation + fullSpins * 360 + delta;

    const rotator = widget.querySelector('.picker-wheel-rotator');
    const spinBtn = widget.querySelector('.picker-wheel-spin-btn');
    if (!rotator) return;

    state.spinning = true;
    state.selectedIndex = -1;
    highlightSlice(widget, -1);
    if (spinBtn) spinBtn.disabled = true;

    rotator.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
    rotator.style.transform = `rotate(${targetRotation}deg)`;

    const onEnd = (e) => {
      if (e.propertyName && e.propertyName !== 'transform') return;
      rotator.removeEventListener('transitionend', onEnd);
      state.rotation = targetRotation;
      state.spinning = false;
      state.selectedIndex = winnerIndex;
      highlightSlice(widget, winnerIndex);
      if (spinBtn) spinBtn.disabled = false;
      pickerWheelStates.set(fullWidgetId, state);
    };

    rotator.addEventListener('transitionend', onEnd);
    pickerWheelStates.set(fullWidgetId, state);
  }

  function computeWheelSize(widget) {
    const container = widget.querySelector('.picker-wheel-content');
    if (!container) return 220;
    const available = Math.min(container.clientWidth, container.clientHeight);
    if (!available || available < 80) return 220;
    return Math.max(100, Math.min(available - 8, 300));
  }

  function mountPickerWheel(widget, config, fullWidgetId) {
    const container = widget.querySelector('.picker-wheel-content');
    if (!container) return;

    const state = pickerWheelStates.get(fullWidgetId) || { rotation: 0, spinning: false, selectedIndex: -1 };
    if (state.selectedIndex >= config.choices.length) {
      state.selectedIndex = -1;
    }
    if (state.spinning) {
      state.spinning = false;
    }
    container.innerHTML = buildPickerWheelHtml(config, {
      interactive: true,
      selectedIndex: state.selectedIndex,
      size: computeWheelSize(widget)
    });

    const rotator = container.querySelector('.picker-wheel-rotator');
    if (rotator) {
      rotator.style.transition = 'none';
      rotator.style.transform = `rotate(${state.rotation}deg)`;
      void rotator.offsetWidth;
      rotator.style.transition = '';
    }

    const spinBtn = container.querySelector('.picker-wheel-spin-btn');
    if (spinBtn && !spinBtn.dataset.listenerAttached) {
      spinBtn.dataset.listenerAttached = 'true';
      spinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        spinPickerWheel(widget, fullWidgetId);
      });
    }

    pickerWheelStates.set(fullWidgetId, state);
  }

  function loadPickerWheel() {
    const pageIndex = typeof window.currentPageIndex !== 'undefined' ? window.currentPageIndex : 0;
    const pageElement = typeof getPageElement === 'function'
      ? getPageElement(pageIndex)
      : document.querySelector(`.dashboard.page[data-page-id="${pageIndex}"]`);
    if (!pageElement) return;

    const widgets = pageElement.querySelectorAll('.picker-wheel-widget:not(.hidden)');
    widgets.forEach((widget) => {
      const classes = Array.from(widget.classList);
      const instanceIdClass = classes.find((c) => c.startsWith('picker-wheel-widget-page-') && c.includes('-instance-'));
      const fullWidgetId = instanceIdClass || classes.find((c) => c.includes('picker-wheel-widget'));
      if (!fullWidgetId) return;

      const config = getPickerWheelConfigForWidget(widget);
      mountPickerWheel(widget, config, fullWidgetId);
    });
  }

  window.getDefaultPickerWheelConfig = getDefaultPickerWheelConfig;
  window.normalizePickerWheelConfig = normalizePickerWheelConfig;
  window.buildPickerWheelHtml = buildPickerWheelHtml;
  window.loadPickerWheel = loadPickerWheel;
})();
