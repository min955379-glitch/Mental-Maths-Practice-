/**
 * Custom dropdown / select.
 *
 * The Settings page used to show the device's own picker: a full-screen white
 * popup that fights the app's dark theme. This module replaces the *look* of a
 * native <select> without touching what it does:
 *
 *   - the <select> stays in the form, keeps its id and keeps its value, so
 *     renderSettings(), the save handler and StateStore work exactly as before;
 *   - a button + listbox is rendered next to it and drives it, so the value is
 *     written back into the same element the app already reads;
 *   - picking an option saves that one setting straight away through
 *     StateStore (and re-applies the theme), which is what makes Theme switch
 *     the instant you choose it.
 *
 * Keyboard: Enter/Space/Down/Up open, arrows move, Home/End jump, Enter/Space
 * or click select, Escape closes, Tab closes. Clicking outside closes.
 *
 *   window.AppSelect.enhanceAll(root)   // upgrade every <select> in a subtree
 */
(function () {
  'use strict';

  const ARROW = '<svg class="select-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TICK = '<svg class="select-check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M5 13l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const instances = new Set();
  let seq = 0;

  function text(node) { return (node.textContent || '').trim().replace(/\s+/g, ' '); }
  function labelFor(select) {
    let lbl = null;
    if (select.id) { try { lbl = document.querySelector('label[for="' + select.id + '"]'); } catch (e) { lbl = null; } }
    if (!lbl && select.closest) lbl = select.closest('label');
    if (lbl) return text(lbl);
    return select.getAttribute('aria-label') || select.getAttribute('name') || 'Select';
  }
  function optionText(select, value) {
    for (const opt of select.options) if (opt.value === value) return text(opt);
    return '';
  }

  function enhance(select) {
    if (!select || select.dataset.selectEnhanced === 'true') return null;
    select.dataset.selectEnhanced = 'true';
    const uid = 'sel' + (++seq);
    const label = labelFor(select);

    const wrap = document.createElement('div');
    wrap.className = 'select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-trigger';
    trigger.id = uid + '-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', uid + '-menu');
    trigger.setAttribute('aria-label', label);
    trigger.innerHTML = '<span class="select-value"></span>' + ARROW;

    const menu = document.createElement('ul');
    menu.className = 'select-menu';
    menu.id = uid + '-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);
    menu.hidden = true;

    const optionEls = [];
    Array.prototype.forEach.call(select.options, (opt, i) => {
      const li = document.createElement('li');
      li.className = 'select-option';
      li.id = uid + '-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.value = opt.value;
      if (opt.disabled) li.setAttribute('aria-disabled', 'true');
      const span = document.createElement('span');
      span.className = 'select-option-text';
      span.textContent = text(opt);
      li.appendChild(span);
      li.insertAdjacentHTML('beforeend', TICK);
      menu.appendChild(li);
      optionEls.push(li);
    });

    // The native select keeps its place in the form (and its value); it is only
    // hidden from sight and from assistive tech, which now sees the listbox.
    select.classList.add('select-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');
    if (select.parentNode) select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    wrap.appendChild(select);

    /* --------------------------------------------------------------- state */
    let activeIndex = -1;
    let closeTimer = null;

    function selectedIndex() {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === select.value) return i;
      }
      return -1;
    }

    function sync() {
      const idx = selectedIndex();
      trigger.querySelector('.select-value').textContent = optionText(select, select.value);
      optionEls.forEach((li, i) => {
        const on = i === idx;
        li.setAttribute('aria-selected', on ? 'true' : 'false');
        li.classList.toggle('is-selected', on);
      });
    }

    function position() {
      const rect = trigger.getBoundingClientRect();
      if (!rect.height) return;                 // no layout (jsdom): keep it simple
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      menu.style.maxHeight = '';
      const needed = menu.scrollHeight || 240;
      wrap.classList.toggle('select--up', needed > spaceBelow - 12 && spaceAbove > spaceBelow);
      const room = (wrap.classList.contains('select--up') ? spaceAbove : spaceBelow) - 16;
      if (room > 0) menu.style.maxHeight = Math.max(120, Math.min(needed, room)) + 'px';
    }

    function setActive(i) {
      activeIndex = i;
      optionEls.forEach((li, n) => li.classList.toggle('is-active', n === i));
      if (i >= 0) {
        trigger.setAttribute('aria-activedescendant', optionEls[i].id);
        const li = optionEls[i];
        const top = li.offsetTop, bottom = top + li.offsetHeight;
        if (top < menu.scrollTop) menu.scrollTop = top;
        else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
      } else {
        trigger.removeAttribute('aria-activedescendant');
      }
    }

    function isOpen() { return wrap.classList.contains('is-open'); }

    function open(focusIndex) {
      if (select.disabled) return;
      instances.forEach((other) => { if (other !== api) other.close(); });
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      menu.hidden = false;
      position();
      const start = typeof focusIndex === 'number' ? focusIndex : selectedIndex();
      setActive(start);
      trigger.setAttribute('aria-expanded', 'true');
      const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
      raf(() => wrap.classList.add('is-open'));
      document.addEventListener('keydown', onKeydown, true);
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);
    }

    function close(refocus) {
      if (!isOpen() && menu.hidden) return;
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      optionEls.forEach((li) => li.classList.remove('is-active'));
      activeIndex = -1;
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => { menu.hidden = true; closeTimer = null; }, 160);
      if (refocus) trigger.focus();
    }

    function pick(index) {
      const opt = select.options[index];
      if (!opt || opt.disabled) return;
      const changed = select.value !== opt.value;
      select.value = opt.value;
      sync();
      close(true);
      // Any code listening to the native control still hears about it.
      if (changed) {
        let ev;
        try { ev = new Event('change', { bubbles: true }); } catch (e) { ev = document.createEvent('Event'); ev.initEvent('change', true, false); }
        select.dispatchEvent(ev);
      }
      // Save just this setting through the app's own store, then re-apply.
      const key = select.dataset.setting;
      if (key && window.StateStore && typeof window.StateStore.setSettings === 'function') {
        const patch = {};
        patch[key] = select.value;
        window.StateStore.setSettings(patch);
      }
      if (window.UI) {
        if (typeof window.UI.applyTheme === 'function') window.UI.applyTheme();
        if (typeof window.UI.applyMotionPref === 'function') window.UI.applyMotionPref();
        if (typeof window.UI.showToast === 'function') window.UI.showToast(label + ' set to ' + text(opt), 'success');
      }
    }

    function onKeydown(ev) {
      if (!isOpen()) return;
      const key = ev.key;
      if (key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(true); return; }
      if (key === 'Tab') { close(false); return; }
      if (key === 'ArrowDown') { ev.preventDefault(); setActive(Math.min(optionEls.length - 1, (activeIndex < 0 ? -1 : activeIndex) + 1)); return; }
      if (key === 'ArrowUp') { ev.preventDefault(); setActive(Math.max(0, (activeIndex < 0 ? optionEls.length : activeIndex) - 1)); return; }
      if (key === 'Home') { ev.preventDefault(); setActive(0); return; }
      if (key === 'End') { ev.preventDefault(); setActive(optionEls.length - 1); return; }
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        // Stop the event before it reaches the trigger: Enter on a focused
        // button would otherwise synthesise another open straight after this
        // selection closed the menu.
        ev.preventDefault();
        ev.stopPropagation();
        if (activeIndex >= 0) pick(activeIndex);
        return;
      }
    }

    trigger.addEventListener('click', () => { if (isOpen()) close(false); else open(); });
    trigger.addEventListener('keydown', (ev) => {
      if (isOpen() || ev.defaultPrevented) return;
      const key = ev.key;
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ' || key === 'Spacebar') {
        ev.preventDefault();
        open(key === 'ArrowUp' ? Math.max(0, selectedIndex()) : selectedIndex());
      }
    });
    // Clicking the row's <label> focuses the hidden select - forward it.
    select.addEventListener('focus', () => { if (!isOpen()) trigger.focus(); });
    select.addEventListener('change', sync);

    optionEls.forEach((li, i) => {
      li.addEventListener('click', (ev) => { ev.stopPropagation(); pick(i); });
      li.addEventListener('mouseenter', () => { if (isOpen()) setActive(i); });
    });

    const api = { el: wrap, select, trigger, menu, options: optionEls, open, close, sync, isOpen };
    sync();
    instances.add(api);
    return api;
  }

  function enhanceAll(root) {
    const scope = root || document;
    const out = [];
    const list = scope.querySelectorAll ? scope.querySelectorAll('select:not([data-select-enhanced])') : [];
    Array.prototype.forEach.call(list, (sel) => { const api = enhance(sel); if (api) out.push(api); });
    return out;
  }

  function closeAll() { instances.forEach((i) => i.close()); }

  // One global listener closes any open menu when you tap elsewhere.
  document.addEventListener('click', (ev) => {
    instances.forEach((inst) => {
      if (inst.isOpen() && !inst.el.contains(ev.target)) inst.close(false);
    });
  });

  window.AppSelect = { enhance, enhanceAll, closeAll };
})();
