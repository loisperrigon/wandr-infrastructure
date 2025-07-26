/**
 * Composants UI pour l'interface utilisateur
 */

/**
 * Gestionnaire de l'état de connexion
 */
class ConnectionManager {
  constructor() {
    this.isConnected = false;
    this.connectionStatus = document.getElementById("connection-status-header");
    this.connectionForm = document.getElementById("connection-form");
    this.mainDashboard = document.getElementById("main-dashboard");
  }

  /**
   * Afficher l'état connecté
   */
  showConnected() {
    this.isConnected = true;
    this.connectionStatus.classList.add("connected");
    this.connectionStatus.classList.remove("error");
    this.connectionForm.style.display = "none";
    this.mainDashboard.style.display = "block";
    document.getElementById("table-container").classList.add("visible");
  }

  /**
   * Afficher l'état d'erreur
   */
  showError(message) {
    this.isConnected = false;
    this.connectionStatus.classList.add("error");
    this.connectionStatus.classList.remove("connected");
    this.connectionStatus.textContent = message || "Erreur de connexion";
  }

  /**
   * Réinitialiser l'état de connexion
   */
  reset() {
    this.isConnected = false;
    this.connectionStatus.classList.remove("connected", "error");
    this.connectionForm.style.display = "block";
    this.mainDashboard.style.display = "none";
  }
}

/**
 * Gestionnaire des états de chargement
 */
class LoadingManager {
  constructor() {
    this.loadingState = document.getElementById("loading-state");
    this.pagesTable = document.getElementById("pages-table");
  }

  /**
   * Afficher l'état de chargement
   */
  show(message = "Chargement des pages WordPress...") {
    // S'assurer que le conteneur parent est visible
    const tableContainer = document.getElementById('table-container');
    if (tableContainer) {
      tableContainer.classList.add('visible');
    }
    
    if (this.loadingState) {
      this.loadingState.style.display = "block";
      this.loadingState.innerHTML = `
        <div class="spinner"></div>
        <p>${message}</p>
      `;
    }
    
    if (this.pagesTable) {
      this.pagesTable.style.display = "none";
    }
  }

  /**
   * Cacher l'état de chargement
   */
  hide() {
    this.loadingState.style.display = "none";
    this.pagesTable.style.display = "table";
  }

  /**
   * Afficher une erreur
   */
  showError(message, onRetry = null) {
    this.loadingState.style.display = "block";
    this.loadingState.innerHTML = `
      <p style="color: #dc3545;">Erreur lors du chargement: ${message}</p>
      ${
        onRetry
          ? '<button onclick="' +
            onRetry +
            '" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Réessayer</button>'
          : ""
      }
    `;
    this.pagesTable.style.display = "none";
  }
}

/**
 * Gestionnaire du tableau des pages
 */
class TableManager {
  constructor() {
    this.tbody = document.getElementById("pages-tbody");
    this.paginationInfo = document.getElementById("pagination-info");
    this.prevBtn = document.getElementById("prev-btn");
    this.nextBtn = document.getElementById("next-btn");
  }

  /**
   * Rendre les pages dans le tableau
   */
  renderPages(pages, briefsData) {
    this.tbody.innerHTML = pages
      .map((page) => this.createPageRow(page, briefsData))
      .join("");
  }

  /**
   * Créer une ligne de tableau pour une page
   */
  createPageRow(page, briefsData) {
    const briefStatus = this.getBriefStatus(page.page_id, briefsData);
    const isGenerating = briefGenerationManager.isGenerating(page.page_id);

    return `
      <tr data-wordpress-id="${page.page_id}" data-page-url="${page.link || ''}">
        <td>
          <div class="page-info">
            <div class="page-details">
              <div class="page-title-cell">${page.title.rendered}</div>
              <div class="page-url" data-full-url="${page.link || ''}">${this.formatUrl(
                page.link
              )} <small style="color: #999;">(${
      page.wordpress_type
    })</small></div>
            </div>
          </div>
        </td>
        <td>
          <span class="template-badge ${page.template}">${getTemplateName(
      page.template
    )}</span>
        </td>
        <td>
          <div class="brief-status">
            <div class="brief-indicator ${briefStatus}"></div>
            <span class="brief-text">${
              briefStatus === "generated" ? "Créé" : 
              briefStatus === "pending" ? "En attente" : 
              "À générer"
            }</span>
          </div>
        </td>
        <td>
          ${this.createActionButtons(page, briefStatus, isGenerating)}
        </td>
        <td>
          <span class="timestamp">${getTimeAgo(page.modified)}</span>
        </td>
      </tr>
    `;
  }

  /**
   * Créer les boutons d'action selon l'état du brief
   */
  createActionButtons(page, briefStatus, isGenerating) {
    if (briefStatus === "generated") {
      return `
        <div style="display: flex; gap: 4px; flex-direction: column;">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="read-brief-btn" onclick="app.readBrief(${page.page_id}, '${page.title.rendered.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">📖 Lire</button>
            <button class="download-brief-btn" onclick="app.downloadBrief(${page.page_id}, '${page.title.rendered.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">💾 Télécharger</button>
          </div>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="apply-recommendations-btn" onclick="app.applyRecommendations(${page.page_id}, '${page.title.rendered.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">📝 Appliquer</button>
            <button class="new-brief-btn" onclick="app.createNewBrief(${page.page_id}, '${page.title.rendered.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">🔄 Nouveau</button>
          </div>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="delete-brief-btn" onclick="app.deleteBrief(${page.page_id}, '${page.title.rendered.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">🗑️ Supprimer</button>
          </div>
        </div>
      `;
    } else {
      // Vérifier l'état dans la queue
      const queueState = briefQueue.getBriefState(page.page_id);
      
      if (queueState === 'generating') {
        return this.createGeneratingButton(page.page_id);
      } else if (queueState === 'queued') {
        return this.createQueuedButton(page.page_id);
      } else if (isGenerating) {
        return briefGenerationManager.getProgressBarHTML();
      } else {
        return this.createGenerateButton(page);
      }
    }
  }

  /**
   * Créer le bouton de génération standard
   */
  createGenerateButton(page) {
    return `
      <button class="generate-btn" onclick="this.classList.add('btn-clicked'); briefQueue.addToQueue({
        pageId: ${page.page_id}, 
        pageTitle: '${page.title.rendered.replace(/'/g, "\\'")}', 
        templateType: '${page.template}', 
        button: this
      })">
        Générer le brief
      </button>
    `;
  }

  /**
   * Créer le bouton pour brief en cours de génération
   */
  createGeneratingButton(pageId) {
    return `
      <div class="animate-in" style="animation: slideInFromRight 0.3s ease-out;">
        ${briefGenerationManager.getProgressBarHTML()}
      </div>
    `;
  }

  /**
   * Créer le bouton pour brief en queue
   */
  createQueuedButton(pageId) {
    return `
      <div class="queue-status queued animate-in" style="animation: slideInFromRight 0.3s ease-out;">
        <div class="queue-pulse"></div>
        <span>⏳ En attente</span>
      </div>
    `;
  }

  /**
   * Obtenir le statut d'un brief
   */
  getBriefStatus(pageId, briefsData) {
    const brief = briefsData[pageId];
    if (!brief) {
      return "not_generated";
    }
    
    // On fait confiance au statut stocké dans la base de données
    // car brief_html_base64 n'est pas toujours disponible (notamment depuis le cache)
    return brief.status || "not_generated";
  }

  /**
   * Formater l'URL pour l'affichage
   */
  formatUrl(url) {
    return url.replace("https://", "").substring(0, 40) + "...";
  }

  /**
   * Mettre à jour la pagination
   */
  updatePagination(currentPage, totalItems, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    this.paginationInfo.textContent = `Affichage ${startItem}-${endItem} sur ${totalItems} pages`;
    this.prevBtn.disabled = currentPage === 1;
    this.nextBtn.disabled = currentPage === totalPages;
    
    // Mettre à jour le numéro de page affiché
    const pageNumberBtn = document.querySelector('.pagination-controls .pagination-btn.active');
    if (pageNumberBtn) {
      pageNumberBtn.textContent = currentPage;
    }
  }
}

/**
 * Gestionnaire des filtres
 */
class FilterManager {
  constructor() {
    this.templateFilter = document.getElementById("template-filter");
    this.briefFilter = document.getElementById("brief-filter");
    this.searchInput = document.getElementById("search-input");
  }

  /**
   * Mettre à jour les options du filtre de template
   */
  updateTemplateFilter(pages) {
    const uniqueTemplates = [...new Set(pages.map((page) => page.template))];

    // Garder l'option "Tous"
    const allOption = '<option value="">Tous les templates</option>';

    this.templateFilter.innerHTML =
      allOption +
      "\n" +
      uniqueTemplates
        .map(
          (template) =>
            `<option value="${template}">${getTemplateName(template)}</option>`
        )
        .join("\n");
  }

  /**
   * Mettre à jour les options du filtre de type de post
   */
  updatePostTypeFilter(postTypes) {
    // Pour l'instant, on utilise le même filtre que les templates
    // car les types de posts sont mappés vers les templates
    const pages = Object.keys(postTypes).map(type => ({
      template: mapPostTypeToTemplate(type)
    }));
    
    this.updateTemplateFilter(pages);
  }

  /**
   * Obtenir les valeurs actuelles des filtres
   */
  getFilters() {
    return {
      template: this.templateFilter.value,
      brief: this.briefFilter.value,
      search: this.searchInput.value.toLowerCase(),
    };
  }

  /**
   * Réinitialiser tous les filtres
   */
  reset() {
    this.templateFilter.value = "";
    this.briefFilter.value = "";
    this.searchInput.value = "";
  }
}

/**
 * Gestionnaire de génération des briefs
 */
class BriefGenerationManager {
  constructor() {
    this.generatingBriefs = new Map(); // wordpressId -> { startTime, timer, progress }
  }

  /**
   * Démarrer la génération d'un brief
   */
  startGeneration(wordpressId, pageTitle) {
    const startTime = Date.now();
    const estimatedDuration = 4 * 60 * 1000; // 4 minutes en millisecondes

    this.generatingBriefs.set(wordpressId, {
      startTime,
      estimatedDuration,
      progress: 0,
      pageTitle,
    });

    // Démarrer le minuteur de progression
    const timer = setInterval(() => {
      this.updateProgress(wordpressId);
    }, 1000); // Mise à jour toutes les secondes

    this.generatingBriefs.get(wordpressId).timer = timer;


    console.log(`🔄 Début de génération pour: ${pageTitle}`);
  }

  /**
   * Mettre à jour la progression d'un brief
   */
  updateProgress(wordpressId) {
    const brief = this.generatingBriefs.get(wordpressId);
    if (!brief) return;

    const elapsed = Date.now() - brief.startTime;
    const progress = Math.min((elapsed / brief.estimatedDuration) * 100, 100);

    brief.progress = progress;

    // Mettre à jour la barre de progression dans le tableau
    this.updateProgressBar(wordpressId, progress, elapsed);

    // Si ça dépasse 4 minutes, changer la couleur
    if (elapsed > brief.estimatedDuration) {
      this.updateProgressBarColor(wordpressId, "warning");
    }

    // Si ça dépasse 6 minutes, couleur rouge
    if (elapsed > 6 * 60 * 1000) {
      this.updateProgressBarColor(wordpressId, "danger");
    }
  }

  /**
   * Mettre à jour la barre de progression dans le tableau
   */
  updateProgressBar(wordpressId, progress, elapsed) {
    const row = document.querySelector(
      `tr[data-wordpress-id="${wordpressId}"]`
    );
    if (!row) return;

    const progressContainer = row.querySelector(".brief-progress-container");
    if (!progressContainer) return;

    const progressFill = progressContainer.querySelector(
      ".brief-progress-fill"
    );
    const progressText = progressContainer.querySelector(
      ".brief-progress-text"
    );

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      progressText.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")} / ~4:00`;
    }
  }

  /**
   * Mettre à jour la couleur de la barre de progression
   */
  updateProgressBarColor(wordpressId, color) {
    const row = document.querySelector(
      `tr[data-wordpress-id="${wordpressId}"]`
    );
    if (!row) return;

    const progressFill = row.querySelector(".brief-progress-fill");
    if (progressFill) {
      progressFill.className = `brief-progress-fill ${color}`;
    }
  }

  /**
   * Terminer la génération d'un brief
   */
  finishGeneration(wordpressId) {
    const brief = this.generatingBriefs.get(wordpressId);
    if (!brief) return;

    // Arrêter le minuteur
    if (brief.timer) {
      clearInterval(brief.timer);
    }

    // Supprimer du Map
    this.generatingBriefs.delete(wordpressId);

    console.log(`✅ Génération terminée pour: ${brief.pageTitle}`);
  }


  /**
   * Obtenir le HTML pour la barre de progression
   */
  getProgressBarHTML() {
    return `
      <div class="brief-progress-container">
        <div class="brief-progress-bar">
          <div class="brief-progress-fill" style="width: 0%"></div>
        </div>
        <div class="brief-progress-text">0:00 / ~4:00</div>
      </div>
    `;
  }

  /**
   * Vérifier si un brief est en cours de génération
   */
  isGenerating(wordpressId) {
    return this.generatingBriefs.has(wordpressId);
  }
}

/**
 * Gestionnaire des notifications
 */
class NotificationManager {
  /**
   * Afficher une notification de succès (visuelle + console)
   */
  showSuccess(message, details = "") {
    console.log(`✅ ${message}`, details ? `\n${details}` : "");
    
    // Affichage visuel
    this._showVisualNotification(message, 'success');
  }

  /**
   * Afficher une notification d'erreur (visuelle + console)
   */
  showError(message, details = "") {
    console.error(`❌ ${message}`, details ? `\n${details}` : "");
    
    // Affichage visuel avec alert en fallback
    this._showVisualNotification(message, 'error');
  }

  /**
   * Afficher une notification d'information (silencieuse)
   */
  showInfo(message) {
    console.log(`ℹ️ ${message}`);
  }

  /**
   * Demander confirmation
   */
  confirm(message) {
    return confirm(`⚠️ ${message}`);
  }

  /**
   * Afficher une notification visuelle (toast ou alert)
   */
  _showVisualNotification(message, type = 'info') {
    // Vérifier s'il y a déjà un container de notifications
    let container = document.getElementById('notification-container');
    
    if (!container) {
      // Créer le container s'il n'existe pas
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    // Créer la notification
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff';
    
    notification.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;
    
    notification.textContent = message;
    
    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    container.appendChild(notification);

    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);

    // Permettre de fermer en cliquant
    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }
}

// Instances globales des gestionnaires UI
const connectionManager = new ConnectionManager();
const loadingManager = new LoadingManager();
const tableManager = new TableManager();
const filterManager = new FilterManager();
const notificationManager = new NotificationManager();
const briefGenerationManager = new BriefGenerationManager();
