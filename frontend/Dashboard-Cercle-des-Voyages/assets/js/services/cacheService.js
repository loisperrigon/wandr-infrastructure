/**
 * Service de cache local pour les pages et briefs
 */
class CacheService {
  constructor() {
    this.CACHE_PREFIX = 'cercle_cache';
    
    // Durée de validité du cache (7 jours pour l'affichage instantané)
    this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms
  }

  /**
   * Générer une clé de cache unique par utilisateur et site
   */
  generateCacheKey(type, userIdentifier = null, siteIdentifier = null) {
    // Récupérer l'identifiant utilisateur depuis le token ou les credentials
    const userId = userIdentifier || this.getCurrentUserId();
    const siteId = siteIdentifier || this.getCurrentSiteId();
    
    return `${this.CACHE_PREFIX}_${type}_${userId}_${siteId}`;
  }

  /**
   * Récupérer l'identifiant utilisateur actuel
   */
  getCurrentUserId() {
    try {
      // Option 1: Depuis localStorage (priorité - persiste après déconnexion)
      const savedUsername = localStorage.getItem('wp_username');
      if (savedUsername) {
        console.log('🔑 UserId depuis localStorage:', savedUsername);
        return savedUsername;
      }
      
      // Option 2: Depuis le token JWT
      const token = localStorage.getItem('wp_auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.username || 'unknown';
        console.log('🔑 UserId depuis token:', userId);
        return userId;
      }
      
      // Option 3: Depuis le formulaire de connexion (dernier recours)
      const loginUsername = document.getElementById('login-username')?.value;
      if (loginUsername) {
        console.log('🔑 UserId depuis form login:', loginUsername);
        return loginUsername;
      }
      
      console.log('🔑 UserId: anonymous (aucune source trouvée)');
      return 'anonymous';
    } catch (error) {
      console.warn('❌ Erreur récupération userId pour cache:', error);
      return 'unknown';
    }
  }

  /**
   * Récupérer l'identifiant du site actuel
   */
  getCurrentSiteId() {
    try {
      // Utiliser l'URL de base WordPress comme identifiant de site
      const baseUrl = CONFIG?.WORDPRESS?.URL || CONFIG?.API_BASE_URL || 'default';
      
      // Nettoyer l'URL pour créer un ID propre
      const siteId = baseUrl.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      console.log('🌐 SiteId:', siteId, 'depuis URL:', baseUrl);
      return siteId;
    } catch (error) {
      console.warn('❌ Erreur récupération siteId pour cache:', error);
      return 'default_site';
    }
  }

  /**
   * Sauvegarder les pages dans le cache local
   */
  savePages(pages, stats = {}) {
    try {
      const cacheKey = this.generateCacheKey('pages');
      const userId = this.getCurrentUserId();
      const siteId = this.getCurrentSiteId();
      
      const cacheData = {
        data: pages,
        stats: stats,
        timestamp: Date.now(),
        syncedAt: Date.now(), // Date de dernière synchronisation
        version: '1.0',
        userId: userId,
        siteId: siteId
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`✅ Cache: ${pages.length} pages sauvegardées pour ${userId}@${siteId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache pages:', error);
      return false;
    }
  }

  /**
   * Récupérer les pages du cache local
   */
  getPages() {
    try {
      const cacheKey = this.generateCacheKey('pages');
      const currentUserId = this.getCurrentUserId();
      const currentSiteId = this.getCurrentSiteId();
      
      const cacheData = localStorage.getItem(cacheKey);
      
      if (!cacheData) {
        console.log(`ℹ️ Cache: Aucune donnée trouvée pour ${currentUserId}@${currentSiteId}`);
        return null;
      }

      const parsed = JSON.parse(cacheData);
      
      // Vérifier la structure du cache
      if (!parsed.data || !parsed.timestamp) {
        console.log('⚠️ Cache: Structure invalide, suppression');
        this.clearPages();
        return null;
      }

      // Vérification de sécurité : s'assurer que le cache correspond au bon utilisateur/site
      if (parsed.userId !== currentUserId || parsed.siteId !== currentSiteId) {
        console.log(`⚠️ Cache: Utilisateur/site différent (cache: ${parsed.userId}@${parsed.siteId}, actuel: ${currentUserId}@${currentSiteId}), suppression`);
        this.clearPages();
        return null;
      }

      console.log(`✅ Cache: ${parsed.data.length} pages récupérées pour ${currentUserId}@${currentSiteId}`);
      return {
        data: parsed.data,
        stats: parsed.stats || {},
        timestamp: parsed.timestamp,
        syncedAt: parsed.syncedAt || parsed.timestamp, // Fallback pour ancien cache
        age: Date.now() - parsed.timestamp
      };
      
    } catch (error) {
      console.error('❌ Erreur lecture cache pages:', error);
      this.clearPages();
      return null;
    }
  }

  /**
   * Vérifier si le cache des pages est valide
   */
  isPagesValid(maxAge = this.CACHE_DURATION) {
    const cache = this.getPages();
    
    if (!cache) {
      return false;
    }

    const isValid = cache.age < maxAge;
    
    console.log(`🕒 Cache: ${isValid ? 'Valide' : 'Expiré'} (âge: ${Math.round(cache.age / 1000 / 60)}min)`);
    
    return isValid;
  }

  /**
   * Vider le cache des pages
   */
  clearPages() {
    try {
      const cacheKey = this.generateCacheKey('pages');
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Cache pages vidé pour ${this.getCurrentUserId()}@${this.getCurrentSiteId()}`);
    } catch (error) {
      console.error('❌ Erreur vidage cache pages:', error);
    }
  }

  /**
   * Vider tous les caches de l'utilisateur actuel
   */
  clearCurrentUserCache() {
    try {
      const userId = this.getCurrentUserId();
      const keysToRemove = [];
      
      // Parcourir tous les éléments du localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.CACHE_PREFIX}_`) && key.includes(`_${userId}_`)) {
          keysToRemove.push(key);
        }
      }
      
      // Supprimer toutes les entrées de cet utilisateur
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`🗑️ ${keysToRemove.length} entrées de cache supprimées pour l'utilisateur ${userId}`);
    } catch (error) {
      console.error('❌ Erreur vidage cache utilisateur:', error);
    }
  }

  /**
   * Nettoyer les anciens caches (utile pour libérer l'espace)
   */
  cleanupOldCaches() {
    try {
      const now = Date.now();
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          try {
            const cacheData = JSON.parse(localStorage.getItem(key));
            
            // Supprimer les caches très anciens (plus de 30 jours)
            if (cacheData.timestamp && (now - cacheData.timestamp) > (30 * 24 * 60 * 60 * 1000)) {
              keysToRemove.push(key);
            }
          } catch (error) {
            // Cache corrompu, le supprimer
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`🧹 ${keysToRemove.length} anciens caches supprimés`);
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
    }
  }

  /**
   * Forcer une mise à jour du cache (pour le bouton refresh)
   */
  async forceRefresh() {
    console.log('🔄 Cache: Mise à jour forcée demandée');
    this.clearPages();
    
    // Déclencher un événement pour signaler la mise à jour
    window.dispatchEvent(new CustomEvent('cache-force-refresh'));
  }

  /**
   * Mettre à jour le statut d'un brief spécifique dans le cache
   */
  updateBriefInCache(pageId, briefStatus, briefData = null) {
    try {
      const cache = this.getPages();
      if (!cache || !cache.data) {
        console.log('⚠️ Cache: Pas de données à mettre à jour');
        return false;
      }

      // Trouver la page dans le cache
      const pageIndex = cache.data.findIndex(page => String(page.page_id) === String(pageId));
      if (pageIndex === -1) {
        console.log(`⚠️ Cache: Page ${pageId} non trouvée dans le cache`);
        return false;
      }

      // Mettre à jour les informations du brief
      const page = cache.data[pageIndex];
      
      if (briefStatus === 'deleted') {
        // Supprimer le brief
        page.has_brief = false;
        page.brief_status = null;
        page.brief_id = null;
        page.brief_generated_at = null;
        page.brief_created_at = null;
      } else {
        // Mettre à jour ou ajouter le brief
        page.has_brief = true;
        page.brief_status = briefStatus;
        
        if (briefData) {
          page.brief_id = briefData.brief_id || page.brief_id;
          page.brief_generated_at = briefData.brief_generated_at || page.brief_generated_at;
          page.brief_created_at = briefData.brief_created_at || new Date().toISOString();
        }
      }

      // Sauvegarder le cache mis à jour
      this.savePages(cache.data, cache.stats);
      
      console.log(`✅ Cache: Brief ${pageId} mis à jour (statut: ${briefStatus})`);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur mise à jour brief dans cache:', error);
      return false;
    }
  }

  /**
   * Supprimer un brief du cache
   */
  deleteBriefFromCache(pageId) {
    return this.updateBriefInCache(pageId, 'deleted');
  }

  /**
   * Marquer un brief comme en cours de génération dans le cache
   */
  markBriefAsGenerating(pageId) {
    return this.updateBriefInCache(pageId, 'pending');
  }

  /**
   * Marquer un brief comme généré dans le cache
   */
  markBriefAsGenerated(pageId, briefData) {
    return this.updateBriefInCache(pageId, 'generated', briefData);
  }

  /**
   * Obtenir des informations sur le cache
   */
  getCacheInfo() {
    const pagesCache = this.getPages();
    
    return {
      pages: {
        exists: !!pagesCache,
        count: pagesCache?.data?.length || 0,
        age: pagesCache ? Math.round(pagesCache.age / 1000 / 60) : null,
        valid: this.isPagesValid()
      }
    };
  }

  /**
   * Obtenir le temps écoulé depuis la dernière synchronisation
   */
  getTimeSinceLastSync() {
    const cache = this.getPages();
    if (!cache || !cache.syncedAt) {
      return null;
    }
    
    const timeDiff = Date.now() - cache.syncedAt;
    const minutes = Math.floor(timeDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'À l\'instant';
    }
  }
}

// Instance globale
const cacheService = new CacheService();