/**
 * Gestionnaire d'événements pour éviter les fuites mémoire
 */
class EventManager {
  constructor() {
    this.listeners = new Map();
    this.abortControllers = new Map();
  }

  /**
   * Ajouter un écouteur d'événement avec nettoyage automatique
   */
  addEventListener(element, event, callback, options = {}, id = null) {
    const listenerId = id || `${event}_${Date.now()}_${Math.random()}`;
    
    // Créer un AbortController pour pouvoir annuler l'événement
    const controller = new AbortController();
    const enhancedOptions = {
      ...options,
      signal: controller.signal
    };

    // Wrapper du callback avec gestion d'erreur
    const wrappedCallback = (e) => {
      try {
        return callback(e);
      } catch (error) {
        console.error(`Erreur dans l'écouteur ${listenerId}:`, error);
      }
    };

    element.addEventListener(event, wrappedCallback, enhancedOptions);

    // Stocker les références pour le nettoyage
    this.listeners.set(listenerId, {
      element,
      event,
      callback: wrappedCallback,
      options: enhancedOptions
    });
    
    this.abortControllers.set(listenerId, controller);

    return listenerId;
  }

  /**
   * Supprimer un écouteur d'événement
   */
  removeEventListener(listenerId) {
    const controller = this.abortControllers.get(listenerId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(listenerId);
      this.listeners.delete(listenerId);
      return true;
    }
    return false;
  }

  /**
   * Ajouter un écouteur d'événement avec délégation
   */
  addDelegatedListener(parentElement, selector, event, callback, options = {}, id = null) {
    const listenerId = id || `delegated_${event}_${Date.now()}_${Math.random()}`;

    const delegatedCallback = (e) => {
      const target = e.target.closest(selector);
      if (target && parentElement.contains(target)) {
        try {
          return callback.call(target, e);
        } catch (error) {
          console.error(`Erreur dans l'écouteur délégué ${listenerId}:`, error);
        }
      }
    };

    return this.addEventListener(parentElement, event, delegatedCallback, options, listenerId);
  }

  /**
   * Ajouter un écouteur qui ne s'exécute qu'une fois
   */
  addOneTimeListener(element, event, callback, options = {}, id = null) {
    const listenerId = id || `once_${event}_${Date.now()}_${Math.random()}`;

    const onceCallback = (e) => {
      try {
        callback(e);
      } finally {
        this.removeEventListener(listenerId);
      }
    };

    return this.addEventListener(element, event, onceCallback, { ...options, once: true }, listenerId);
  }

  /**
   * Ajouter un écouteur avec debounce
   */
  addDebouncedListener(element, event, callback, delay = 300, options = {}, id = null) {
    const listenerId = id || `debounced_${event}_${Date.now()}_${Math.random()}`;
    let timeoutId = null;

    const debouncedCallback = (e) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          callback(e);
        } catch (error) {
          console.error(`Erreur dans l'écouteur debounced ${listenerId}:`, error);
        }
      }, delay);
    };

    const originalRemove = this.removeEventListener.bind(this);
    this.removeEventListener = function(id) {
      if (id === listenerId && timeoutId) {
        clearTimeout(timeoutId);
      }
      return originalRemove(id);
    };

    return this.addEventListener(element, event, debouncedCallback, options, listenerId);
  }

  /**
   * Ajouter un écouteur avec throttle
   */
  addThrottledListener(element, event, callback, delay = 100, options = {}, id = null) {
    const listenerId = id || `throttled_${event}_${Date.now()}_${Math.random()}`;
    let isThrottled = false;

    const throttledCallback = (e) => {
      if (isThrottled) return;

      isThrottled = true;
      
      try {
        callback(e);
      } catch (error) {
        console.error(`Erreur dans l'écouteur throttled ${listenerId}:`, error);
      }

      setTimeout(() => {
        isThrottled = false;
      }, delay);
    };

    return this.addEventListener(element, event, throttledCallback, options, listenerId);
  }

  /**
   * Ajouter plusieurs écouteurs d'événements sur le même élément
   */
  addMultipleListeners(element, events, callback, options = {}, baseId = null) {
    const listenerIds = [];
    const baseIdStr = baseId || `multi_${Date.now()}`;

    events.forEach((event, index) => {
      const listenerId = `${baseIdStr}_${event}_${index}`;
      const id = this.addEventListener(element, event, callback, options, listenerId);
      listenerIds.push(id);
    });

    return listenerIds;
  }

  /**
   * Créer un groupe d'écouteurs qui peuvent être nettoyés ensemble
   */
  createListenerGroup(groupName) {
    if (!this.listenerGroups) {
      this.listenerGroups = new Map();
    }

    this.listenerGroups.set(groupName, new Set());

    return {
      add: (element, event, callback, options = {}, id = null) => {
        const listenerId = this.addEventListener(element, event, callback, options, id);
        this.listenerGroups.get(groupName).add(listenerId);
        return listenerId;
      },
      remove: (listenerId) => {
        const success = this.removeEventListener(listenerId);
        if (success) {
          this.listenerGroups.get(groupName).delete(listenerId);
        }
        return success;
      },
      clear: () => {
        const group = this.listenerGroups.get(groupName);
        if (group) {
          for (const listenerId of group) {
            this.removeEventListener(listenerId);
          }
          group.clear();
        }
      }
    };
  }

  /**
   * Nettoyer un groupe d'écouteurs
   */
  clearListenerGroup(groupName) {
    if (this.listenerGroups && this.listenerGroups.has(groupName)) {
      const group = this.listenerGroups.get(groupName);
      for (const listenerId of group) {
        this.removeEventListener(listenerId);
      }
      this.listenerGroups.delete(groupName);
    }
  }

  /**
   * Nettoyer tous les écouteurs d'un élément
   */
  clearElementListeners(element) {
    const listenersToRemove = [];

    for (const [id, listener] of this.listeners.entries()) {
      if (listener.element === element) {
        listenersToRemove.push(id);
      }
    }

    listenersToRemove.forEach(id => this.removeEventListener(id));
    return listenersToRemove.length;
  }

  /**
   * Nettoyer tous les écouteurs
   */
  clearAll() {
    // Aborter tous les contrôleurs
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }

    this.listeners.clear();
    this.abortControllers.clear();

    if (this.listenerGroups) {
      this.listenerGroups.clear();
    }

    console.log('Tous les écouteurs d\'événements ont été nettoyés');
  }

  /**
   * Obtenir des statistiques sur les écouteurs
   */
  getStats() {
    const elementCounts = new Map();
    const eventCounts = new Map();

    for (const listener of this.listeners.values()) {
      // Compter par élément
      const elementKey = listener.element.tagName || 'Unknown';
      elementCounts.set(elementKey, (elementCounts.get(elementKey) || 0) + 1);

      // Compter par type d'événement
      eventCounts.set(listener.event, (eventCounts.get(listener.event) || 0) + 1);
    }

    return {
      total: this.listeners.size,
      byElement: Object.fromEntries(elementCounts),
      byEvent: Object.fromEntries(eventCounts),
      groups: this.listenerGroups ? this.listenerGroups.size : 0
    };
  }

  /**
   * Vérifier si un écouteur existe
   */
  hasListener(listenerId) {
    return this.listeners.has(listenerId);
  }
}

// Instance globale
const eventManager = new EventManager();

// Nettoyer automatiquement au déchargement de la page
window.addEventListener('beforeunload', () => {
  eventManager.clearAll();
});

// Nettoyer automatiquement lors de la navigation (SPA)
window.addEventListener('pagehide', () => {
  eventManager.clearAll();
});