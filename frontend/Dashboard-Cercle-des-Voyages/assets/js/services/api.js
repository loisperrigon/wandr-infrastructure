/**
 * Service API pour gérer toutes les requêtes HTTP
 */
class ApiService {
  constructor() {
    this.authHeader = null;
    this.wpUrl = CONFIG.WORDPRESS_URL;
    this.apiUrl = CONFIG.API_BASE_URL;
  }

  /**
   * Définir l'en-tête d'authentification
   */
  setAuthHeader(username, password) {
    this.authHeader = btoa(`${username}:${password}`);
  }

  /**
   * Effectuer une requête HTTP générique
   */
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        // Timeout de 10 minutes pour les requêtes longues
        signal: AbortSignal.timeout(10 * 60 * 1000), // 10 minutes
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur API:", error);
      throw error;
    }
  }

  /**
   * Tester la connexion WordPress
   */
  async testWordPressConnection() {
    if (!this.authHeader) {
      throw new Error("Authentification requise");
    }

    return await this.request(`${this.wpUrl}/wp-json/wp/v2/posts?per_page=1`, {
      headers: {
        Authorization: `Basic ${this.authHeader}`,
      },
    });
  }

  /**
   * Récupérer tous les types de posts WordPress
   */
  async getPostTypes() {
    if (!this.authHeader) {
      throw new Error("Authentification requise");
    }

    return await this.request(`${this.wpUrl}/wp-json/wp/v2/types`, {
      headers: {
        Authorization: `Basic ${this.authHeader}`,
      },
    });
  }

  /**
   * Récupérer les contenus d'un type de post spécifique (première page)
   */
  async getPostsByType(endpoint, perPage = 15) {
    if (!this.authHeader) {
      throw new Error("Authentification requise");
    }

    try {
      const response = await fetch(
        `${this.wpUrl}/wp-json/wp/v2/${endpoint}?per_page=${perPage}&page=1&orderby=modified&order=desc`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${this.authHeader}`,
          },
        }
      );

      if (!response.ok) {
        // 404 est normal pour certains types de posts qui n'existent pas
        if (response.status === 404) {
          console.log(
            `Type de post '${endpoint}' non disponible (404) - ignoré`
          );
          return { posts: [], totalPages: 0, totalPosts: 0 };
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const posts = await response.json();
      const totalPosts = parseInt(response.headers.get("X-WP-Total") || "0");
      const totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") || "1"
      );

      return { posts, totalPages, totalPosts };
    } catch (error) {
      // Gestion silencieuse des erreurs 404
      if (error.message.includes("404")) {
        console.log(`Type de post '${endpoint}' non disponible - ignoré`);
        return { posts: [], totalPages: 0, totalPosts: 0 };
      }

      console.warn(`Erreur pour le type ${endpoint}:`, error.message);
      return { posts: [], totalPages: 0, totalPosts: 0 };
    }
  }

  /**
   * Récupérer toutes les pages d'un type de post (pagination)
   */
  async getAllPostsByType(endpoint, perPage = 50, onProgress = null) {
    const firstBatch = await this.getPostsByType(endpoint, perPage);

    if (firstBatch.totalPages <= 1) {
      return firstBatch.posts;
    }

    const allPosts = [...firstBatch.posts];
    const promises = [];

    // Charger les pages suivantes en parallèle
    for (let page = 2; page <= firstBatch.totalPages; page++) {
      const promise = this.getPostsByTypePage(endpoint, page, perPage).then(
        (posts) => {
          allPosts.push(...posts);
          if (onProgress) {
            onProgress(allPosts.length, firstBatch.totalPosts);
          }
          return posts;
        }
      );
      promises.push(promise);
    }

    // Attendre toutes les pages
    await Promise.all(promises);

    return allPosts;
  }

  /**
   * Récupérer une page spécifique d'un type de post
   */
  async getPostsByTypePage(endpoint, page, perPage = 50) {
    if (!this.authHeader) {
      throw new Error("Authentification requise");
    }

    try {
      const response = await fetch(
        `${this.wpUrl}/wp-json/wp/v2/${endpoint}?per_page=${perPage}&page=${page}&orderby=modified&order=desc`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${this.authHeader}`,
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn(
        `Erreur page ${page} pour le type ${endpoint}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * Récupérer tous les briefs depuis MongoDB
   */
  async getBriefs(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.rest_base) params.append("rest_base", filters.rest_base);
    if (filters.limit) params.append("limit", filters.limit);

    const url = `${this.apiUrl}/briefs${
      params.toString() ? "?" + params.toString() : ""
    }`;

    try {
      return await this.request(url);
    } catch (error) {
      console.warn("Impossible de charger les briefs depuis MongoDB:", error);
      return [];
    }
  }

  /**
   * Récupérer un brief spécifique
   */
  async getBrief(pageId) {
    return await this.request(`${this.apiUrl}/briefs/${pageId}`);
  }

  /**
   * Créer un nouveau brief
   */
  async createBrief(briefData) {
    return await this.request(`${this.apiUrl}/briefs`, {
      method: "POST",
      body: JSON.stringify(briefData),
    });
  }

  /**
   * Mettre à jour un brief
   */
  async updateBrief(pageId, updateData) {
    return await this.request(`${this.apiUrl}/briefs/${pageId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Supprimer un brief
   */
  async deleteBrief(pageId) {
    return await this.request(`${this.apiUrl}/briefs/${pageId}`, {
      method: "DELETE",
    });
  }

  /**
   * Récupérer les statistiques des briefs
   */
  async getBriefStats() {
    try {
      return await this.request(`${this.apiUrl}/briefs/stats`);
    } catch (error) {
      console.warn("Impossible de charger les statistiques:", error);
      return { by_status: [], by_rest_base: [] };
    }
  }
}

// Instance globale du service API
const apiService = new ApiService();
