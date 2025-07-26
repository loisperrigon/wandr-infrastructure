/**
 * Service d'authentification JWT
 */
class AuthService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.refreshTimeout = null;
    
    // Récupérer le token depuis localStorage au démarrage
    this.loadTokenFromStorage();
  }

  /**
   * Charger le token depuis localStorage
   */
  loadTokenFromStorage() {
    try {
      const storedToken = localStorage.getItem('wp_auth_token');
      const storedExpiry = localStorage.getItem('wp_auth_expiry');
      
      if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        
        // Vérifier si le token n'est pas expiré
        if (Date.now() < expiryTime) {
          this.token = storedToken;
          this.tokenExpiry = expiryTime;
          this.scheduleTokenRefresh();
          return true;
        } else {
          // Token expiré, le supprimer
          this.clearToken();
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du token:', error);
      this.clearToken();
    }
    
    return false;
  }

  /**
   * Sauvegarder le token dans localStorage
   */
  saveTokenToStorage() {
    try {
      if (this.token && this.tokenExpiry) {
        localStorage.setItem('wp_auth_token', this.token);
        localStorage.setItem('wp_auth_expiry', this.tokenExpiry.toString());
      }
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du token:', error);
    }
  }

  /**
   * Créer un nouveau site WordPress
   */
  async register(siteData) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('Réponse d\'erreur du backend:', error);
        throw new Error(error.error?.message || error.message || 'Erreur lors de la création du site');
      }

      const data = await response.json();
      console.log('Site créé avec succès:', data);
      
      // Si le backend retourne un token JWT, l'utiliser pour l'authentification automatique
      if (data.token || data.data?.token) {
        const token = data.token || data.data.token;
        const expiresIn = data.expiresIn || data.data?.expiresIn || 3600;
        this.setToken(token, expiresIn);
        this.startStatusUpdater();
      }
      
      return { success: true, data: data.data, token: data.token || data.data?.token };
    } catch (error) {
      console.error('Erreur de création de site:', error);
      throw error;
    }
  }

  /**
   * Tester une connexion API
   */
  async testConnection(username, apiKey, baseUrl) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/test-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          api_key: apiKey,
          base_url: baseUrl 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || 'Erreur de test de connexion');
      }

      const data = await response.json();
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
      throw error;
    }
  }

  /**
   * Authentifier avec username/password
   */
  async login(username, password) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur d\'authentification');
      }

      const data = await response.json();
      console.log('Réponse du serveur:', data); // Debug
      
      // Vérifier la structure de la réponse du backend
      const token = data.data?.token || data.token;
      const expiresIn = data.data?.expiresIn || data.expiresIn;
      
      if (token) {
        this.setToken(token, expiresIn);
        // Sauvegarder le username pour le cache
        localStorage.setItem('wp_username', username);
        this.startStatusUpdater();
        return { success: true, token: token };
      } else {
        console.error('Structure de réponse inattendue:', data);
        throw new Error('Token non reçu du serveur');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  /**
   * Définir le token et sa durée d'expiration
   */
  setToken(token, expiresIn = 3600) {
    this.token = token;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    
    this.saveTokenToStorage();
    this.scheduleTokenRefresh();
  }

  /**
   * Obtenir le token actuel
   */
  getToken() {
    // Vérifier si le token n'est pas expiré
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    
    // Token expiré
    this.clearToken();
    return null;
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }

  /**
   * Se déconnecter
   * @param {boolean} voluntary - true pour déconnexion volontaire, false pour erreur réseau
   */
  logout(voluntary = true) {
    this.clearToken(voluntary);
    
    // Rediriger vers la page de connexion si nécessaire
    const connectedSection = document.querySelector('.connected-section');
    const connectionSection = document.querySelector('.connection-section');
    
    if (connectedSection && connectionSection) {
      connectedSection.style.display = 'none';
      connectionSection.style.display = 'block';
    }
  }

  /**
   * Nettoyer le token
   * @param {boolean} voluntary - true pour déconnexion volontaire, false pour erreur réseau
   */
  clearToken(voluntary = true) {
    this.token = null;
    this.tokenExpiry = null;
    
    // Supprimer du localStorage
    try {
      localStorage.removeItem('wp_auth_token');
      localStorage.removeItem('wp_auth_expiry');
      
      // Ne supprimer le username que si c'est une déconnexion volontaire
      if (voluntary) {
        localStorage.removeItem('wp_username');
        console.log('🔑 Username supprimé (déconnexion volontaire)');
      } else {
        console.log('🔑 Username conservé (erreur réseau)');
      }
    } catch (error) {
      console.warn('Erreur lors de la suppression du token:', error);
    }
    
    // Annuler le refresh automatique
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    
    // Arrêter la mise à jour du statut
    this.stopStatusUpdater();
    
    // Mettre à jour l'affichage
    this.updateTokenStatusDisplay();
  }

  /**
   * Planifier le rafraîchissement automatique du token
   */
  scheduleTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    if (!this.tokenExpiry) return;
    
    // Rafraîchir 5 minutes avant expiration
    const refreshTime = this.tokenExpiry - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Impossible de rafraîchir le token');
      }

      const data = await response.json();
      
      if (data.token) {
        this.setToken(data.token, data.expiresIn);
        console.log('Token rafraîchi automatiquement');
      } else {
        throw new Error('Nouveau token non reçu');
      }
    } catch (error) {
      console.warn('Erreur lors du rafraîchissement du token:', error);
      // En cas d'erreur, déconnecter l'utilisateur
      this.logout();
    }
  }

  /**
   * Obtenir les headers d'authentification pour les requêtes
   */
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Obtenir le temps restant avant expiration (en secondes)
   */
  getTimeUntilExpiry() {
    if (!this.tokenExpiry) return 0;
    return Math.max(0, Math.floor((this.tokenExpiry - Date.now()) / 1000));
  }

  /**
   * Vérifier si le token expire bientôt (dans les 5 prochaines minutes)
   */
  isTokenExpiringSoon() {
    const timeLeft = this.getTimeUntilExpiry();
    return timeLeft > 0 && timeLeft < 300; // 5 minutes
  }

  /**
   * Mettre à jour l'indicateur de statut du token dans l'interface
   */
  updateTokenStatusDisplay() {
    const statusElement = document.getElementById('connection-status-header');
    if (!statusElement) return;

    // Vérification directe du token sans appeler isAuthenticated() pour éviter la boucle
    const hasValidToken = this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;

    if (hasValidToken) {
      const timeLeft = this.getTimeUntilExpiry();
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      
      if (this.isTokenExpiringSoon()) {
        statusElement.textContent = `⚠️ Session expire dans ${minutes}min`;
        statusElement.style.color = '#ff9800';
      } else if (hours > 0) {
        statusElement.textContent = `🔒 Session active (${hours}h${minutes}min)`;
        statusElement.style.color = '#28a745';
      } else {
        statusElement.textContent = `🔒 Session active (${minutes}min)`;
        statusElement.style.color = '#28a745';
      }
    } else {
      statusElement.textContent = 'Non connecté';
      statusElement.style.color = '#dc3545';
    }
  }

  /**
   * Démarrer la mise à jour périodique de l'affichage du statut
   */
  startStatusUpdater() {
    // Mettre à jour immédiatement
    this.updateTokenStatusDisplay();
    
    // Puis toutes les 30 secondes
    this.statusUpdateInterval = setInterval(() => {
      this.updateTokenStatusDisplay();
    }, 30000);
  }

  /**
   * Arrêter la mise à jour périodique du statut
   */
  stopStatusUpdater() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }
}

// Instance globale du service d'authentification
const authService = new AuthService();