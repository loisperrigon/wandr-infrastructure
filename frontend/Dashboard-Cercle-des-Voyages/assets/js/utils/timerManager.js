/**
 * Gestionnaire de timers pour éviter les fuites mémoire
 */
class TimerManager {
  constructor() {
    this.timers = new Map();
    this.intervals = new Map();
    this.timeouts = new Map();
    this.animationFrames = new Map();
  }

  /**
   * Créer un timeout avec nettoyage automatique
   */
  setTimeout(callback, delay, id = null) {
    const timerId = id || `timeout_${Date.now()}_${Math.random()}`;
    
    const timeoutId = setTimeout(() => {
      try {
        callback();
      } finally {
        this.timeouts.delete(timerId);
      }
    }, delay);

    this.timeouts.set(timerId, timeoutId);
    return timerId;
  }

  /**
   * Créer un interval avec nettoyage automatique
   */
  setInterval(callback, delay, id = null) {
    const timerId = id || `interval_${Date.now()}_${Math.random()}`;
    
    const intervalId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`Erreur dans l'interval ${timerId}:`, error);
        this.clearInterval(timerId);
      }
    }, delay);

    this.intervals.set(timerId, intervalId);
    return timerId;
  }

  /**
   * Créer un requestAnimationFrame avec nettoyage
   */
  requestAnimationFrame(callback, id = null) {
    const frameId = id || `frame_${Date.now()}_${Math.random()}`;
    
    const animationId = requestAnimationFrame(() => {
      try {
        callback();
      } finally {
        this.animationFrames.delete(frameId);
      }
    });

    this.animationFrames.set(frameId, animationId);
    return frameId;
  }

  /**
   * Supprimer un timeout
   */
  clearTimeout(timerId) {
    const timeoutId = this.timeouts.get(timerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timerId);
      return true;
    }
    return false;
  }

  /**
   * Supprimer un interval
   */
  clearInterval(timerId) {
    const intervalId = this.intervals.get(timerId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(timerId);
      return true;
    }
    return false;
  }

  /**
   * Supprimer un animation frame
   */
  cancelAnimationFrame(frameId) {
    const animationId = this.animationFrames.get(frameId);
    if (animationId) {
      cancelAnimationFrame(animationId);
      this.animationFrames.delete(frameId);
      return true;
    }
    return false;
  }

  /**
   * Créer un timer avec retry automatique
   */
  setRetryTimer(callback, delay, maxRetries = 3, id = null) {
    const timerId = id || `retry_${Date.now()}_${Math.random()}`;
    let attempts = 0;

    const attemptExecution = () => {
      attempts++;
      
      try {
        const result = callback();
        
        // Si c'est une Promise, gérer les rejets
        if (result && typeof result.then === 'function') {
          result
            .then(() => {
              this.timeouts.delete(timerId);
            })
            .catch((error) => {
              if (attempts < maxRetries) {
                console.warn(`Tentative ${attempts}/${maxRetries} échouée pour ${timerId}, retry...`);
                this.setTimeout(attemptExecution, delay * attempts, timerId); // Backoff exponentiel
              } else {
                console.error(`Timer ${timerId} échoué après ${maxRetries} tentatives:`, error);
                this.timeouts.delete(timerId);
              }
            });
        } else {
          this.timeouts.delete(timerId);
        }
      } catch (error) {
        if (attempts < maxRetries) {
          console.warn(`Tentative ${attempts}/${maxRetries} échouée pour ${timerId}, retry...`);
          this.setTimeout(attemptExecution, delay * attempts, timerId);
        } else {
          console.error(`Timer ${timerId} échoué après ${maxRetries} tentatives:`, error);
          this.timeouts.delete(timerId);
        }
      }
    };

    this.setTimeout(attemptExecution, delay, timerId);
    return timerId;
  }

  /**
   * Créer un timer conditionnel qui s'arrête quand une condition est remplie
   */
  setConditionalInterval(callback, condition, delay, maxDuration = 30000, id = null) {
    const timerId = id || `conditional_${Date.now()}_${Math.random()}`;
    const startTime = Date.now();

    const intervalId = setInterval(() => {
      try {
        // Vérifier le timeout global
        if (Date.now() - startTime > maxDuration) {
          console.warn(`Timer conditionnel ${timerId} arrêté après timeout de ${maxDuration}ms`);
          this.clearInterval(timerId);
          return;
        }

        // Exécuter le callback
        callback();

        // Vérifier la condition d'arrêt
        if (condition()) {
          this.clearInterval(timerId);
        }
      } catch (error) {
        console.error(`Erreur dans le timer conditionnel ${timerId}:`, error);
        this.clearInterval(timerId);
      }
    }, delay);

    this.intervals.set(timerId, intervalId);
    return timerId;
  }

  /**
   * Nettoyer tous les timers
   */
  clearAll() {
    // Nettoyer les timeouts
    for (const [id, timeoutId] of this.timeouts.entries()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();

    // Nettoyer les intervals
    for (const [id, intervalId] of this.intervals.entries()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();

    // Nettoyer les animation frames
    for (const [id, animationId] of this.animationFrames.entries()) {
      cancelAnimationFrame(animationId);
    }
    this.animationFrames.clear();

    console.log('Tous les timers ont été nettoyés');
  }

  /**
   * Obtenir des statistiques sur les timers actifs
   */
  getStats() {
    return {
      timeouts: this.timeouts.size,
      intervals: this.intervals.size,
      animationFrames: this.animationFrames.size,
      total: this.timeouts.size + this.intervals.size + this.animationFrames.size,
      activeTimers: {
        timeouts: Array.from(this.timeouts.keys()),
        intervals: Array.from(this.intervals.keys()),
        animationFrames: Array.from(this.animationFrames.keys())
      }
    };
  }

  /**
   * Vérifier si un timer existe
   */
  hasTimer(timerId) {
    return this.timeouts.has(timerId) || 
           this.intervals.has(timerId) || 
           this.animationFrames.has(timerId);
  }

  /**
   * Nettoyer les timers par pattern de nom
   */
  clearByPattern(pattern) {
    const regex = new RegExp(pattern);
    let cleared = 0;

    // Nettoyer timeouts
    for (const [id, timeoutId] of this.timeouts.entries()) {
      if (regex.test(id)) {
        clearTimeout(timeoutId);
        this.timeouts.delete(id);
        cleared++;
      }
    }

    // Nettoyer intervals
    for (const [id, intervalId] of this.intervals.entries()) {
      if (regex.test(id)) {
        clearInterval(intervalId);
        this.intervals.delete(id);
        cleared++;
      }
    }

    // Nettoyer animation frames
    for (const [id, animationId] of this.animationFrames.entries()) {
      if (regex.test(id)) {
        cancelAnimationFrame(animationId);
        this.animationFrames.delete(id);
        cleared++;
      }
    }

    console.log(`${cleared} timers nettoyés avec le pattern: ${pattern}`);
    return cleared;
  }
}

// Instance globale
const timerManager = new TimerManager();

// Nettoyer automatiquement au déchargement de la page
window.addEventListener('beforeunload', () => {
  timerManager.clearAll();
});

// Nettoyer automatiquement lors de la navigation (SPA)
window.addEventListener('pagehide', () => {
  timerManager.clearAll();
});