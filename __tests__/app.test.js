const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function createDom() {
  const rawHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const html = rawHtml
    .replace(/<link[^>]*font-awesome[^>]*>/gi, '')
    .replace(/<link[^>]*style.css[^>]*>/gi, '')
    .replace(/<script[^>]*script.js[^>]*><\/script>/gi, '');
  const scriptContent = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost',
  });

  const { window } = dom;
  window.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') });
  window.open = jest.fn();
  window.localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  Object.defineProperty(window.HTMLIFrameElement.prototype, 'src', {
    configurable: true,
    get() {
      return this._src || '';
    },
    set(value) {
      this._src = value;
    },
  });

  window.eval(scriptContent);

  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  return window;
}

function submitForm(window, formSelector) {
  const form = window.document.querySelector(formSelector);
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('Painel de suporte', () => {
  test('adiciona e renderiza chamado pela sidebar', () => {
    const window = createDom();
    window.document.querySelector('#novo-chamado-id').value = '123';
    window.document.querySelector('#novo-chamado-desc').value = 'Teste sidebar';

    submitForm(window, '#novo-chamado-form');

    const itens = window.document.querySelectorAll('.chamado-item');
    expect(itens.length).toBe(1);
    expect(window.localStorage.getItem('tickets')).toContain('000123');
  });

  test('adiciona chamado pelo atalho do GLPI no header', () => {
    const window = createDom();
    window.document.querySelector('#glpi-input').value = '987654';
    window.document.querySelector('#glpi-add-btn').click();

    const itens = window.document.querySelectorAll('.chamado-item');
    expect(itens.length).toBe(1);
    expect(window.localStorage.getItem('tickets')).toContain('987654');
  });

  test('abre painel remoto ao acionar RemoteManager', () => {
    const window = createDom();
    window.__app__.RemoteManager.addPanel({ title: 'Teste', url: 'https://example.com' });

    const panels = window.document.querySelectorAll('.remote-panel');
    expect(panels.length).toBe(1);
    expect(panels[0].querySelector('iframe').src).toContain('https://example.com');
  });

  test('exibe fallback quando iframe não pode ser carregado', () => {
    const window = createDom();

    window.__app__.RemoteManager.addPanel({
      title: 'Painel bloqueado',
      url: 'https://example.com/bloqueado',
      fallbackMessage: 'bloqueado',
      forceFallback: true,
    });

    const panel = window.document.querySelector('.remote-panel');
    expect(panel.querySelector('.remote-fallback')).not.toBeNull();
    expect(panel.querySelector('iframe')).toBeNull();
  });

  test('GLPI abre em nova aba e não cria iframe', () => {
    const window = createDom();
    const openSpy = window.open;

    window.__app__.RemoteManager.addPanel({
      title: 'GLPI',
      url: 'https://suporte.muffato.com.br/front/ticket.form.php?id=123',
      fallbackMessage: 'bloqueado',
    });

    const panel = window.document.querySelector('.remote-panel');
    expect(panel).toBeNull();
    expect(openSpy).toHaveBeenCalledWith(
      'https://suporte.muffato.com.br/front/ticket.form.php?id=123',
      '_blank',
      'noopener'
    );
  });

  test('salva notas no bloco de notas', () => {
    const window = createDom();
    const notes = window.document.querySelector('#notes-text');
    notes.value = 'Anotacao de teste';
    window.document.querySelector('#notes-save').click();

    expect(window.localStorage.getItem('notes')).toContain('Anotacao de teste');
  });

  test('abre e fecha modal de configuração', () => {
    const window = createDom();
    const modal = window.document.querySelector('#config-modal');
    expect(modal.style.display).not.toBe('flex');

    window.document.querySelector('#config-btn').click();
    expect(modal.style.display).toBe('flex');

    modal.querySelector('.close-btn').click();
    expect(modal.style.display).toBe('none');
  });
});
