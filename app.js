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

const items = ['GitHub', 'Google'];

function toggleView(kind) {
  if (view === kind) return;

  if (kind === 'list') {
    btnList.classList.add('active', 'nohover');
    btnGrid.classList.remove('active', 'nohover');

    show(viewList);
    hide(viewGrid);
  } else {
    btnGrid.classList.add('active', 'nohover');
    btnList.classList.remove('active', 'nohover');

    show(viewGrid);
    hide(viewList);
  }

  build();

  view = kind;
}

function build() {
  if (view === 'list') {
    viewListItems.innerHTML = '';

    for (const i of items) {
      const div = document.createElement('div');

      div.innerText = i;

      viewListItems.appendChild(div);
    }
  } else {
  }
}

on(btnList, 'click', () => {
  toggleView('list');
});

on(btnGrid, 'click', () => {
  toggleView('grid');
});

build();

new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const e of m.addedNodes) {
      console.log(e);
    }

    console.log(m.target);
  }
}).observe(document.body, {
  subtree: true,
  childList: true,
  attributeFilter: ['data-tooltip'],
});
