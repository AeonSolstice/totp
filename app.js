import { b32, totp } from './lib.js';

const $ = (a, b = document) => (typeof a === 'string' ? b.querySelector(a) : a);
const $$ = (a, b = document) =>
  typeof a === 'string' ? b.querySelectorAll(a) : a;

const on = (a, b, c) => $(a).addEventListener(c ? b : b.name, c || b);
const onn = (a, b, c) =>
  $$(a).forEach((e) => e.addEventListener(c ? b : b.name, c || b));

const show = (a, b = 'block') => (((a = $(a)).style.display = b), a);
const hide = (a) => ($(a).style.display = 'none');
const hidee = (a) => $$(a).forEach((e) => (e.style.display = 'none'));

const btnList = $('#btn-list');
const btnGrid = $('#btn-grid');

const viewList = $('#view-list');
const viewListItems = $('.items', viewList);
const viewGrid = $('#view-grid');

const modalBg = $('#modal-bg');
const modalAddSecret = $('#add-secret-modal');
const settingsModal = $('#settings-modal');
const importModal = $('#import-modal');
const exportModal = $('#export-modal');

const inputLabel = $('#label-input');
const inputSecret = $('#secret-input');
const inputFile = $('#file-input');
const inputData = $('#data-input');
const selectFormat = $('#format-select');
const secretsSelect = $('#secrets-select');

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

async function doImport(merge = true) {
  let data = inputData.value.trim();

  if (!data) {
    if (inputFile.files[0]) {
      data = (await inputFile.files[0].text()).trim();
    } else {
      alert('Please select a file or enter data');
      return;
    }
  }

  if (data) {
    let src;

    try {
      src = atob(data);

      if (!src) {
        alert('Data decodes to being empty');
        return;
      }

      if (src[0] === '0') {
        try {
          src = JSON.parse(src.slice(1));
        } catch {
          alert('Data decodes to invalid json');
          return;
        }
      } else {
        const srcBuf = new ArrayBuffer(src.length - 1);
        const srcView = new Uint8Array(srcBuf);

        for (let i = 0; i < src.length - 1; i++) {
          srcView[i] = src.charCodeAt(i + 1);
        }

        // salt iterations iv "[]"
        if (srcBuf.byteLength < 64 + 4 + 12 + 2) {
          alert('Data decodes to too-short encrypted data');
          return;
        }

        const dv = new DataView(srcBuf);

        const iterations = dv.getUint32(64);

        if (
          iterations >= 1_000_000 &&
          !confirm(
            `PBKDF2 key derivation with ${iterations} iterations is required. Proceed?`,
          )
        ) {
          return;
        }

        const pass = Uint8Array.from(prompt('Enter decryption password'), (c) =>
          c.charCodeAt(0),
        );
        const passBuf = new ArrayBuffer(pass.length);

        new Uint8Array(passBuf).set(pass);

        const salt = srcBuf.slice(0, 64);

        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-512',
          },
          await crypto.subtle.importKey('raw', passBuf, 'PBKDF2', false, [
            'deriveKey',
          ]),
          {
            name: 'AES-GCM',
            length: 256,
          },
          false,
          ['decrypt'],
        );
        const iv = srcBuf.slice(68, 80);

        const data = srcBuf.slice(80);

        try {
          src = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv,
            },
            key,
            data,
          );
        } catch {
          alert('Data decodes to invalid encrypted data');
          return;
        }

        src = String.fromCharCode(...new Uint8Array(src));

        try {
          src = JSON.parse(src);
        } catch {
          alert('Data decrypts to invalid json');
          return;
        }
      }
    } catch {
      try {
        src = JSON.parse(data);
      } catch {
        alert('Data decodes to invalid json');
        return;
      }
    }

    if (!Array.isArray(src)) {
      alert('Data decodes to invalid form');
      return;
    }

    const added = [];

    if (merge) {
      for (const s of src) {
        if (!secrets.some((s2) => s2.label === s.label)) {
          added.push(s.label);
          secrets.push(s);
        }
      }

      alert(
        `Imported ${added.length}/${src.length} new secrets: ${added.join(
          ', ',
        )}`,
      );
    } else {
      secrets = src;
    }

    localStorage.setItem('secrets', JSON.stringify(secrets));

    inputFile.value = '';
    inputData.value = '';

    hide(modalBg);
    hide(importModal);

    build();
  } else {
    alert('Empty data provided');
  }
}

async function doExport(copy = true) {
  const toExport = secrets.filter((s) =>
    [...secretsSelect.selectedOptions].some((o) => o.value === s.label),
  );

  let out;

  switch (selectFormat.value) {
    case 'json':
      out = JSON.stringify(toExport);
      break;

    case 'json-pretty':
      out = JSON.stringify(toExport, null, 2);
      break;

    case 'json-b64':
      out = btoa('0' + JSON.stringify(toExport));
      break;

    case 'json-pretty-b64':
      out = btoa('0' + JSON.stringify(toExport, null, 2));
      break;

    case 'json-encrypted-b64': {
      out = JSON.stringify(toExport);

      let pass = prompt('Enter encryption password');

      if (!pass) {
        return;
      }

      let iterations = prompt(
        'Enter number of PBKDF2 key derivation iterations',
      );

      if (!iterations) {
        return;
      }

      iterations = parseInt(iterations);

      if (isNaN(iterations) || iterations <= 0 || iterations > 0xffffffff) {
        alert('Invalid number of iterations');
        return;
      }

      hide(modalBg);
      hide(exportModal);

      const salt = crypto.getRandomValues(new Uint8Array(64));

      pass = Uint8Array.from(pass, (c) => c.charCodeAt(0));
      const passBuf = new ArrayBuffer(pass.length);

      new Uint8Array(passBuf).set(pass);

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations,
          hash: 'SHA-512',
        },
        await crypto.subtle.importKey('raw', passBuf, 'PBKDF2', false, [
          'deriveKey',
        ]),
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt'],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));

      try {
        out = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv,
          },
          key,
          Uint8Array.from(out, (c) => c.charCodeAt(0)),
        );
      } catch (e) {
        alert('Failed to encrypt data. Check console for error');
        console.error(e);
        return;
      }

      const iterBuf = new ArrayBuffer(4);
      const dv = new DataView(iterBuf);

      dv.setUint32(0, iterations);

      out = String.fromCharCode(
        ...salt,
        ...new Uint8Array(iterBuf),
        ...iv,
        ...new Uint8Array(out),
      );
      out = btoa('1' + out);

      break;
    }
  }

  if (copy) {
    await navigator.clipboard.writeText(out);
  } else {
    const blob = new Blob([out], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `totp-backup-${+Date.now()}`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }
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

on('#settings', 'click', () => {
  show(modalBg);
  show(settingsModal).focus();
});

on('#btn-import', 'click', () => {
  show(modalBg);
  hide(settingsModal);
  show(importModal).focus();

  inputFile.value = '';
  inputData.value = '';
});

on('#btn-export', 'click', () => {
  show(modalBg);
  hide(settingsModal);
  show(exportModal).focus();

  secretsSelect.innerHTML = '';

  for (const s of secrets) {
    const option = document.createElement('option');

    option.value = s.label;
    option.textContent = s.label;
    option.selected = true;

    secretsSelect.append(option);
  }
});

on('#btn-clear', 'click', () => {
  if (!confirm('Are you sure you want to clear all secrets?')) {
    return;
  }

  secrets = [];

  localStorage.setItem('secrets', JSON.stringify(secrets));

  hide(modalBg);
  hide(settingsModal);

  build();
});

onn('.modal .header .close', 'click', (e) => {
  hide(modalBg);
  hide(e.target.parentNode.parentNode.parentNode);
});

on(modalBg, 'click', () => {
  hide(modalBg);
  hidee('.modal');
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

on('#import-modal-btn-from-clipboard', 'click', async () => {
  inputData.value = await navigator.clipboard.readText();
});

on('#export-modal-btn-select-all', 'click', async () => {
  if (secretsSelect.children.length === secretsSelect.selectedOptions.length) {
    for (const c of secretsSelect.children) {
      c.selected = false;
    }
  } else {
    for (const c of secretsSelect.children) {
      c.selected = true;
    }
  }
});

on('#import-modal-btn-merge', 'click', doImport);
on('#import-modal-btn-overwrite', 'click', () => doImport(false));
on('#export-modal-btn-export', 'click', () => doExport(false));
on('#export-modal-btn-copy', 'click', doExport);

build();
