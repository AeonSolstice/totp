import { b32, totp } from './lib.js';

const $ = (a, b = document) => (typeof a === 'string' ? b.querySelector(a) : a);
const $$ = (a, b = document) =>
  typeof a === 'string' ? b.querySelectorAll(a) : a;

const on = (a, b, c) => $(a).addEventListener(c ? b : b.name, c || b);

const show = (a, b = 'block') => ($(a).style.display = b);
const hide = (a) => ($(a).style.display = 'none');

const btnList = $('#btn-list');
const btnGrid = $('#btn-grid');

const viewList = $('#view-list');
const viewListItems = $('.items', viewList);
const viewGrid = $('#view-grid');

const modalBg = $('#modal-bg');
const modalAddSecret = $('#add-secret-modal');

const inputLabel = $('#label-input');
const inputSecret = $('#secret-input');

let view = 'list';

let secrets = JSON.parse(localStorage.getItem('secrets')) ?? [];

function toggleView(kind) {
  if (view === kind) return;

  if (kind === 'list') {
    btnList.classList.add('selected');
    btnGrid.classList.remove('selected');

    show(viewList);
    hide(viewGrid);
  } else {
    btnGrid.classList.add('selected');
    btnList.classList.remove('selected');

    show(viewGrid);
    hide(viewList);
  }

  build();

  view = kind;
}

function build() {
  if (view === 'list') {
    viewListItems.innerHTML = '';

    for (const s of secrets) {
      const item = document.createElement('div');
      const label = document.createElement('p');
      const actions = document.createElement('div');
      const editAction = document.createElement('button');
      const copyAction = document.createElement('button');

      label.className = 'label';
      label.innerText = s.label;

      actions.className = 'actions';

      editAction.disabled = true;
      editAction.dataset.tooltip = 'Edit Secret';
      editAction.appendChild(createIcon('edit'));

      copyAction.dataset.tooltip = 'Copy Code';
      copyAction.appendChild(createIcon('content_copy'));
      on(copyAction, 'click', async () => {
        await copyCode(s);
      });

      actions.append(copyAction, createSep(), editAction);

      item.append(label, actions);
      viewListItems.appendChild(item);
    }
  } else {
  }
}

function createIcon(name) {
  const s = document.createElement('span');
  s.className = 'material-symbols-outlined';
  s.innerText = name;
  return s;
}

function createSep(right) {
  const s = document.createElement('span');
  s.className = 'sep';
  if (right) s.classList.add('right');
  return s;
}

async function copyCode(s) {
  const token = await totp.generate({
    key: b32.decode(s.key),
    digits: s.digits,
    period: s.period,
    ts: Date.now(),
  });

  await navigator.clipboard.writeText(token);
}

on(btnList, 'click', () => {
  toggleView('list');
});

on(btnGrid, 'click', () => {
  toggleView('grid');
});

on('#add-secret', 'click', () => {
  show(modalBg);
  show(modalAddSecret);

  inputLabel.value = '';
  inputSecret.value = '';

  inputLabel.focus();
});

on('#add-key-modal-btn-close', 'click', () => {
  hide(modalBg);
  hide(modalAddSecret);
});

on(modalBg, 'click', () => {
  hide(modalBg);
  hide(modalAddSecret);
});

on('#add-key-modal-btn-add', 'click', () => {
  hide(modalBg);
  hide(modalAddSecret);

  const label = inputLabel.value.trim();
  const originalSecret = inputSecret.value;
  const secret = originalSecret.replaceAll(/\s/g, '').toUpperCase();

  inputLabel.value = '';
  inputSecret.value = '';

  if (
    !label.length ||
    !secret.length ||
    secrets.find((s) => s.key === secret)
  ) {
    return;
  }

  secrets.push({
    label,
    key: secret,
    digits: 6,
    encrypted: false,
    period: 30,
    originalKey: originalSecret,
  });

  localStorage.setItem('secrets', JSON.stringify(secrets));

  build();
});

build();
