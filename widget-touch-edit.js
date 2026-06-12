// Per-widget tablet edit: 1s header hold = one-shot move, 2.5s = single-widget resize
(function () {
  const MOVE_THRESHOLD_MS = 1000;
  const RESIZE_THRESHOLD_MS = 2500;
  const HEADER_FALLBACK_PX = 40;
  const PROGRESS_START_MS = 800;

  let moveArmedWidget = null;
  let resizeWidget = null;
  let activePress = null;

  function isGlobalEditMode() {
    if (typeof window.isEditMode === 'boolean' && window.isEditMode) return true;
    return Boolean(document.querySelector('.dashboard.page.edit-mode'));
  }

  function isLayoutEditActive() {
    return isGlobalEditMode() || Boolean(resizeWidget) || Boolean(moveArmedWidget);
  }

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function toast(message) {
    if (typeof showToast === 'function') {
      showToast(message, 1800);
    }
  }

  function getPointerCoords(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches[0]) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function isHeaderOrFallbackTouch(widget, clientX, clientY) {
    const header = widget.querySelector('.widget-header');
    if (header) {
      const style = window.getComputedStyle(header);
      if (style.display !== 'none' && style.visibility !== 'hidden' && header.offsetHeight > 0) {
        const rect = header.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          return true;
        }
      }
    }
    const widgetRect = widget.getBoundingClientRect();
    return clientY >= widgetRect.top
      && clientY <= widgetRect.top + HEADER_FALLBACK_PX
      && clientX >= widgetRect.left
      && clientX <= widgetRect.right;
  }

  function applyInteractionLock(locked) {
    const pagesContainer = document.getElementById('pages-container');
    if (locked) {
      document.body.classList.add('widget-single-edit-lock');
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      if (pagesContainer) {
        pagesContainer.style.overflow = 'hidden';
        pagesContainer.style.touchAction = 'none';
      }
      if (typeof window.isAnnotationMode === 'boolean' && window.isAnnotationMode && typeof setAnnotationMode === 'function') {
        setAnnotationMode(false);
      }
    } else if (!isGlobalEditMode()) {
      document.body.classList.remove('widget-single-edit-lock');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (pagesContainer) {
        pagesContainer.style.overflow = '';
        pagesContainer.style.touchAction = '';
      }
    }
  }

  function clearMoveArm() {
    if (moveArmedWidget) {
      moveArmedWidget.classList.remove('widget-move-armed');
      moveArmedWidget = null;
    }
    if (!resizeWidget) {
      applyInteractionLock(false);
    }
  }

  function clearResizeMode() {
    if (resizeWidget) {
      resizeWidget.classList.remove('widget-edit-focus');
      resizeWidget.querySelectorAll('.resize-handle, .rotate-handle').forEach((h) => h.remove());
      resizeWidget = null;
    }
    applyInteractionLock(false);
  }

  function clearSingleWidgetEdit() {
    cancelActivePress();
    clearMoveArm();
    clearResizeMode();
  }

  function cancelActivePress() {
    if (!activePress) return;
    const { widget, progressEl, moveTimer, resizeTimer, progressTimer } = activePress;
    clearTimeout(moveTimer);
    clearTimeout(resizeTimer);
    clearTimeout(progressTimer);
    widget.classList.remove('widget-header-pressing', 'widget-header-move-ready');
    if (progressEl && progressEl.parentNode) {
      progressEl.remove();
    }
    activePress = null;
  }

  function enterResizeMode(widget) {
    cancelActivePress();
    clearMoveArm();

    if (resizeWidget && resizeWidget !== widget) {
      clearResizeMode();
    }

    resizeWidget = widget;
    widget.classList.add('widget-edit-focus');
    applyInteractionLock(true);

    if (window.dakboardDragResize) {
      window.dakboardDragResize.enableSingleWidgetHandles(widget);
    }

    vibrate(80);
    toast('Drag handles to resize');
  }

  function armMoveOneShot(widget) {
    if (resizeWidget) return;

    clearMoveArm();
    moveArmedWidget = widget;
    widget.classList.add('widget-move-armed');
    applyInteractionLock(true);
    vibrate(50);
    toast('Drag once to move');
  }

  function onDragComplete(widget) {
    if (moveArmedWidget === widget) {
      clearMoveArm();
    }
  }

  function handlePressStart(e) {
    if (isGlobalEditMode()) return;
    if (typeof window.isAnnotationMode === 'boolean' && window.isAnnotationMode) return;

    const widget = e.target.closest('.widget');
    if (!widget || widget.classList.contains('hidden')) return;
    if (e.target.closest('button, input, select, .resize-handle, .rotate-handle, .widget-zindex-controls')) return;

    const { x, y } = getPointerCoords(e);
    if (!isHeaderOrFallbackTouch(widget, x, y)) return;

    if (resizeWidget === widget) return;
    if (moveArmedWidget === widget) return;

    if (resizeWidget && resizeWidget !== widget) {
      clearSingleWidgetEdit();
    }

    if (moveArmedWidget && moveArmedWidget !== widget) {
      clearMoveArm();
    }

    cancelActivePress();

    const header = widget.querySelector('.widget-header') || widget;
    const progressEl = document.createElement('div');
    progressEl.className = 'widget-header-press-progress';
    header.style.position = header.style.position || 'relative';
    header.appendChild(progressEl);

    const pressStart = Date.now();
    const moveTimer = setTimeout(() => {
      if (!activePress || activePress.widget !== widget) return;
      widget.classList.add('widget-header-move-ready');
      progressEl.classList.add('threshold-move');
      vibrate(40);
    }, MOVE_THRESHOLD_MS);

    const resizeTimer = setTimeout(() => {
      if (!activePress || activePress.widget !== widget) return;
      enterResizeMode(widget);
    }, RESIZE_THRESHOLD_MS);

    const progressTimer = setTimeout(() => {
      if (!activePress || activePress.widget !== widget) return;
      widget.classList.add('widget-header-pressing');
    }, PROGRESS_START_MS);

    activePress = { widget, pressStart, startX: x, startY: y, moveTimer, resizeTimer, progressTimer, progressEl };
  }

  function handlePressMove(e) {
    if (!activePress) return;
    const { x, y } = getPointerCoords(e);
    if (Math.hypot(x - activePress.startX, y - activePress.startY) > 12) {
      handlePressCancel();
    }
  }

  function handlePressEnd(e) {
    if (!activePress) return;

    const { widget, pressStart, moveTimer, resizeTimer } = activePress;
    const heldMs = Date.now() - pressStart;

    clearTimeout(moveTimer);
    clearTimeout(resizeTimer);
    cancelActivePress();

    if (resizeWidget === widget) return;
    if (heldMs >= MOVE_THRESHOLD_MS && heldMs < RESIZE_THRESHOLD_MS) {
      armMoveOneShot(widget);
    }
  }

  function handlePressCancel() {
    cancelActivePress();
  }

  function onTapOutside(e) {
    if (!moveArmedWidget && !resizeWidget) return;
    if (isGlobalEditMode()) return;

    const target = e.target;
    if (target.closest('#edit-layout-toggle, .edit-mode-toggle, label.edit-mode-toggle')) {
      clearSingleWidgetEdit();
      return;
    }

    if (resizeWidget && resizeWidget.contains(target)) return;
    if (moveArmedWidget && moveArmedWidget.contains(target)) return;

    const otherWidget = target.closest('.widget');
    if (otherWidget) {
      clearSingleWidgetEdit();
      return;
    }

    clearSingleWidgetEdit();
  }

  function bindWidgetHeaderPress() {
    const container = document.getElementById('pages-container');
    if (!container || container.dataset.widgetTouchEditBound) return;
    container.dataset.widgetTouchEditBound = 'true';

    container.addEventListener('touchstart', handlePressStart, { passive: false, capture: true });
    container.addEventListener('touchmove', handlePressMove, { passive: true, capture: true });
    container.addEventListener('touchend', handlePressEnd, { capture: true });
    container.addEventListener('touchcancel', handlePressCancel, { capture: true });
    container.addEventListener('mousedown', handlePressStart, { capture: true });
    container.addEventListener('mouseup', handlePressEnd, { capture: true });
    container.addEventListener('mouseleave', handlePressCancel, { capture: true });

    document.addEventListener('pointerdown', onTapOutside, true);
  }

  window.widgetTouchEdit = {
    isMoveArmed(widget) {
      return moveArmedWidget === widget;
    },
    isResizeActive(widget) {
      return resizeWidget === widget;
    },
    isLayoutEditActive,
    clearSingleWidgetEdit,
    onDragComplete,
    rebind: bindWidgetHeaderPress
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindWidgetHeaderPress);
  } else {
    bindWidgetHeaderPress();
  }
})();
