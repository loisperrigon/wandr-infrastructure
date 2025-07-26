/**
 * Service API simplifié pour le backend seulement
 */
class ApiService {
  constructor() {
    this.apiUrl = CONFIG.API_BASE_URL;
    this.apiClient = new HttpClient(this.apiUrl);
  }

  /**
   * Configurer l'authentification avec le token JWT
   */
  setupAuth() {
    const authHeaders = authService.getAuthHeaders();
    this.apiClient.setDefaultHeaders(authHeaders);
  }

  /**
   * Vérifier l'authentification
   */
  _requireAuth() {
    if (!authService.isAuthenticated()) {
      throw new Error('Authentification requise - veuillez vous reconnecter');
    }
    
    // Mettre à jour les headers si nécessaire
    this.setupAuth();
  }

  /**
   * Récupérer tous les briefs depuis MongoDB
   */
  async getBriefs(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.rest_base) params.append('rest_base', filters.rest_base);
      if (filters.limit) params.append('limit', filters.limit);

      const url = `/briefs${params.toString() ? '?' + params.toString() : ''}`;
      return await this.apiClient.get(url);
    } catch (error) {
      errorHandler.handleApiError(error, 'briefs', 'chargement des briefs');
      return [];
    }
  }

  /**
   * Récupérer un brief spécifique
   */
  async getBrief(pageId) {
    try {
      return await this.apiClient.get(`/briefs/${pageId}`);
    } catch (error) {
      throw errorHandler.handleApiError(error, `brief ${pageId}`, 'lecture');
    }
  }

  /**
   * Créer un nouveau brief
   */
  async createBrief(briefData) {
    try {
      return await this.apiClient.post('/briefs', briefData);
    } catch (error) {
      throw errorHandler.handleApiError(error, 'brief', 'création');
    }
  }

  /**
   * Mettre à jour un brief
   */
  async updateBrief(pageId, updateData) {
    try {
      return await this.apiClient.put(`/briefs/${pageId}`, updateData);
    } catch (error) {
      throw errorHandler.handleApiError(error, `brief ${pageId}`, 'mise à jour');
    }
  }

  /**
   * Supprimer un brief
   */
  async deleteBrief(pageId) {
    try {
      return await this.apiClient.delete(`/briefs/${pageId}`);
    } catch (error) {
      throw errorHandler.handleApiError(error, `brief ${pageId}`, 'suppression');
    }
  }

  /**
   * Récupérer les statistiques des briefs
   */
  async getBriefStats() {
    try {
      return await this.apiClient.get('/briefs/stats');
    } catch (error) {
      errorHandler.handleApiError(error, 'statistiques', 'chargement des stats');
      return { by_status: [], by_rest_base: [] };
    }
  }

  /**
   * Récupérer toutes les pages (WordPress, Webflow, etc.) avec statut des briefs
   * @param {string} source - Source des pages ('all', 'wordpress', etc.)
   * @param {boolean} silent - Si true, ne pas afficher d'erreur à l'utilisateur
   */
  async getAllPages(source = 'all', silent = false) {
    try {
      const params = new URLSearchParams();
      params.append('source', source);
      
      const url = `/pages?${params.toString()}`;
      return await this.apiClient.get(url);
    } catch (error) {
      if (!silent) {
        errorHandler.handleApiError(error, 'pages', 'chargement des pages');
      } else {
        console.warn('🔕 Erreur silencieuse lors du chargement des pages:', error.message);
      }
      return { data: [], stats: {} };
    }
  }

  /**
   * Vérifier si un brief existe pour une page
   */
  async checkBriefExists(pageId) {
    try {
      return await this.apiClient.get(`/pages/check-brief/${pageId}`);
    } catch (error) {
      errorHandler.handleApiError(error, `brief pour page ${pageId}`, 'vérification');
      return { exists: false, brief: null };
    }
  }

}

// Instance globale du service API
const apiService = new ApiService();