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

let view = 'list';

const secrets = [
  {
    label: 'GitHub',
    encrypted: false,
    originalKey: '',
    key: '',
    digits: 6,
    period: 30,
  },
  {
    label: 'Google',
    encrypted: false,
    originalKey: '',
    key: '',
    digits: 6,
    period: 30,
  },
  {
    label: 'Discord',
    encrypted: false,
    originalKey: '',
    key: '',
    digits: 6,
    period: 30,
  },
];

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

      label.className = 'label';
      label.innerText = s.label;

      actions.className = 'actions';

      editAction.dataset.tooltip = 'Edit';
      editAction.appendChild(createIcon('edit'));

      actions.append(createSep(), editAction);

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

on(btnList, 'click', () => {
  toggleView('list');
});

on(btnGrid, 'click', () => {
  toggleView('grid');
});

on('#add-key', 'click', () => {});

build();
