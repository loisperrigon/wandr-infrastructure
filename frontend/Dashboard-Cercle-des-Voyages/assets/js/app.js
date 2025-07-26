/**
 * Application principale - Dashboard Cercle des Voyages
 */
class App {
  constructor() {
    this.allPages = [];
    this.filteredPages = [];
    this.briefsData = {};
    this.currentPage = 1;
    this.itemsPerPage = CONFIG.ITEMS_PER_PAGE;
    this.sortOrder = 'desc'; // 'asc' ou 'desc'
    this.isLoadingData = false; // Flag pour éviter les requêtes concurrentes
    this.isSyncing = false; // Flag pour la synchronisation en arrière-plan

    this.init();
  }

  /**
   * Initialiser l'application
   */
  init() {
    this.setupEventListeners();
    
    // Nettoyer les anciens caches au démarrage
    cacheService.cleanupOldCaches();
    
    // Configurer la queue de briefs
    briefQueue.setUpdateCallback((stats) => {
      // Mettre à jour uniquement les boutons affectés par la queue
      this.updateQueueButtons();
    });
    
    this.checkExistingAuth();
    CONFIG.showEnvironmentInfo();
    console.log("Application initialisée");
  }

  /**
   * Vérifier si l'utilisateur est déjà authentifié
   */
  checkExistingAuth() {
    if (authService.isAuthenticated()) {
      console.log("Token valide trouvé, connexion automatique");
      
      // Configurer l'authentification
      apiService.setupAuth();
      
      // Démarrer l'affichage du statut
      authService.startStatusUpdater();
      
      // Afficher l'interface connectée
      document.getElementById('auth-container').style.display = 'none';
      document.getElementById('main-dashboard').style.display = 'block';
      
      // Afficher les boutons de header
      const logoutBtn = document.getElementById('logout-btn');
      const syncBtn = document.getElementById('sync-btn');
      if (logoutBtn) {
        logoutBtn.style.display = 'block';
      }
      if (syncBtn) {
        syncBtn.style.display = 'block';
      }
      
      // Le RAG s'initialise automatiquement côté backend lors du chargement des pages
      
      // Vérifier d'abord si on a du cache valide avant d'afficher le loader
      const cachedData = cacheService.getPages();
      const hasValidCache = cachedData && cachedData.data && cachedData.data.length > 0;
      
      if (!hasValidCache) {
        // Afficher le loader seulement si pas de cache
        loadingManager.show("Chargement des pages WordPress...");
      }
      
      // Petit délai pour que le DOM du dashboard soit prêt puis charger
      setTimeout(() => {
        this.loadAllPages().catch(error => {
          console.error("Erreur lors du chargement automatique:", error);
          // Ne pas déconnecter si on a du cache
          if (!hasValidCache) {
            this.handleAuthError();
          }
        });
      }, 100);
    } else {
      // Mettre à jour l'affichage pour "Non connecté"
      authService.updateTokenStatusDisplay();
    }
  }

  /**
   * Gérer les erreurs d'authentification
   */
  handleAuthError() {
    authService.logout();
    connectionManager.showError("Session expirée");
    notificationManager.showError("Session expirée", "Veuillez vous reconnecter");
  }

  /**
   * Déconnecter l'utilisateur
   */
  logout() {
    authService.logout();
    
    // Réinitialiser les données de l'application
    this.allPages = [];
    this.filteredPages = [];
    this.briefsData = {};
    this.currentPage = 1;
    
    // Afficher l'interface de connexion
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('auth-container').style.display = 'block';
    
    // Masquer les boutons de header
    const logoutBtn = document.getElementById('logout-btn');
    const syncBtn = document.getElementById('sync-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
    if (syncBtn) {
      syncBtn.style.display = 'none';
    }
    
    showLoginForm(); // Revenir au formulaire de connexion
    
    notificationManager.showSuccess("Déconnexion réussie");
    console.log("Utilisateur déconnecté et cache nettoyé");
  }

  /**
   * Configurer les écouteurs d'événements
   */
  setupEventListeners() {
    // Événement Enter sur les champs de connexion
    document.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.target.matches("#username, #password")) {
        this.connectToWordPress();
      }
    });

    // Événements de filtrage
    document
      .getElementById("template-filter")
      .addEventListener("change", () => this.filterPages());
    document
      .getElementById("brief-filter")
      .addEventListener("change", () => this.filterPages());
    document.getElementById("search-input").addEventListener(
      "input",
      debounce(() => this.filterPages(), 300)
    );

    // Événements de pagination
    document
      .getElementById("prev-btn")
      .addEventListener("click", () => this.changePage(-1));
    document
      .getElementById("next-btn")
      .addEventListener("click", () => this.changePage(1));
  }


  /**
   * Connecter à WordPress
   */
  async connectToWordPress() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      notificationManager.showError("Veuillez remplir tous les champs");
      return;
    }

    const btn = document.querySelector(".connect-btn");
    const text = document.getElementById("connect-text");

    btn.disabled = true;
    text.textContent = "Connexion...";

    try {
      // Authentification via JWT
      await authService.login(username, password);

      // Configurer l'authentification pour les clients API
      apiService.setupAuth();

      // Connexion réussie
      connectionManager.showConnected();

      // Le RAG s'initialise automatiquement côté backend lors du chargement des pages

      // Charger les données
      await this.loadAllPages();

      // Effacer les champs de connexion pour la sécurité
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    } catch (error) {
      console.error("Erreur de connexion:", error);
      connectionManager.showError("Erreur de connexion");
      notificationManager.showError("Erreur de connexion", error.message);
    } finally {
      btn.disabled = false;
      text.textContent = "Se connecter";
    }
  }

  /**
   * Charger toutes les pages avec cache intelligent
   */
  async loadAllPages(forceRefresh = false) {
    // Éviter les chargements multiples simultanés
    if (this.isLoadingData) {
      console.log('⏳ Chargement déjà en cours, abandon...');
      return;
    }
    
    this.isLoadingData = true;
    
    try {
      // ÉTAPE 1 : Vérifier le cache local (même expiré)
      const cachedData = cacheService.getPages();
      
      if (!forceRefresh && cachedData && cachedData.data && cachedData.data.length > 0) {
        console.log(`📋 Cache trouvé (${cachedData.data.length} pages)`);
        
        // Afficher immédiatement les données du cache
        this.displayPagesFromCache(cachedData.data);
        
        // Mettre à jour l'indicateur de temps
        this.updateSyncTimeDisplay();
        
        // Si le cache est très ancien (> 7 jours), suggérer une sync
        const ageInDays = cachedData.age / (1000 * 60 * 60 * 24);
        if (ageInDays > 7) {
          console.log(`⚠️ Cache ancien (${Math.floor(ageInDays)} jours), synchronisation recommandée`);
        }
        
        return;
      }

      // ÉTAPE 2 : Aucun cache disponible, synchronisation automatique obligatoire
      console.log(`🔄 Aucun cache trouvé, synchronisation automatique...`);
      await this.loadFromServer(true);

    } catch (error) {
      console.error("❌ Erreur lors du chargement:", error);
      
      // Essayer d'utiliser le cache même si expiré, plutôt que d'afficher une erreur
      const cachedData = cacheService.getPages();
      if (cachedData && cachedData.data && cachedData.data.length > 0) {
        console.log(`📋 Utilisation du cache expiré comme fallback (${cachedData.data.length} pages)`);
        this.displayPagesFromCache(cachedData.data);
        // Ne pas afficher d'erreur, juste un message informatif
        console.warn("🔄 Données du cache utilisées suite à une erreur réseau");
        return;
      }
      
      // Afficher l'erreur seulement si vraiment aucun cache disponible
      loadingManager.showError(error.message, "app.loadAllPages()");
    } finally {
      this.isLoadingData = false;
    }
  }

  /**
   * Charger depuis le serveur et sauvegarder en cache
   */
  async loadFromServer(saveToCache = false) {
    try {
      // Le loader est déjà affiché par handleLogin/handleRegister/checkExistingAuth

      // ÉTAPE 1 : Récupérer TOUTES les pages (WordPress, Webflow, etc.)
      const pagesResponse = await apiService.getAllPages('all');
      const allPages = pagesResponse.data || [];
      
      console.log(`${allPages.length} pages chargées depuis toutes les sources`);
      console.log('Statistiques:', pagesResponse.stats);

      // ÉTAPE 2 : Construire l'index des briefs à partir des pages
      this.briefsData = {};
      allPages.forEach((page) => {
        if (page.has_brief && page.brief_id) {
          this.briefsData[page.page_id] = {
            _id: page.brief_id,
            page_id: page.page_id,
            status: page.brief_status,
            generated_at: page.brief_generated_at,
            created_at: page.brief_created_at
          };
        }
      });
      
      console.log(`${Object.keys(this.briefsData).length} briefs indexés depuis les pages`);

      // ÉTAPE 3 : Convertir les pages en format compatible avec l'interface
      const processedPages = allPages.map(page => ({
        page_id: page.page_id,
        title: { rendered: page.title },
        content: { rendered: page.content || '' },
        excerpt: { rendered: page.excerpt || '' },
        link: page.link,
        rest_base: page.rest_base,
        type: page.rest_base,
        has_brief: page.has_brief,
        brief_status: page.brief_status,
        brief_id: page.brief_id,
        brief_generated_at: page.brief_generated_at,
        brief_created_at: page.brief_created_at,
        modified: page.modified,
        template: mapPostTypeToTemplate(page.rest_base),
        slug: page.slug || '',
        wordpress_type: page.rest_base,
        source_type: page.source_type
      }));

      // ÉTAPE 4 : Sauvegarder en cache si demandé
      if (saveToCache) {
        cacheService.savePages(processedPages, pagesResponse.stats);
      }

      // ÉTAPE 5 : Afficher les données
      this.allPages = processedPages;
      

      this.filteredPages = [...this.allPages];

      console.log(
        "Pages chargées par type:",
        this.allPages.reduce((acc, page) => {
          acc[page.type] = (acc[page.type] || 0) + 1;
          return acc;
        }, {})
      );

      // Mettre à jour les filtres
      filterManager.updateTemplateFilter(this.allPages);

      // Rendre les pages (les briefs sont déjà inclus dans allPages)
      this.renderPages();

      loadingManager.hide();
      
      // S'assurer que le conteneur est visible
      const tableContainer = document.getElementById('table-container');
      if (tableContainer) {
        tableContainer.classList.add('visible');
      }

      // Extraire les types de posts des pages qui ont des briefs
      const postTypes = {};
      const uniqueTypes = [...new Set(allPages.filter(page => page.has_brief).map(page => page.rest_base))];
      uniqueTypes.forEach(type => {
        postTypes[type] = {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          rest_base: type
        };
      });

      this.finalizePagesDisplay();
      
    } catch (error) {
      console.error("❌ Erreur chargement serveur:", error);
      
      // En cas d'erreur réseau, essayer d'utiliser le cache comme fallback
      console.log("🔄 Tentative de fallback sur le cache...");
      const cachedData = cacheService.getPages();
      
      if (cachedData && cachedData.data && cachedData.data.length > 0) {
        console.log(`📋 Utilisation du cache comme fallback (${cachedData.data.length} pages)`);
        this.displayPagesFromCache(cachedData.data);
        loadingManager.hide();
        return; // Ne pas propager l'erreur si on a des données en cache
      }
      
      throw error; // Propager l'erreur seulement si pas de cache
    }
  }

  /**
   * Afficher les pages depuis le cache
   */
  displayPagesFromCache(cachedPages) {
    this.allPages = cachedPages;
    this.filteredPages = [...this.allPages];
    
    // Reconstruire briefsData à partir des informations déjà présentes dans le cache
    this.briefsData = {};
    cachedPages.forEach(page => {
      if (page.has_brief) {
        // Utiliser les données déjà présentes dans la page cachée
        this.briefsData[page.page_id] = {
          page_id: page.page_id,
          status: page.brief_status || page.status,
          title: page.title?.rendered,
          url: page.link,
          rest_base: page.rest_base,
          brief_id: page.brief_id,
          brief_generated_at: page.brief_generated_at,
          brief_created_at: page.brief_created_at,
          // Pour les fonctions de lecture/téléchargement, on fera l'appel API à ce moment-là
          _cached: true
        };
      }
    });

    // Affichage immédiat des données du cache (pas de loader artificiel)
    this.finalizePagesDisplay();
    
    // Afficher l'indicateur de cache immédiatement
    this.showCacheIndicator();
  }

  /**
   * Synchroniser manuellement les données
   */
  async syncData() {
    const syncBtn = document.getElementById('sync-btn');
    const syncText = document.getElementById('sync-text');
    const originalText = syncText.textContent;
    
    try {
      // Désactiver le bouton et ajouter la classe syncing
      syncBtn.disabled = true;
      syncBtn.classList.add('syncing');
      syncText.textContent = 'Synchronisation';
      
      // Afficher le loader
      loadingManager.show("Synchronisation des données...");
      
      // Charger depuis le serveur
      await this.loadFromServer(true);
      
      // Mettre à jour l'affichage du temps
      this.updateSyncTimeDisplay();
      
      notificationManager.showSuccess("Synchronisation terminée !");
      
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      notificationManager.showError("Erreur de synchronisation", error.message);
    } finally {
      // Réactiver le bouton
      syncBtn.disabled = false;
      syncBtn.classList.remove('syncing');
      syncText.textContent = originalText;
      loadingManager.hide();
    }
  }

  /**
   * Mettre à jour l'affichage du temps depuis la dernière sync
   */
  updateSyncTimeDisplay() {
    const syncTimeElement = document.getElementById('sync-time');
    if (!syncTimeElement) return;
    
    const timeSinceSync = cacheService.getTimeSinceLastSync();
    if (timeSinceSync) {
      syncTimeElement.textContent = `Dernière sync: ${timeSinceSync}`;
      syncTimeElement.style.display = 'block';
    } else {
      syncTimeElement.style.display = 'none';
    }
  }

  /**
   * Synchronisation en arrière-plan (DEPRECATED - remplacé par sync manuelle)
   */
  async syncInBackground() {
    // Éviter les synchronisations multiples
    if (this.isSyncing) {
      console.log('⏳ Synchronisation déjà en cours, abandon...');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      console.log('🔄 Début synchronisation arrière-plan...');
      
      // Ajouter un indicateur discret
      this.showBackgroundSyncIndicator();
      
      // Attendre un peu pour que l'affichage du cache soit terminé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Faire la synchronisation SILENCIEUSE (sans loading principal)
      await this.loadFromServerSilent(true);
      
      // Mettre à jour l'affichage si des changements sont détectés
      this.updateDisplayIfChanged();
      
      console.log('✅ Synchronisation arrière-plan terminée');
      
    } catch (error) {
      console.warn('⚠️ Erreur synchronisation arrière-plan:', error.message);
      // Ne pas propager l'erreur - le cache reste affiché
    } finally {
      this.hideBackgroundSyncIndicator();
      this.isSyncing = false;
    }
  }

  /**
   * Charger depuis le serveur SANS afficher le loading principal
   */
  async loadFromServerSilent(saveToCache = false) {
    try {
      console.log('🔕 Chargement silencieux depuis le serveur...');

      // ÉTAPE 1 : Récupérer TOUTES les pages (WordPress, Webflow, etc.)
      // Passer silent=true pour éviter les logs d'erreur
      const pagesResponse = await apiService.getAllPages('all', true);
      const allPages = pagesResponse.data || [];
      
      console.log(`${allPages.length} pages chargées silencieusement`);

      // ÉTAPE 2 : Construire l'index des briefs à partir des pages  
      this.briefsData = {};
      allPages.forEach((page) => {
        if (page.has_brief && page.brief_id) {
          this.briefsData[page.page_id] = {
            _id: page.brief_id,
            page_id: page.page_id,
            status: page.brief_status,
            generated_at: page.brief_generated_at,
            created_at: page.brief_created_at
          };
        }
      });
      
      console.log(`${Object.keys(this.briefsData).length} briefs indexés depuis les pages`);

      // ÉTAPE 3 : Convertir les pages en format compatible avec l'interface
      const processedPages = allPages.map(page => ({
        page_id: page.page_id,
        title: { rendered: page.title },
        content: { rendered: page.content || '' },
        excerpt: { rendered: page.excerpt || '' },
        link: page.link,
        rest_base: page.rest_base,
        type: page.rest_base,
        has_brief: page.has_brief,
        brief_status: page.brief_status,
        brief_id: page.brief_id,
        brief_generated_at: page.brief_generated_at,
        brief_created_at: page.brief_created_at,
        modified: page.modified,
        template: mapPostTypeToTemplate(page.rest_base),
        slug: page.slug || '',
        wordpress_type: page.rest_base,
        source_type: page.source_type
      }));

      // ÉTAPE 4 : Sauvegarder en cache si demandé
      if (saveToCache) {
        cacheService.savePages(processedPages, pagesResponse.stats);
      }

      // ÉTAPE 5 : Mettre à jour les données
      this.allPages = processedPages;
      
    } catch (error) {
      console.error("❌ Erreur chargement serveur silencieux:", error);
      throw error;
    }
  }

  /**
   * Finaliser l'affichage des pages
   */
  finalizePagesDisplay() {
    // Extraire les types de posts pour les filtres
    const postTypes = this.extractPostTypes(this.allPages);
    
    // Mettre à jour les filtres
    filterManager.updatePostTypeFilter(postTypes);
    
    // Initialiser l'indicateur de tri
    this.updateSortIndicator();
    
    // Mettre à jour l'affichage du temps de sync
    this.updateSyncTimeDisplay();
    
    // Appliquer les filtres et afficher
    this.filterPages();
    
    // Masquer l'indicateur de chargement
    loadingManager.hide();
    
    // Afficher le conteneur du tableau
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.classList.add('visible');
    }
  }


  /**
   * Extraire les types de posts des pages
   */
  extractPostTypes(pages) {
    const postTypes = {};
    pages.forEach(page => {
      if (page.rest_base && !postTypes[page.rest_base]) {
        postTypes[page.rest_base] = {
          name: page.rest_base.charAt(0).toUpperCase() + page.rest_base.slice(1),
          rest_base: page.rest_base
        };
      }
    });
    return postTypes;
  }

  /**
   * Afficher l'indicateur de cache
   */
  showCacheIndicator() {
    // Ajouter un petit badge "Cache" temporaire
    const indicator = document.createElement('div');
    indicator.id = 'cache-indicator';
    indicator.innerHTML = '📋 Cache';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e3f2fd;
      color: #1976d2;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      border: 1px solid #bbdefb;
    `;
    
    document.body.appendChild(indicator);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  /**
   * Afficher l'indicateur de synchronisation arrière-plan
   */
  showBackgroundSyncIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.innerHTML = '🔄 Synchronisation...';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fff3e0;
      color: #f57c00;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      border: 1px solid #ffcc02;
    `;
    
    document.body.appendChild(indicator);
  }

  /**
   * Masquer l'indicateur de synchronisation arrière-plan
   */
  hideBackgroundSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.remove();
    }
  }


  /**
   * Détecter et mettre à jour l'affichage si changements
   */
  updateDisplayIfChanged() {
    // Comparer et mettre à jour uniquement si nécessaire
    this.filteredPages = [...this.allPages];
    this.filterPages();
    
    console.log('🔄 Affichage mis à jour avec nouvelles données');
  }


  /**
   * Afficher l'indicateur de chargement en arrière-plan
   */
  showBackgroundLoadingIndicator() {
    const indicator = document.getElementById("background-loading-indicator");
    if (indicator) {
      indicator.style.display = "flex";
    }
  }

  /**
   * Masquer l'indicateur de chargement en arrière-plan
   */
  hideBackgroundLoadingIndicator() {
    const indicator = document.getElementById("background-loading-indicator");
    if (indicator) {
      indicator.style.display = "none";
    }
  }

  /**
   * Charger les pages restantes en arrière-plan (désactivé - tout est déjà chargé via /briefs)
   */
  async loadRemainingPagesInBackground(postTypes) {
    console.log("✅ Chargement terminé - toutes les pages sont déjà disponibles via /briefs");
    
    // Masquer immédiatement l'indicateur car tout est déjà chargé
    this.hideBackgroundLoadingIndicator();
  }

  /**
   * Mettre à jour la progression du chargement en arrière-plan
   */
  updateBackgroundLoadingProgress(completed, total) {
    const indicator = document.getElementById("background-loading-indicator");
    const loadingText = indicator?.querySelector(".loading-text");

    if (loadingText) {
      const percentage = Math.round((completed / total) * 100);
      loadingText.textContent = `Chargement complet... ${percentage}%`;
    }
  }

  /**
   * Charger les briefs depuis MongoDB
   */

  /**
   * Basculer l'ordre de tri par date
   */
  toggleDateSort() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.updateSortIndicator();
    this.filterPages(); // Re-appliquer les filtres avec le nouveau tri
  }

  /**
   * Mettre à jour l'indicateur de tri
   */
  updateSortIndicator() {
    const indicator = document.getElementById('sort-indicator');
    if (indicator) {
      indicator.textContent = this.sortOrder === 'desc' ? '↓' : '↑';
    }
  }

  /**
   * Trier les pages par date de modification
   */
  sortPagesByDate(pages) {
    return pages.sort((a, b) => {
      const dateA = new Date(a.modified);
      const dateB = new Date(b.modified);
      
      if (this.sortOrder === 'desc') {
        return dateB - dateA; // Plus récent en premier
      } else {
        return dateA - dateB; // Plus ancien en premier
      }
    });
  }

  /**
   * Filtrer les pages
   */
  filterPages() {
    const filters = filterManager.getFilters();

    this.filteredPages = this.allPages.filter((page) => {
      const matchesTemplate =
        !filters.template || page.template === filters.template;
      const matchesSearch =
        !filters.search ||
        page.title.rendered.toLowerCase().includes(filters.search) ||
        page.slug.toLowerCase().includes(filters.search);

      const briefStatus = this.getBriefStatus(page.page_id);
      const matchesBrief = !filters.brief || briefStatus === filters.brief;

      return matchesTemplate && matchesSearch && matchesBrief;
    });
    
    // Appliquer le tri par date
    this.filteredPages = this.sortPagesByDate(this.filteredPages);
    
    this.currentPage = 1;
    this.renderPages();
  }

  /**
   * Rendre les pages
   */
  renderPages() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pagesToShow = this.filteredPages.slice(startIndex, endIndex);

    tableManager.renderPages(pagesToShow, this.briefsData);
    tableManager.updatePagination(
      this.currentPage,
      this.filteredPages.length,
      this.itemsPerPage
    );

    // IMPORTANT: Après le rendu, restaurer l'état de la queue
    // Cela évite de perdre les barres de progression pendant la synchronisation
    setTimeout(() => {
      this.updateQueueButtons();
    }, 50); // Petit délai pour que le DOM soit mis à jour
  }

  /**
   * Changer de page
   */
  changePage(direction) {
    const totalPages = Math.ceil(this.filteredPages.length / this.itemsPerPage);

    if (direction === -1 && this.currentPage > 1) {
      this.currentPage--;
    } else if (direction === 1 && this.currentPage < totalPages) {
      this.currentPage++;
    }

    this.renderPages();
  }

  /**
   * Obtenir le statut d'un brief
   */
  getBriefStatus(pageId) {
    const brief = this.briefsData[pageId];
    if (!brief) {
      return "not_generated";
    }
    
    // On fait confiance au statut stocké dans la base de données
    // car brief_html_base64 n'est pas toujours disponible (notamment depuis le cache)
    return brief.status || "not_generated";
  }

  /**
   * Générer un brief
   */
  async generateBrief(button, templateType, pageTitle, wordpressId) {
    const row = button.closest("tr");
    const briefStatus = row.querySelector(".brief-status");
    const briefIndicator = briefStatus.querySelector(".brief-indicator");
    const briefText = briefStatus.querySelector(".brief-text");

    // Démarrer la génération avec indicateur
    briefGenerationManager.startGeneration(wordpressId, pageTitle);

    // Remplacer le bouton par la barre de progression
    const actionCell = row.querySelector("td:nth-child(4)");
    actionCell.innerHTML = briefGenerationManager.getProgressBarHTML();

    // Mettre à jour le statut
    briefIndicator.classList.add("pending");
    briefText.textContent = "En cours...";

    try {
      // Récupérer la page depuis allPages (l'ID dans l'interface correspond au page_id)
      const page = this.allPages.find((p) => String(p.page_id) === String(wordpressId));
      
      // Récupérer l'URL de la page
      let pageUrl = page?.link;
      
      // Si pas d'URL dans allPages, essayer depuis le DOM
      if (!pageUrl) {
        // D'abord essayer l'attribut data-page-url sur la ligne
        pageUrl = row.getAttribute('data-page-url');
        
        // Si toujours pas d'URL, essayer l'attribut data-full-url sur l'élément page-url
        if (!pageUrl) {
          const pageUrlElement = row.querySelector('.page-url[data-full-url]');
          if (pageUrlElement) {
            pageUrl = pageUrlElement.getAttribute('data-full-url');
          }
        }
      }
      
      if (!pageUrl) {
        throw new Error("URL de la page introuvable - Veuillez recharger la page");
      }

      // Créer le brief
      const result = await apiService.createBrief({
        url: pageUrl,
        page_id: wordpressId.toString(),
        title: pageTitle,
        rest_base: page?.rest_base || templateType,
        wordpress_type: page?.wordpress_type || templateType,
        slug: page?.slug || '',
        source_type: "wordpress",
        status: "pending",
      });

      if (result.success) {
        // Terminer la génération
        briefGenerationManager.finishGeneration(wordpressId);

        // Succès
        briefIndicator.classList.remove("pending");
        briefIndicator.classList.add("generated");
        briefText.textContent = "Créé";

        // Mettre à jour le cache local
        this.briefsData[wordpressId] = result.brief;

        // Mettre à jour uniquement la ligne concernée sans recharger tout l'affichage
        this.updateBriefRow(wordpressId, result.brief);
      } else {
        throw new Error(result.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Erreur lors de la génération:", error);

      // Terminer la génération en cas d'erreur
      briefGenerationManager.finishGeneration(wordpressId);

      // Gestion des erreurs
      let errorMessage = "Erreur - Réessayer";
      let alertDetails = "";

      if (error.message.includes("URL")) {
        errorMessage = "URL invalide";
        alertDetails = `🌐 Problème d'URL: ${error.message}`;
      } else if (error.message.includes("validation")) {
        errorMessage = "Validation échouée";
        alertDetails = `⚠️ Problème de validation: ${error.message}`;
      } else {
        alertDetails = `⚠️ ${error.message}`;
      }

      // Remettre le bouton d'origine
      actionCell.innerHTML = `
        <button class="generate-btn" onclick="app.generateBrief(this, '${templateType}', '${pageTitle}', ${wordpressId})">
          ${errorMessage}
        </button>
      `;

      // Remettre le statut d'origine
      briefIndicator.classList.remove("pending");
      briefText.textContent = "À générer";
    }
  }

  /**
   * Lire un brief
   */
  async readBrief(pageId, pageTitle) {
    try {
      const response = await apiService.getBrief(pageId);
      const brief = response.data || response;

      if (!brief.brief_html_base64) {
        notificationManager.showError(
          "Aucun contenu de brief disponible pour cette page."
        );
        return;
      }

      // Décoder et ouvrir
      const decodedHtml = decodeBase64ToUTF8(brief.brief_html_base64);
      openHtmlWindow(decodedHtml, `Brief - ${pageTitle}`);
    } catch (error) {
      console.error("Erreur lors de la lecture du brief:", error);
      notificationManager.showError(
        "Erreur lors de la lecture du brief",
        error.message
      );
    }
  }

  /**
   * Mettre à jour uniquement la ligne d'un brief sans recharger tout l'affichage
   */
  updateBriefRow(pageId, brief) {
    try {
      const row = document.querySelector(`tr[data-wordpress-id="${pageId}"]`);
      if (!row) {
        console.warn(`Ligne non trouvée pour page_id: ${pageId}`);
        return;
      }

      // Mettre à jour le cache avec les informations du nouveau brief
      cacheService.markBriefAsGenerated(pageId, {
        brief_id: brief._id || brief.brief_id,
        brief_generated_at: brief.generated_at || new Date().toISOString(),
        brief_created_at: brief.created_at || new Date().toISOString()
      });

      // Mettre à jour le statut du brief
      const briefStatus = row.querySelector(".brief-status");
      if (briefStatus) {
        const briefIndicator = briefStatus.querySelector(".brief-indicator");
        const briefText = briefStatus.querySelector(".brief-text");

        if (briefIndicator) {
          briefIndicator.classList.remove("pending");
          briefIndicator.classList.add("generated");
        }

        if (briefText) {
          briefText.textContent = "Créé";
        }
      }

      // Mettre à jour les boutons d'action
      const actionCell = row.querySelector("td:nth-child(4)");
      if (actionCell) {
        const pageTitle =
          row
            .querySelector("td:nth-child(1) .page-title-cell")
            ?.textContent?.trim() || "";

        // Échapper les guillemets pour éviter les erreurs JavaScript
        const escapedTitle = pageTitle.replace(/'/g, "\\'").replace(/"/g, '\\"');

        actionCell.innerHTML = `
          <div style="display: flex; gap: 4px; flex-direction: column;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="read-brief-btn" onclick="app.readBrief(${pageId}, '${escapedTitle}')">📖 Lire</button>
              <button class="download-brief-btn" onclick="app.downloadBrief(${pageId}, '${escapedTitle}')">💾 Télécharger</button>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="apply-recommendations-btn" onclick="app.applyRecommendations(${pageId}, '${escapedTitle}')">📝 Appliquer</button>
              <button class="new-brief-btn" onclick="app.createNewBrief(${pageId}, '${escapedTitle}')">🔄 Nouveau</button>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="delete-brief-btn" onclick="app.deleteBrief(${pageId}, '${escapedTitle}')">🗑️ Supprimer</button>
            </div>
          </div>
        `;
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de la ligne pour page_id: ${pageId}`, error);
      notificationManager.showError("Erreur lors de la mise à jour de l'interface", error.message);
    }
  }

  /**
   * Mettre à jour les boutons concernés par la queue
   */
  updateQueueButtons() {
    // Parcourir toutes les lignes du tableau
    const rows = document.querySelectorAll('tr[data-wordpress-id]');
    
    rows.forEach(row => {
      const pageId = row.getAttribute('data-wordpress-id');
      const queueState = briefQueue.getBriefState(pageId);
      const actionCell = row.querySelector('td:nth-child(4)');
      
      if (!actionCell) return;
      
      // Mettre à jour le bouton selon l'état de la queue
      if (queueState === 'generating') {
        // Vérifier si la barre de progression est déjà présente
        if (!actionCell.querySelector('.brief-progress-container')) {
          actionCell.innerHTML = `
            <div class="animate-in" style="animation: slideInFromRight 0.3s ease-out;">
              ${briefGenerationManager.getProgressBarHTML()}
            </div>
          `;
        }
      } else if (queueState === 'queued') {
        actionCell.innerHTML = `
          <div class="queue-status queued animate-in" style="animation: slideInFromRight 0.3s ease-out;">
            <div class="queue-pulse"></div>
            <span>⏳ En attente</span>
          </div>
        `;
      } else if (queueState === 'idle') {
        // Vérifier si le brief existe
        const briefExists = this.briefsData[pageId];
        if (!briefExists) {
          // Récupérer les infos de la page pour reconstituer le bouton
          const page = this.allPages.find(p => String(p.page_id) === String(pageId));
          if (page) {
            actionCell.innerHTML = tableManager.createGenerateButton(page);
          }
        }
      }
    });
  }

  /**
   * Appliquer les recommandations du brief à la page
   */
  async applyRecommendations(pageId, pageTitle) {
    try {
      console.log(`📝 Application des recommandations pour page ${pageId}: ${pageTitle}`);
      
      // TODO: Implémenter la logique d'application des recommandations
      notificationManager.showInfo(`Application des recommandations pour "${pageTitle}" - Fonctionnalité à implémenter`);
      
    } catch (error) {
      console.error("Erreur lors de l'application des recommandations:", error);
      notificationManager.showError(
        "Erreur lors de l'application des recommandations",
        error.message
      );
    }
  }

  /**
   * Télécharger un brief
   */
  async downloadBrief(pageId, pageTitle) {
    try {
      const response = await apiService.getBrief(pageId);
      const brief = response.data || response;

      if (!brief.brief_html_base64) {
        notificationManager.showError(
          "Aucun contenu de brief disponible pour cette page."
        );
        return;
      }

      // Décoder et télécharger
      const decodedHtml = decodeBase64ToUTF8(brief.brief_html_base64);
      const fileName = `brief_${sanitizeFileName(pageTitle)}.html`;

      downloadFile(decodedHtml, fileName);

      console.log(`Brief téléchargé: ${fileName}`);
    } catch (error) {
      console.error("Erreur lors du téléchargement du brief:", error);
      notificationManager.showError(
        "Erreur lors du téléchargement du brief",
        error.message
      );
    }
  }

  /**
   * Supprimer un brief
   */
  async deleteBrief(pageId, pageTitle) {
    // Demander confirmation
    if (!notificationManager.confirm(`Êtes-vous sûr de vouloir supprimer le brief pour "${pageTitle}" ?`)) {
      return;
    }

    try {
      const response = await apiService.deleteBrief(pageId);
      
      if (response && response.success !== false) {
        // Supprimer du cache local (mémoire)
        delete this.briefsData[pageId];

        // Supprimer du cache persistant
        cacheService.deleteBriefFromCache(pageId);

        // Mettre à jour la ligne du tableau
        this.updateBriefRowAfterDelete(pageId);

        notificationManager.showSuccess(`Brief supprimé pour "${pageTitle}"`);
        console.log(`Brief supprimé pour page_id: ${pageId}`);
      } else {
        throw new Error(response?.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du brief:", error);
      notificationManager.showError(
        "Erreur lors de la suppression du brief",
        error.message
      );
    }
  }

  /**
   * Créer un nouveau brief (remplacer l'existant)
   */
  async createNewBrief(pageId, pageTitle) {
    // Demander confirmation
    if (!notificationManager.confirm(`Êtes-vous sûr de vouloir créer un nouveau brief pour "${pageTitle}" ?\n\nCela remplacera le brief existant.`)) {
      return;
    }

    try {
      // Trouver la page
      const page = this.allPages.find((p) => String(p.page_id) === String(pageId));
      if (!page) {
        throw new Error("Page non trouvée");
      }

      // Ajouter à la queue
      const added = briefQueue.addToQueue({
        pageId: pageId,
        pageTitle: pageTitle,
        templateType: page.template,
        button: document.querySelector(`tr[data-wordpress-id="${pageId}"] button`)
      });

      if (added) {
        notificationManager.showSuccess(`Nouveau brief ajouté à la queue pour "${pageTitle}"`);
      } else {
        notificationManager.showWarning(`Brief déjà en cours ou en queue pour "${pageTitle}"`);
      }
      
    } catch (error) {
      console.error("Erreur lors de la création du nouveau brief:", error);
      notificationManager.showError(
        "Erreur lors de la création du nouveau brief",
        error.message
      );
    }
  }

  /**
   * Mettre à jour la ligne du tableau après suppression d'un brief
   */
  updateBriefRowAfterDelete(pageId) {
    const row = document.querySelector(`tr[data-wordpress-id="${pageId}"]`);
    if (!row) {
      console.warn(`Ligne non trouvée pour page_id: ${pageId}`);
      return;
    }

    // Mettre à jour le statut du brief
    const briefStatus = row.querySelector(".brief-status");
    if (briefStatus) {
      const briefIndicator = briefStatus.querySelector(".brief-indicator");
      const briefText = briefStatus.querySelector(".brief-text");

      if (briefIndicator) {
        briefIndicator.classList.remove("generated", "pending");
        briefIndicator.classList.add("not_generated");
      }

      if (briefText) {
        briefText.textContent = "À générer";
      }
    }

    // Mettre à jour les boutons d'action
    const actionCell = row.querySelector("td:nth-child(4)");
    if (actionCell) {
      const page = this.allPages.find((p) => String(p.page_id) === String(pageId));
      if (page) {
        actionCell.innerHTML = `
          <button class="generate-btn" onclick="app.generateBrief(this, '${page.template}', '${page.title.rendered}', ${pageId})">
            Générer le brief
          </button>
        `;
      }
    }

    console.log(`Ligne mise à jour après suppression pour page_id: ${pageId}`);
  }
}

// Initialiser l'application au chargement de la page
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new App();
});

// Fonctions globales pour la compatibilité avec les événements inline
// ==================== FONCTIONS D'AUTHENTIFICATION ====================

/**
 * Afficher le formulaire de connexion
 */
function showLoginForm() {
  document.getElementById('login-tab').classList.add('active');
  document.getElementById('register-tab').classList.remove('active');
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

/**
 * Afficher le formulaire d'inscription
 */
function showRegisterForm() {
  document.getElementById('register-tab').classList.add('active');
  document.getElementById('login-tab').classList.remove('active');
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('login-form').style.display = 'none';
}

/**
 * Gérer la connexion
 */
async function handleLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!username || !password) {
    notificationManager.showError("Veuillez remplir tous les champs");
    return;
  }

  const btn = document.getElementById("login-btn");
  const text = document.getElementById("login-text");
  const originalText = text.textContent;

  btn.disabled = true;
  text.textContent = "Connexion...";

  try {
    // Authentification via JWT
    await authService.login(username, password);

    // Configurer l'authentification pour les clients API
    apiService.setupAuth();
    
    // Démarrer l'affichage du statut
    authService.startStatusUpdater();

    // Connexion réussie
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
    
    // Afficher le bouton de déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
    }

    // Afficher le loader immédiatement (sera masqué si cache disponible)
    loadingManager.show("Chargement des pages WordPress...");
    
    // Petit délai pour le DOM puis charger les données
    await new Promise(resolve => setTimeout(resolve, 100));
    await app.loadAllPages();

    notificationManager.showSuccess("Connexion réussie !");

  } catch (error) {
    console.error("Erreur de connexion:", error);
    notificationManager.showError(error.message || "Erreur de connexion");
  } finally {
    btn.disabled = false;
    text.textContent = originalText;
  }
}

/**
 * Gérer la création de site
 */
async function handleRegister() {
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const baseUrl = document.getElementById("register-url").value.trim();
  const appType = document.querySelector('input[name="app-type"]:checked').value;

  if (!username || !password || !baseUrl) {
    notificationManager.showError("Veuillez remplir les champs obligatoires");
    return;
  }

  // Validation URL
  try {
    new URL(baseUrl);
  } catch {
    notificationManager.showError("URL invalide. Format: https://monsite.com");
    return;
  }

  const btn = document.getElementById("register-btn");
  const text = document.getElementById("register-text");
  const originalText = text.textContent;

  btn.disabled = true;
  text.textContent = "Test de connexion...";

  try {
    // D'abord tester la connexion
    if (appType === 'wordpress') {
      await authService.testConnection(username, password, baseUrl);
    }
    
    // Si le test réussit, créer le site
    text.textContent = "Ajout en cours...";
    const result = await authService.register({
      username,
      password,
      base_url: baseUrl,
      app_type: appType
    });

    notificationManager.showSuccess("Site ajouté avec succès ! Connexion automatique...");
    
    // Si un token JWT a été reçu, rediriger directement vers le dashboard
    if (result.token && authService.isAuthenticated()) {
      // Configurer l'authentification API
      apiService.setupAuth();
      
      // Démarrer l'affichage du statut
      authService.startStatusUpdater();
      
      // Basculer vers l'interface connectée
      document.getElementById('auth-container').style.display = 'none';
      document.getElementById('main-dashboard').style.display = 'block';
      
      // Afficher les boutons de header
      const logoutBtn = document.getElementById('logout-btn');
      const syncBtn = document.getElementById('sync-btn');
      if (logoutBtn) {
        logoutBtn.style.display = 'block';
      }
      if (syncBtn) {
        syncBtn.style.display = 'block';
      }
      
      // Afficher le loader immédiatement (sera masqué si cache disponible)
      loadingManager.show("Chargement des pages WordPress...");
      
      // Petit délai pour le DOM puis charger les données
      await new Promise(resolve => setTimeout(resolve, 100));
      await app.loadAllPages();
    } else {
      // Fallback: passer au formulaire de connexion avec les données pré-remplies
      showLoginForm();
      document.getElementById("login-username").value = username;
      document.getElementById("login-password").value = password;
    }

  } catch (error) {
    console.error("Erreur de création:", error);
    console.log("Message d'erreur à afficher:", error.message);
    notificationManager.showError(error.message || "Erreur lors de l'ajout du site");
  } finally {
    btn.disabled = false;
    text.textContent = originalText;
  }
}

/**
 * Tester la connexion WordPress
 */
async function testConnection() {
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const baseUrl = document.getElementById("register-url").value.trim();

  if (!username || !password || !baseUrl) {
    notificationManager.showError("Veuillez remplir tous les champs obligatoires");
    return;
  }

  // Validation URL
  try {
    new URL(baseUrl);
  } catch {
    notificationManager.showError("URL invalide. Format: https://monsite.com");
    return;
  }

  const btn = document.getElementById("test-connection-btn");
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = "🔄 Test en cours...";

  try {
    await authService.testConnection(username, password, baseUrl);
    notificationManager.showSuccess("✅ Connexion WordPress réussie !");
  } catch (error) {
    console.error("Erreur de test:", error);
    notificationManager.showError(error.message || "Erreur de test de connexion");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ==================== APP TYPE HANDLING ====================

/**
 * Mettre à jour les labels et placeholders selon le type d'app sélectionné
 */
function updateFormLabels() {
  const appType = document.querySelector('input[name="app-type"]:checked').value;
  const usernameLabel = document.getElementById('username-label');
  const passwordLabel = document.getElementById('password-label');
  const urlLabel = document.getElementById('url-label');
  const passwordHint = document.getElementById('password-hint');
  const urlHint = document.getElementById('url-hint');
  const usernameInput = document.getElementById('register-username');
  const passwordInput = document.getElementById('register-password');
  const urlInput = document.getElementById('register-url');

  if (appType === 'wordpress') {
    usernameLabel.textContent = 'Nom d\'utilisateur WordPress';
    passwordLabel.textContent = 'Clé API WordPress';
    urlLabel.textContent = 'URL du site WordPress';
    passwordHint.textContent = 'Votre clé d\'application WordPress (créée dans Utilisateurs → Mots de passe d\'application)';
    urlHint.textContent = 'L\'adresse complète de votre site WordPress';
    usernameInput.placeholder = 'admin';
    passwordInput.placeholder = 'xxxx xxxx xxxx xxxx xxxx xxxx';
    urlInput.placeholder = 'https://monsite.com';
  } else if (appType === 'webflow') {
    usernameLabel.textContent = 'Site ID Webflow';
    passwordLabel.textContent = 'Clé API Webflow';
    urlLabel.textContent = 'URL du site Webflow';
    passwordHint.textContent = 'Votre clé API Webflow (obtenue dans les paramètres du site)';
    urlHint.textContent = 'L\'adresse complète de votre site Webflow';
    usernameInput.placeholder = 'site-id-12345';
    passwordInput.placeholder = 'wf_xxxxxxxxxxxxxxxxxxxxxxxx';
    urlInput.placeholder = 'https://monsite.webflow.io';
  }
}

// ==================== FONCTIONS LEGACY ====================

function connectToWordPress() {
  handleLogin(); // Redirection vers la nouvelle fonction
}

function filterPages() {
  app.filterPages();
}

function changePage(direction) {
  app.changePage(direction);
}
