// Shared simulation controls.
// Expose window.createControlGroup so each simulation sketch can build its own
// labeled slider/control groups without a shared UI framework.
(function () {
  'use strict';

  function createControlGroup(label, min, max, value, onChange) {
    if (typeof window === 'undefined') {
      return null;
    }

    var group = document.createElement('div');
    group.className = 'sim-control-group';

    var labelEl = document.createElement('label');
    labelEl.className = 'sim-control-label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    var input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.value = value;
    input.setAttribute('aria-label', label);
    input.addEventListener('input', function () {
      onChange(parseFloat(input.value));
    });

    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  window.createControlGroup = window.createControlGroup || createControlGroup;
})();
