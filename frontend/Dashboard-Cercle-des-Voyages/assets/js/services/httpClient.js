/**
 * Client HTTP factorisé pour éliminer la duplication des requêtes
 */
class HttpClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    this.defaultTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Méthode de requête générique
   */
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeout = options.timeout || this.defaultTimeout;
    
    // Définir le timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    const config = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      signal: controller.signal,
      ...options
    };

    try {
      const response = await fetch(fullUrl, config);
      clearTimeout(timeoutId);
      return await this._handleResponse(response, options);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this._handleError(error, fullUrl);
    }
  }

  /**
   * Requête GET avec gestion des headers de pagination WordPress
   */
  async getWithPagination(url, options = {}) {
    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeout = options.timeout || this.defaultTimeout;
    
    // Définir le timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const totalItems = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      return {
        data,
        pagination: {
          totalItems,
          totalPages,
          currentPage: options.page || 1
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this._handleError(error, url);
    }
  }

  /**
   * Requête GET simple
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Requête POST
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Requête PUT
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Requête DELETE
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Gestion centralisée des réponses
   */
  async _handleResponse(response, options = {}) {
    // Gestion spéciale des erreurs 404 pour WordPress
    if (response.status === 404 && options.ignoreNotFound) {
      return {
        data: [],
        notFound: true,
        pagination: { totalItems: 0, totalPages: 0, currentPage: 1 }
      };
    }

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    // Réponse vide pour DELETE
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Gestion centralisée des erreurs
   */
  _handleError(error, url) {
    if (error.name === 'AbortError') {
      return new Error(`Timeout: La requête vers ${url} a pris trop de temps`);
    }
    
    if (error.name === 'TypeError') {
      return new Error(`Erreur réseau: Impossible de contacter ${url}`);
    }

    return error;
  }

  /**
   * Définir des headers par défaut
   */
  setDefaultHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Définir le timeout par défaut
   */
  setDefaultTimeout(timeout) {
    this.defaultTimeout = timeout;
  }
}