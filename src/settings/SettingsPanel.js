/**
 * SettingsPanel.js
 * Panneau de configuration : proxy, clés API, toggles globaux.
 * Exporte uniquement initSettingsPanel().
 *
 * Dépendances :
 *   - getSetting / setSetting  depuis ../settings/SettingsManager.js
 *   - SOURCE_REGISTRY, API_KEY_DEFINITIONS depuis ../sources/SourceManager.js
 *
 * HTML attendu (dans index.html) :
 *   <div id="settings-body" class="hidden">
 *     <div id="settings-inner"></div>
 *   </div>
 */

import { getSetting, setSetting } from './SettingsManager.js';
import { API_KEY_DEFINITIONS }    from '../sources/SourceManager.js';

export function initSettingsPanel() {
  const inner = document.getElementById('settings-inner');
  if (!inner || inner.dataset.ready === '1') return;
  inner.dataset.ready = '1';

  inner.innerHTML = buildHTML();
  bindEvents(inner);
}

// ─── Construction du HTML ─────────────────────────────────────────────────────
function buildHTML() {
  const proxyUrl   = getSetting('proxyUrl')    || '';
  const apiKeys    = getSetting('apiKeys')     || {};
  const showOffline = getSetting('showOffline') !== false;

  const apiKeyFields = API_KEY_DEFINITIONS.map(def => `
    <div class="settings-field">
      <label class="settings-label" for="apikey-${def.key}">
        ${def.label}
        <a href="${def.url}" target="_blank" rel="noopener noreferrer" class="settings-link" title="Obtenir une clé API">🔗</a>
      </label>
      <input
        id="apikey-${def.key}"
        class="settings-input"
        type="password"
        autocomplete="off"
        placeholder="Clé API ${def.label}"
        value="${apiKeys[def.key] || ''}"
        data-apikey="${def.key}"
      />
      <span class="settings-key-status" id="status-${def.key}">
        ${apiKeys[def.key] ? '✅' : '⬜ non configurée'}
      </span>
    </div>
  `).join('');

  return `
    <div class="settings-section">
      <h3 class="settings-title">🌐 Proxy CORS</h3>
      <p class="settings-desc">
        Certaines sources nécessitent un proxy pour contourner les restrictions CORS.
        Exemple : <code>https://proxy.exemple.workers.dev/?url=</code>
      </p>
      <div class="settings-field">
        <label class="settings-label" for="settings-proxy">URL du proxy</label>
        <input
          id="settings-proxy"
          class="settings-input"
          type="url"
          placeholder="https://proxy.exemple.workers.dev/?url="
          value="${proxyUrl}"
        />
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-title">🔑 Clés API</h3>
      <p class="settings-desc">
        Ces clés sont stockées localement dans votre navigateur.
        Une source nécessitant une clé sera automatiquement ignorée si la clé est absente.
      </p>
      ${apiKeyFields}
    </div>

    <div class="settings-section">
      <h3 class="settings-title">⚙️ Options</h3>
      <div class="settings-field settings-field--inline">
        <label class="settings-label" for="settings-show-offline">
          Afficher les caméras hors-ligne
        </label>
        <input
          id="settings-show-offline"
          type="checkbox"
          ${showOffline ? 'checked' : ''}
        />
      </div>
    </div>

    <div class="settings-actions">
      <button class="btn btn--primary" id="btn-settings-save">💾 Enregistrer</button>
      <span id="settings-saved-msg" class="settings-saved hidden">✅ Enregistré</span>
    </div>
  `;
}

// ─── Liaison des événements ───────────────────────────────────────────────────
function bindEvents(inner) {
  inner.querySelector('#btn-settings-save')?.addEventListener('click', () => {
    // Proxy
    const proxyEl = inner.querySelector('#settings-proxy');
    if (proxyEl) setSetting('proxyUrl', proxyEl.value.trim());

    // Clés API
    const currentKeys = getSetting('apiKeys') || {};
    inner.querySelectorAll('[data-apikey]').forEach(input => {
      const key = input.dataset.apikey;
      const val = input.value.trim();
      if (val) {
        currentKeys[key] = val;
      } else {
        delete currentKeys[key];
      }
      // Mise à jour du statut visuel
      const statusEl = inner.querySelector(`#status-${key}`);
      if (statusEl) statusEl.textContent = val ? '✅' : '⬜ non configurée';
    });
    setSetting('apiKeys', currentKeys);

    // Options
    const offlineEl = inner.querySelector('#settings-show-offline');
    if (offlineEl) setSetting('showOffline', offlineEl.checked);

    // Confirmation visuelle
    const msg = inner.querySelector('#settings-saved-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2500);
    }

    // Déclenchement d'un event custom pour que app.js puisse recharger si besoin
    document.dispatchEvent(new CustomEvent('vigimap:settings-saved'));
  });

  // Affichage/masquage des mots de passe
  inner.querySelectorAll('.settings-input[type="password"]').forEach(input => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn--icon settings-eye';
    toggle.textContent = '👁';
    toggle.title = 'Afficher / masquer';
    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });
    input.insertAdjacentElement('afterend', toggle);
  });
}
