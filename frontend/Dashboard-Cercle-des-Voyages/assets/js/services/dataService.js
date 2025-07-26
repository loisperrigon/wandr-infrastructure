/**
 * Service de gestion des données simplifié pour utiliser uniquement la route /briefs
 */
class DataService {
  constructor() {
    this.allPages = [];
    this.postTypes = {};
    this.isLoading = false;
  }

  /**
   * Charger toutes les données depuis le backend
   */
  async loadAll(onProgress = null) {
    if (this.isLoading) {
      console.warn('Chargement déjà en cours');
      return;
    }

    this.isLoading = true;

    try {
      if (onProgress) onProgress('Chargement des briefs...');

      // Récupérer tous les briefs depuis le backend
      const briefsResponse = await apiService.getBriefs({ limit: 1000 });
      const allBriefs = briefsResponse.data || briefsResponse || [];
      
      console.log(`${allBriefs.length} briefs chargés depuis le backend`);

      // Extraire les types de posts des briefs
      this._extractPostTypes(allBriefs);

      // Convertir les briefs en format pages
      this.allPages = allBriefs.map(brief => ({
        id: brief.page_id,
        title: { rendered: brief.title },
        content: { rendered: brief.content || '' },
        excerpt: { rendered: brief.excerpt || '' },
        link: brief.url,
        rest_base: brief.rest_base,
        type: brief.rest_base,
        status: brief.status,
        modified: brief.updated_at || brief.created_at,
        wordpress_type: brief.rest_base,
        type_label: brief.rest_base.charAt(0).toUpperCase() + brief.rest_base.slice(1),
        template: this._mapPostTypeToTemplate(brief.rest_base),
        slug: brief.slug || '' // Ajouter le slug
      }));

      if (onProgress) {
        onProgress(`✓ ${this.allPages.length} pages chargées`);
      }

      console.log('Pages chargées par type:', this._getPageCountByType());

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Extraire les types de posts des briefs
   */
  _extractPostTypes(briefs) {
    const uniqueTypes = [...new Set(briefs.map(brief => brief.rest_base))];
    
    this.postTypes = {};
    uniqueTypes.forEach(type => {
      this.postTypes[type] = {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        rest_base: type
      };
    });

    console.log('Types de posts découverts:', Object.keys(this.postTypes));
  }

  /**
   * Mapper le type de post vers un template
   */
  _mapPostTypeToTemplate(postType) {
    const templateMap = {
      'pages': 'page',
      'posts': 'blog',
      'sejour': 'sejour',
      'produit': 'produit',
      'landing': 'landing'
    };
    return templateMap[postType] || 'default';
  }

  /**
   * Obtenir le nombre de pages par type
   */
  _getPageCountByType() {
    return this.allPages.reduce((acc, page) => {
      acc[page.type] = (acc[page.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Obtenir toutes les pages
   */
  getAllPages() {
    return this.allPages;
  }

  /**
   * Obtenir les types de posts
   */
  getPostTypes() {
    return this.postTypes;
  }

  /**
   * Filtrer les pages par type
   */
  getPagesByType(type) {
    return this.allPages.filter(page => page.type === type);
  }

  /**
   * Rechercher des pages
   */
  searchPages(query) {
    if (!query || query.trim() === '') {
      return this.allPages;
    }

    const searchTerm = query.toLowerCase();
    return this.allPages.filter(page => 
      page.title.rendered.toLowerCase().includes(searchTerm) ||
      page.content.rendered.toLowerCase().includes(searchTerm) ||
      page.excerpt.rendered.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Vérifier si les données sont chargées
   */
  isDataLoaded() {
    return this.allPages.length > 0;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      totalPages: this.allPages.length,
      postTypes: Object.keys(this.postTypes).length,
      pagesByType: this._getPageCountByType()
    };
  }
}

// Instance globale
const dataService = new DataService();