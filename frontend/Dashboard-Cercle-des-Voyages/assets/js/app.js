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

    this.init();
  }

  /**
   * Initialiser l'application
   */
  init() {
    this.setupEventListeners();
    CONFIG.showEnvironmentInfo();
    console.log("Application initialisée");
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
   * Synchroniser les données RAG
   */
  async syncRAGData() {
    const syncBtn = document.getElementById("sync-rag-btn");
    const originalText = syncBtn.innerHTML;

    try {
      // Désactiver le bouton et changer l'apparence
      syncBtn.disabled = true;
      syncBtn.classList.add("syncing");
      syncBtn.innerHTML = "🔄 Synchronisation...";

      // Appeler l'API de synchronisation RAG
      const response = await fetch(`${CONFIG.API_BASE_URL}/rag/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Plus besoin d'envoyer username/password - le backend utilise les variables d'environnement
      });

      const result = await response.json();

      if (result.success) {
        notificationManager.showSuccess(
          `Synchronisation réussie ! ${
            result.stats?.embeddings_saved || 0
          } pages traitées.`
        );
      } else {
        throw new Error(result.error || "Erreur lors de la synchronisation");
      }
    } catch (error) {
      console.error("Erreur lors de la synchronisation RAG:", error);
      notificationManager.showError(
        "Erreur lors de la synchronisation",
        error.message
      );
    } finally {
      // Restaurer le bouton
      syncBtn.disabled = false;
      syncBtn.classList.remove("syncing");
      syncBtn.innerHTML = originalText;
    }
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
      // Configurer l'authentification
      apiService.setAuthHeader(username, password);

      // Tester la connexion
      await apiService.testWordPressConnection();

      // Connexion réussie
      connectionManager.showConnected();

      // Charger les données
      await this.loadAllPages();
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
   * Charger toutes les pages WordPress
   */
  async loadAllPages() {
    try {
      loadingManager.show("Chargement des pages WordPress...");

      // Récupérer les types de posts
      const postTypes = await apiService.getPostTypes();
      console.log("Types de posts découverts:", Object.keys(postTypes));

      // Récupérer les contenus pour chaque type (avec filtrage et pagination)
      const allContentPromises = [];
      let processedTypes = 0;
      const totalTypes = Object.keys(postTypes).length;

      for (const [typeKey, typeData] of Object.entries(postTypes)) {
        // Ignorer les types système
        if (shouldIgnorePostType(typeKey)) {
          processedTypes++;
          continue;
        }

        const endpoint = typeData.rest_base || typeKey;

        // Vérifier si l'endpoint est valide
        if (!isValidRestEndpoint(endpoint)) {
          console.log(
            `Endpoint '${endpoint}' ignoré (contient des patterns regex)`
          );
          processedTypes++;
          continue;
        }

        // Mettre à jour le statut de chargement
        loadingManager.show(
          `Chargement des pages WordPress... (${processedTypes}/${totalTypes})`
        );

        const promise = apiService
          .getPostsByType(endpoint, CONFIG.WORDPRESS_PAGES_PER_TYPE)
          .then((result) => {
            processedTypes++;

            if (result.posts && result.posts.length > 0) {
              console.log(
                `✓ ${result.posts.length}/${result.totalPosts} éléments chargés pour le type '${typeKey}'`
              );
            }

            return (result.posts || []).map((item) => ({
              ...item,
              wordpress_type: typeKey,
              type_label: typeData.name,
              rest_base: typeData.rest_base || typeKey,
              template: mapPostTypeToTemplate(typeKey),
            }));
          });

        allContentPromises.push(promise);
      }

      // Attendre toutes les requêtes
      const allContentArrays = await Promise.all(allContentPromises);

      // Combiner tous les contenus
      this.allPages = allContentArrays.flat();
      this.filteredPages = [...this.allPages];

      console.log(
        "Pages chargées par type:",
        this.allPages.reduce((acc, page) => {
          acc[page.wordpress_type] = (acc[page.wordpress_type] || 0) + 1;
          return acc;
        }, {})
      );

      // Mettre à jour les filtres
      filterManager.updateTemplateFilter(this.allPages);

      // Charger les briefs depuis MongoDB
      await this.loadBriefsFromMongoDB();

      // Rendre les pages
      this.renderPages();

      loadingManager.hide();

      // Afficher l'indicateur de chargement en arrière-plan
      this.showBackgroundLoadingIndicator();

      // Charger les pages restantes en arrière-plan
      this.loadRemainingPagesInBackground(postTypes);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      loadingManager.showError(error.message, "app.loadAllPages()");
    }
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
   * Charger les pages restantes en arrière-plan
   */
  async loadRemainingPagesInBackground(postTypes) {
    console.log("🔄 Chargement des pages restantes en arrière-plan...");

    const backgroundPromises = [];
    let completedTypes = 0;
    const totalTypesToLoad = Object.keys(postTypes).filter(
      (typeKey) =>
        !shouldIgnorePostType(typeKey) &&
        isValidRestEndpoint(postTypes[typeKey].rest_base || typeKey)
    ).length;

    for (const [typeKey, typeData] of Object.entries(postTypes)) {
      // Ignorer les types système
      if (shouldIgnorePostType(typeKey)) {
        continue;
      }

      const endpoint = typeData.rest_base || typeKey;

      // Vérifier si l'endpoint est valide
      if (!isValidRestEndpoint(endpoint)) {
        continue;
      }

      // Charger toutes les pages pour ce type
      const promise = apiService
        .getAllPostsByType(
          endpoint,
          CONFIG.WORDPRESS_PAGES_PER_TYPE,
          (loaded, total) => {
            console.log(`📊 ${typeKey}: ${loaded}/${total} pages chargées`);
          }
        )
        .then((allPosts) => {
          completedTypes++;

          if (allPosts.length > 0) {
            // Mapper les posts
            const mappedPosts = allPosts.map((item) => ({
              ...item,
              wordpress_type: typeKey,
              type_label: typeData.name,
              rest_base: typeData.rest_base || typeKey,
              template: mapPostTypeToTemplate(typeKey),
            }));

            // Remplacer les pages de ce type par toutes les pages
            this.allPages = this.allPages.filter(
              (page) => page.wordpress_type !== typeKey
            );
            this.allPages.push(...mappedPosts);

            // Mettre à jour les filtres
            this.filteredPages = [...this.allPages];
            filterManager.updateTemplateFilter(this.allPages);

            console.log(
              `✅ ${typeKey}: ${allPosts.length} pages chargées au total`
            );
          }

          // Mettre à jour l'indicateur de progression
          this.updateBackgroundLoadingProgress(
            completedTypes,
            totalTypesToLoad
          );

          return allPosts;
        })
        .catch((error) => {
          console.warn(
            `Erreur chargement arrière-plan pour ${typeKey}:`,
            error
          );
          completedTypes++;
          this.updateBackgroundLoadingProgress(
            completedTypes,
            totalTypesToLoad
          );
          return [];
        });

      backgroundPromises.push(promise);
    }

    // Attendre que tout soit chargé
    await Promise.all(backgroundPromises);

    console.log(
      `🎉 Chargement complet: ${this.allPages.length} pages au total`
    );

    // Masquer l'indicateur de chargement
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
  async loadBriefsFromMongoDB() {
    try {
      const briefs = await apiService.getBriefs();

      // Indexer par page_id
      this.briefsData = {};
      briefs.forEach((brief) => {
        this.briefsData[brief.page_id] = brief;
      });

      console.log(
        "Briefs chargés depuis MongoDB:",
        Object.keys(this.briefsData).length
      );
    } catch (error) {
      console.warn("Erreur lors du chargement des briefs:", error);
    }
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

      const briefStatus = this.getBriefStatus(page.id);
      const matchesBrief = !filters.brief || briefStatus === filters.brief;

      return matchesTemplate && matchesSearch && matchesBrief;
    });

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
    return brief ? brief.status : "not_generated";
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
      // Récupérer la page
      const page = this.allPages.find((p) => p.id === wordpressId);
      if (!page || !page.link) {
        throw new Error("URL de la page introuvable");
      }

      // Créer le brief
      const result = await apiService.createBrief({
        url: page.link,
        page_id: wordpressId.toString(),
        title: pageTitle,
        rest_base: page.rest_base,
        wordpress_type: page.wordpress_type,
        slug: page.slug,
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
  async readBrief(wordpressId, pageTitle) {
    try {
      const brief = await apiService.getBrief(wordpressId);

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

      actionCell.innerHTML = `
        <div style="display: flex; gap: 4px; flex-direction: column;">
          <button class="generate-btn generated" disabled>✓ Brief créé</button>
          <div style="display: flex; gap: 4px;">
            <button class="read-brief-btn" onclick="app.readBrief(${pageId}, '${pageTitle}')">📖 Lire</button>
            <button class="download-brief-btn" onclick="app.downloadBrief(${pageId}, '${pageTitle}')">💾 Télécharger</button>
          </div>
        </div>
      `;
    }

    console.log(`Ligne mise à jour pour brief ${pageId}`);
  }

  /**
   * Télécharger un brief
   */
  async downloadBrief(wordpressId, pageTitle) {
    try {
      const brief = await apiService.getBrief(wordpressId);

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
}

// Initialiser l'application au chargement de la page
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new App();
});

// Fonctions globales pour la compatibilité avec les événements inline
function connectToWordPress() {
  app.connectToWordPress();
}

function filterPages() {
  app.filterPages();
}

function changePage(direction) {
  app.changePage(direction);
}
