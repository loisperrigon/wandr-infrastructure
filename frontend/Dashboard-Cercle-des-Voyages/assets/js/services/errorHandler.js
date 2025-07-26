/**
 * Gestionnaire d'erreurs centralisé
 */
class ErrorHandler {
  constructor() {
    this.errorLogs = [];
    this.maxLogs = 100;
  }

  /**
   * Gérer une erreur avec contexte
   */
  handle(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Erreur inconnue',
      stack: error.stack,
      context,
      type: this._getErrorType(error)
    };

    // Logger l'erreur
    this._logError(errorInfo);

    // Afficher à l'utilisateur si nécessaire
    if (context.showToUser) {
      this._showUserError(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Gérer les erreurs d'API spécifiquement
   */
  handleApiError(error, endpoint, operation = 'unknown') {
    const context = {
      type: 'api',
      endpoint,
      operation,
      showToUser: true
    };

    // Messages d'erreur spécifiques selon le type
    if (error.message.includes('404')) {
      context.userMessage = `Ressource non trouvée sur ${endpoint}`;
      context.showToUser = false; // 404 souvent normal
    } else if (error.message.includes('401') || error.message.includes('403')) {
      context.userMessage = 'Erreur d\'authentification. Vérifiez vos identifiants.';
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      context.userMessage = 'La requête a pris trop de temps. Réessayez plus tard.';
    } else if (error.message.includes('réseau') || error.message.includes('network')) {
      context.userMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else {
      context.userMessage = `Erreur lors de ${operation}: ${error.message}`;
    }

    return this.handle(error, context);
  }

  /**
   * Gérer les erreurs WordPress spécifiquement
   */
  handleWordPressError(error, postType = '', operation = 'récupération') {
    const context = {
      type: 'wordpress',
      postType,
      operation,
      showToUser: false // WordPress errors souvent gérées silencieusement
    };

    // Erreur 404 sur type de post = normal
    if (error.message.includes('404') && postType) {
      context.userMessage = `Type de post '${postType}' non disponible`;
      console.log(`Type de post '${postType}' non disponible (404) - ignoré`);
      return this.handle(error, context);
    }

    context.showToUser = true;
    context.userMessage = `Erreur WordPress lors de ${operation}${postType ? ` pour ${postType}` : ''}: ${error.message}`;
    
    return this.handle(error, context);
  }

  /**
   * Récupérer les logs d'erreurs
   */
  getLogs(limit = 10) {
    return this.errorLogs.slice(-limit);
  }

  /**
   * Nettoyer les logs anciens
   */
  clearOldLogs() {
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogs);
    }
  }

  /**
   * Déterminer le type d'erreur
   */
  _getErrorType(error) {
    if (error.name === 'AbortError') return 'timeout';
    if (error.name === 'TypeError') return 'network';
    if (error.message.includes('401') || error.message.includes('403')) return 'auth';
    if (error.message.includes('404')) return 'not_found';
    if (error.message.includes('500')) return 'server';
    return 'unknown';
  }

  /**
   * Logger l'erreur
   */
  _logError(errorInfo) {
    // Ajouter aux logs internes
    this.errorLogs.push(errorInfo);
    this.clearOldLogs();

    // Logger dans la console selon le type
    const logMessage = `[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`;
    
    switch (errorInfo.type) {
      case 'network':
      case 'server':
      case 'auth':
        console.error(logMessage, errorInfo.context);
        break;
      case 'not_found':
        console.log(logMessage); // 404 moins critique
        break;
      case 'timeout':
        console.warn(logMessage);
        break;
      default:
        console.warn(logMessage, errorInfo.context);
    }
  }

  /**
   * Afficher l'erreur à l'utilisateur
   */
  _showUserError(errorInfo) {
    const message = errorInfo.context.userMessage || errorInfo.message;
    
    // Utiliser le notificationManager standardisé
    if (window.notificationManager) {
      window.notificationManager.showError(message);
    } else {
      // Fallback uniquement si notificationManager n'est pas disponible
      console.error('NotificationManager non disponible:', message);
      alert(message);
    }
  }

  /**
   * Créer une notification simple si aucun système n'existe
   */
  _createSimpleNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      word-wrap: break-word;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Supprimer après 5 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Instance globale
const errorHandler = new ErrorHandler();