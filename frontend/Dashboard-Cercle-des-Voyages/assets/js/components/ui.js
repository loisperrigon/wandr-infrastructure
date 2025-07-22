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
    this.loadingState.style.display = "block";
    this.loadingState.innerHTML = `
      <div class="spinner"></div>
      <p>${message}</p>
    `;
    this.pagesTable.style.display = "none";
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
    const briefStatus = this.getBriefStatus(page.id, briefsData);
    const isGenerating = briefGenerationManager.isGenerating(page.id);

    return `
      <tr data-wordpress-id="${page.id}">
        <td>
          <div class="page-info">
            <div class="page-details">
              <div class="page-title-cell">${page.title.rendered}</div>
              <div class="page-url">${this.formatUrl(
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
              briefStatus === "generated" ? "Créé" : "À générer"
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
          <button class="generate-btn generated" disabled>✓ Brief créé</button>
          <div style="display: flex; gap: 4px;">
            <button class="read-brief-btn" onclick="app.readBrief(${page.id}, '${page.title.rendered}')">📖 Lire</button>
            <button class="download-brief-btn" onclick="app.downloadBrief(${page.id}, '${page.title.rendered}')">💾 Télécharger</button>
          </div>
        </div>
      `;
    } else if (isGenerating) {
      return briefGenerationManager.getProgressBarHTML();
    } else {
      return `
        <button class="generate-btn" onclick="app.generateBrief(this, '${
          page.template
        }', '${page.title.rendered}', ${page.id})">
          ${
            briefStatus === "processing"
              ? "⏳ Génération..."
              : "Générer le brief"
          }
        </button>
      `;
    }
  }

  /**
   * Obtenir le statut d'un brief
   */
  getBriefStatus(pageId, briefsData) {
    const brief = briefsData[pageId];
    return brief ? brief.status : "not_generated";
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
    this.indicator = document.getElementById("brief-generation-indicator");
    this.countElement = this.indicator?.querySelector(".generation-count");
    this.textElement = this.indicator?.querySelector(".generation-text");
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

    // Afficher l'indicateur général
    this.showIndicator();

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

    // Mettre à jour l'indicateur général
    this.updateIndicator();

    console.log(`✅ Génération terminée pour: ${brief.pageTitle}`);
  }

  /**
   * Afficher l'indicateur général
   */
  showIndicator() {
    if (this.indicator) {
      this.indicator.style.display = "flex";
      this.updateIndicator();
    }
  }

  /**
   * Masquer l'indicateur général
   */
  hideIndicator() {
    if (this.indicator) {
      this.indicator.style.display = "none";
    }
  }

  /**
   * Mettre à jour l'indicateur général
   */
  updateIndicator() {
    const count = this.generatingBriefs.size;

    if (this.countElement) {
      this.countElement.textContent = `(${count} en cours)`;
    }

    if (this.textElement) {
      this.textElement.textContent =
        count === 1
          ? "🔄 Création d'un brief..."
          : `🔄 Création de ${count} briefs...`;
    }

    // Masquer si aucun brief en cours
    if (count === 0) {
      this.hideIndicator();
    }
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
   * Afficher une notification de succès (silencieuse)
   */
  showSuccess(message, details = "") {
    console.log(`✅ ${message}`, details ? `\n${details}` : "");
  }

  /**
   * Afficher une notification d'erreur (silencieuse)
   */
  showError(message, details = "") {
    console.error(`❌ ${message}`, details ? `\n${details}` : "");
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
}

// Instances globales des gestionnaires UI
const connectionManager = new ConnectionManager();
const loadingManager = new LoadingManager();
const tableManager = new TableManager();
const filterManager = new FilterManager();
const notificationManager = new NotificationManager();
const briefGenerationManager = new BriefGenerationManager();
