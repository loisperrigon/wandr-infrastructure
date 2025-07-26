/**
 * Gestionnaire d'états de boutons factorisé
 */
class ButtonStateManager {
  constructor() {
    this.activeButtons = new Map();
  }

  /**
   * Configurer un bouton avec ses éléments
   */
  register(buttonId, button, textElement = null) {
    if (!button) {
      console.warn(`ButtonStateManager: Bouton non trouvé pour l'ID ${buttonId}`);
      return false;
    }

    // Auto-détecter l'élément texte si non fourni
    if (!textElement) {
      textElement = button.querySelector('.btn-text') || 
                   button.querySelector('span') || 
                   button;
    }

    this.activeButtons.set(buttonId, {
      button,
      textElement,
      originalText: textElement.textContent,
      originalDisabled: button.disabled,
      isLoading: false
    });

    return true;
  }

  /**
   * Définir l'état de chargement d'un bouton
   */
  setLoading(buttonId, isLoading, loadingText = 'Chargement...') {
    const config = this.activeButtons.get(buttonId);
    if (!config) {
      console.warn(`ButtonStateManager: Bouton ${buttonId} non enregistré`);
      return;
    }

    config.isLoading = isLoading;

    if (isLoading) {
      config.button.disabled = true;
      config.textElement.textContent = loadingText;
      config.button.classList.add('loading');
    } else {
      config.button.disabled = config.originalDisabled;
      config.textElement.textContent = config.originalText;
      config.button.classList.remove('loading');
    }
  }

  /**
   * Définir l'état d'erreur d'un bouton
   */
  setError(buttonId, errorText = 'Erreur', duration = 3000) {
    const config = this.activeButtons.get(buttonId);
    if (!config) return;

    config.button.disabled = false;
    config.textElement.textContent = errorText;
    config.button.classList.add('error');

    // Restaurer l'état normal après la durée spécifiée
    setTimeout(() => {
      if (config.button.classList.contains('error')) {
        this.setNormal(buttonId);
      }
    }, duration);
  }

  /**
   * Définir l'état de succès d'un bouton
   */
  setSuccess(buttonId, successText = 'Terminé !', duration = 2000) {
    const config = this.activeButtons.get(buttonId);
    if (!config) return;

    config.button.disabled = false;
    config.textElement.textContent = successText;
    config.button.classList.add('success');

    // Restaurer l'état normal après la durée spécifiée
    setTimeout(() => {
      if (config.button.classList.contains('success')) {
        this.setNormal(buttonId);
      }
    }, duration);
  }

  /**
   * Restaurer l'état normal d'un bouton
   */
  setNormal(buttonId) {
    const config = this.activeButtons.get(buttonId);
    if (!config) return;

    config.isLoading = false;
    config.button.disabled = config.originalDisabled;
    config.textElement.textContent = config.originalText;
    config.button.classList.remove('loading', 'error', 'success');
  }

  /**
   * Vérifier si un bouton est en état de chargement
   */
  isLoading(buttonId) {
    const config = this.activeButtons.get(buttonId);
    return config ? config.isLoading : false;
  }

  /**
   * Wrapper pour exécuter une action async avec gestion d'état
   */
  async executeWithState(buttonId, asyncFunction, options = {}) {
    const {
      loadingText = 'Chargement...',
      successText = 'Terminé !',
      errorText = 'Erreur',
      successDuration = 2000,
      errorDuration = 3000,
      showSuccess = true,
      showError = true
    } = options;

    if (this.isLoading(buttonId)) {
      return; // Éviter les double-clics
    }

    try {
      this.setLoading(buttonId, true, loadingText);
      const result = await asyncFunction();
      
      if (showSuccess) {
        this.setSuccess(buttonId, successText, successDuration);
      } else {
        this.setNormal(buttonId);
      }
      
      return result;
    } catch (error) {
      if (showError) {
        this.setError(buttonId, errorText, errorDuration);
      } else {
        this.setNormal(buttonId);
      }
      throw error;
    }
  }

  /**
   * Désactiver temporairement un bouton
   */
  disable(buttonId, duration = 0) {
    const config = this.activeButtons.get(buttonId);
    if (!config) return;

    config.button.disabled = true;
    
    if (duration > 0) {
      setTimeout(() => {
        if (config.button.disabled && !config.isLoading) {
          config.button.disabled = config.originalDisabled;
        }
      }, duration);
    }
  }

  /**
   * Réactiver un bouton
   */
  enable(buttonId) {
    const config = this.activeButtons.get(buttonId);
    if (!config || config.isLoading) return;

    config.button.disabled = false;
  }

  /**
   * Nettoyer un bouton enregistré
   */
  unregister(buttonId) {
    if (this.activeButtons.has(buttonId)) {
      this.setNormal(buttonId);
      this.activeButtons.delete(buttonId);
    }
  }

  /**
   * Nettoyer tous les boutons
   */
  reset() {
    for (const buttonId of this.activeButtons.keys()) {
      this.setNormal(buttonId);
    }
    this.activeButtons.clear();
  }

  /**
   * Obtenir la liste des boutons enregistrés
   */
  getRegisteredButtons() {
    return Array.from(this.activeButtons.keys());
  }

  /**
   * Méthode utilitaire pour créer un bouton avec gestion d'état automatique
   */
  createManagedButton(buttonId, text, onClick, className = 'btn btn-primary') {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = `<span class="btn-text">${text}</span>`;
    
    this.register(buttonId, button);
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await this.executeWithState(buttonId, onClick);
      } catch (error) {
        console.error(`Erreur dans ${buttonId}:`, error);
      }
    });

    return button;
  }
}

// Instance globale
const buttonStateManager = new ButtonStateManager();