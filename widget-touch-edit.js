// Per-widget tablet edit: ~0.55s header hold then drag in one motion; 2.5s = single-widget resize
(function () {
  const MOVE_THRESHOLD_MS = 550;
  const RESIZE_THRESHOLD_MS = 2000;
  const HEADER_FALLBACK_PX = 40;
  const PROGRESS_START_MS = 350;
  const PRE_MOVE_CANCEL_PX = 24;

  function shouldAllowNativeContextMenu(target) {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(target.closest(
      'input, textarea, select, option, [contenteditable="true"], ' +
      '.blank-text-editable, .styling-modal, .background-modal, ' +
      '#cloud-profiles-modal, #styling-modal, #background-modal, ' +
      '.widget-control-panel, .widget-control-panel *'
    ));
  }

  function shouldSuppressTouchMenu(target) {
    if (!target || !(target instanceof Element)) return false;
    if (shouldAllowNativeContextMenu(target)) return false;
    return Boolean(target.closest(
      '#pages-container, .dashboard, .widget, .page-nav-arrow, ' +
      '.annotation-overlay, .annotation-toolbar, .diagonal-watermark'
    ));
  }

  function suppressContextMenu(e) {
    if (!shouldSuppressTouchMenu(e.target)) return;
    e.preventDefault();
  }

  function bindContextMenuGuard() {
    if (document.documentElement.dataset.touchContextGuardBound) return;
    document.documentElement.dataset.touchContextGuardBound = 'true';

    document.addEventListener('contextmenu', suppressContextMenu, { capture: true });
    document.addEventListener('selectstart', (e) => {
      if (!shouldSuppressTouchMenu(e.target)) return;
      e.preventDefault();
    }, { capture: true });
  }

  let resizeWidget = null;
  let activePress = null;

  function isGlobalEditMode() {
    if (typeof window.isEditMode === 'boolean' && window.isEditMode) return true;
    return Boolean(document.querySelector('.dashboard.page.edit-mode'));
  }

  function isLayoutEditActive() {
    return isGlobalEditMode()
      || Boolean(resizeWidget)
      || Boolean(activePress && activePress.moveReady);
  }

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
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

  function clearResizeMode() {
    if (resizeWidget) {
      resizeWidget.classList.remove('widget-edit-focus', 'widget-move-armed');
      resizeWidget.querySelectorAll('.resize-handle, .rotate-handle').forEach((h) => h.remove());
      resizeWidget = null;
    }
    applyInteractionLock(false);
  }

  function clearSingleWidgetEdit() {
    if (activePress && activePress.dragStarted && window.dakboardDragResize?.endActiveGesture) {
      window.dakboardDragResize.endActiveGesture();
    }
    cancelActivePress();
    clearResizeMode();
  }

  function cancelActivePress() {
    if (!activePress) return;
    const { widget, progressEl, moveTimer, resizeTimer, progressTimer } = activePress;
    clearTimeout(moveTimer);
    clearTimeout(resizeTimer);
    clearTimeout(progressTimer);
    widget.classList.remove('widget-header-pressing', 'widget-header-move-ready');
    if (resizeWidget !== widget) {
      widget.classList.remove('widget-move-armed');
    }
    if (progressEl && progressEl.parentNode) {
      progressEl.remove();
    }
    activePress = null;
    if (!resizeWidget) {
      applyInteractionLock(false);
    }
  }

  function markMoveReady(widget, progressEl) {
    if (!activePress || activePress.widget !== widget) return;
    activePress.moveReady = true;
    widget.classList.add('widget-header-move-ready', 'widget-move-armed');
    progressEl.classList.add('threshold-move');
    applyInteractionLock(true);
    vibrate(40);
  }

  function enterResizeMode(widget) {
    if (activePress?.dragStarted && window.dakboardDragResize?.endActiveGesture) {
      window.dakboardDragResize.endActiveGesture();
    }
    cancelActivePress();

    if (resizeWidget && resizeWidget !== widget) {
      clearResizeMode();
    }

    resizeWidget = widget;
    widget.classList.add('widget-edit-focus', 'widget-move-armed');
    applyInteractionLock(true);

    if (window.dakboardDragResize) {
      window.dakboardDragResize.enableSingleWidgetHandles(widget);
    }

    vibrate(80);
    if (typeof showToast === 'function') {
      showToast('Resize handles on — drag header to move', 1800);
    }
  }

  function startResizeModeDrag(widget, e) {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (window.dakboardDragResize && typeof window.dakboardDragResize.startDrag === 'function') {
      window.dakboardDragResize.startDrag(widget, e);
      activePress = {
        widget,
        dragStarted: true,
        fromResizeMode: true
      };
    }
  }

  function tryStartMoveDrag(e) {
    if (!activePress || !activePress.moveReady || activePress.dragStarted) return;

    const widget = activePress.widget;
    activePress.dragStarted = true;
    widget.classList.add('widget-move-armed');
    applyInteractionLock(true);

    if (e.cancelable) {
      e.preventDefault();
    }

    if (window.dakboardDragResize && typeof window.dakboardDragResize.startDrag === 'function') {
      window.dakboardDragResize.startDrag(widget, e);
    }
  }

  function onDragComplete(widget) {
    if (activePress?.widget === widget) {
      if (activePress.fromResizeMode) {
        activePress = null;
        return;
      }
      cancelActivePress();
    } else if (resizeWidget !== widget) {
      widget.classList.remove('widget-move-armed');
      if (!resizeWidget) {
        applyInteractionLock(false);
      }
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

    // In resize mode, header press-drag moves immediately (green border stays)
    if (resizeWidget === widget) {
      startResizeModeDrag(widget, e);
      return;
    }

    if (resizeWidget && resizeWidget !== widget) {
      clearSingleWidgetEdit();
    }

    cancelActivePress();

    // Suppress Android Chrome long-press Download/Share/Print menu for header holds
    if (e.cancelable) {
      e.preventDefault();
    }

    const header = widget.querySelector('.widget-header') || widget;
    const progressEl = document.createElement('div');
    progressEl.className = 'widget-header-press-progress';
    header.style.position = header.style.position || 'relative';
    header.appendChild(progressEl);

    const moveTimer = setTimeout(() => {
      markMoveReady(widget, progressEl);
    }, MOVE_THRESHOLD_MS);

    const resizeTimer = setTimeout(() => {
      enterResizeMode(widget);
    }, RESIZE_THRESHOLD_MS);

    const progressTimer = setTimeout(() => {
      if (!activePress || activePress.widget !== widget) return;
      widget.classList.add('widget-header-pressing');
    }, PROGRESS_START_MS);

    activePress = {
      widget,
      pressStart: Date.now(),
      startX: x,
      startY: y,
      moveTimer,
      resizeTimer,
      progressTimer,
      progressEl,
      moveReady: false,
      dragStarted: false
    };
  }

  function handlePressMove(e) {
    if (!activePress) return;

    const { x, y, widget, moveReady } = activePress;

    if (!moveReady) {
      if (Math.hypot(x - activePress.startX, y - activePress.startY) > PRE_MOVE_CANCEL_PX) {
        handlePressCancel();
      }
      return;
    }

    tryStartMoveDrag(e);
  }

  function handlePressEnd() {
    if (!activePress) return;

    const { widget, dragStarted, fromResizeMode } = activePress;

    if (fromResizeMode) {
      if (dragStarted && window.dakboardDragResize?.endActiveGesture) {
        window.dakboardDragResize.endActiveGesture();
      }
      activePress = null;
      return;
    }

    if (resizeWidget === widget) {
      cancelActivePress();
      return;
    }

    if (dragStarted) {
      cancelActivePress();
      return;
    }

    cancelActivePress();
  }

  function handlePressCancel() {
    cancelActivePress();
  }

  function onTapOutside(e) {
    if (!activePress?.moveReady && !resizeWidget) return;
    if (isGlobalEditMode()) return;

    const target = e.target;
    if (target.closest('#edit-layout-toggle, .edit-mode-toggle, label.edit-mode-toggle')) {
      clearSingleWidgetEdit();
      return;
    }

    if (resizeWidget && resizeWidget.contains(target)) return;
    if (activePress?.dragStarted && activePress.widget.contains(target)) return;
    if (activePress?.moveReady && activePress.widget.contains(target)) return;

    const otherWidget = target.closest('.widget');
    if (otherWidget) {
      clearSingleWidgetEdit();
      return;
    }

    clearSingleWidgetEdit();
  }

  function bindWidgetHeaderPress() {
    bindContextMenuGuard();

    const container = document.getElementById('pages-container');
    if (!container || container.dataset.widgetTouchEditBound) return;
    container.dataset.widgetTouchEditBound = 'true';

    container.addEventListener('touchstart', handlePressStart, { passive: false, capture: true });
    container.addEventListener('touchmove', handlePressMove, { passive: false, capture: true });
    container.addEventListener('touchend', handlePressEnd, { capture: true });
    container.addEventListener('touchcancel', handlePressCancel, { capture: true });
    container.addEventListener('mousedown', handlePressStart, { capture: true });
    container.addEventListener('mousemove', handlePressMove, { capture: true });
    container.addEventListener('mouseup', handlePressEnd, { capture: true });
    container.addEventListener('mouseleave', handlePressCancel, { capture: true });

    document.addEventListener('pointerdown', onTapOutside, true);
  }

  window.widgetTouchEdit = {
    isMoveArmed(widget) {
      return resizeWidget === widget
        || Boolean(
          activePress
          && activePress.widget === widget
          && (activePress.moveReady || activePress.fromResizeMode)
        );
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
