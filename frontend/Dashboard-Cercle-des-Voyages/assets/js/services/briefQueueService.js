/**
 * Service de gestion de la queue pour la génération de briefs
 * Limite à 2 briefs simultanés maximum
 */
class BriefQueueService {
  constructor() {
    this.maxConcurrent = 2;
    this.running = new Map(); // briefs en cours de génération
    this.queue = []; // briefs en attente
    this.completed = new Set(); // briefs terminés
    this.failed = new Set(); // briefs échoués
    
    this.onUpdate = null; // Callback pour mettre à jour l'UI
  }

  /**
   * Ajouter un brief à la queue
   */
  addToQueue(briefRequest) {
    const { pageId, pageTitle, templateType, button } = briefRequest;
    
    // Vérifier si déjà en cours ou en queue
    if (this.running.has(pageId) || this.queue.find(item => item.pageId === pageId)) {
      console.log(`Brief ${pageId} déjà en queue ou en cours`);
      return false;
    }

    const queueItem = {
      pageId,
      pageTitle,
      templateType,
      button,
      addedAt: Date.now(),
      status: 'queued'
    };

    this.queue.push(queueItem);
    console.log(`📝 Brief ${pageId} ajouté à la queue (position ${this.queue.length})`);
    
    // Petite animation de feedback
    if (button) {
      setTimeout(() => {
        button.classList.remove('btn-clicked');
      }, 200);
    }
    
    this.updateUI();
    
    // Traiter immédiatement la queue
    this.processQueue();
    
    return true;
  }

  /**
   * Traiter la queue (démarrer les briefs si possible)
   */
  async processQueue() {
    // Si on a déjà le maximum de briefs en cours, attendre
    if (this.running.size >= this.maxConcurrent) {
      console.log(`⏳ Queue: Maximum de ${this.maxConcurrent} briefs en cours, en attente...`);
      return;
    }

    // Si la queue est vide, rien à faire
    if (this.queue.length === 0) {
      return;
    }

    // Prendre le premier brief de la queue
    const briefItem = this.queue.shift();
    
    // Marquer comme en cours
    this.running.set(briefItem.pageId, {
      ...briefItem,
      status: 'generating',
      startedAt: Date.now()
    });

    console.log(`🚀 Démarrage génération brief ${briefItem.pageId} (${this.running.size}/${this.maxConcurrent})`);
    
    // Mettre à jour l'UI d'abord pour injecter la barre de progression
    this.updateUI();
    
    // Puis démarrer l'animation de la barre de progression
    briefGenerationManager.startGeneration(briefItem.pageId, briefItem.pageTitle);
    
    try {
      // Démarrer la génération
      await this.generateBrief(briefItem);
      
      // Terminer la génération
      briefGenerationManager.finishGeneration(briefItem.pageId);
      
      // Marquer comme terminé
      this.running.delete(briefItem.pageId);
      this.completed.add(briefItem.pageId);
      
      console.log(`✅ Brief ${briefItem.pageId} terminé avec succès`);
      
    } catch (error) {
      console.error(`❌ Erreur génération brief ${briefItem.pageId}:`, error);
      
      // Terminer la génération (même en cas d'erreur)
      briefGenerationManager.finishGeneration(briefItem.pageId);
      
      // Marquer comme échoué
      this.running.delete(briefItem.pageId);
      this.failed.add(briefItem.pageId);
      
      // Afficher l'erreur à l'utilisateur
      notificationManager.showError(`Erreur génération brief`, error.message);
      
      // Restaurer le bouton d'origine
      this.restoreOriginalButton(briefItem);
    }
    
    this.updateUI();
    
    // Traiter le prochain brief s'il y en a
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Générer un brief (logique extraite de app.js)
   */
  async generateBrief(briefItem) {
    const { pageId, pageTitle, templateType, button } = briefItem;
    
    // Récupérer la page depuis allPages
    const page = app.allPages.find((p) => String(p.page_id) === String(pageId));
    
    if (!page) {
      throw new Error(`Page non trouvée dans allPages pour pageId: ${pageId}`);
    }

    // Récupérer l'URL de la page
    let pageUrl = page.link;
    if (!pageUrl) {
      const row = button?.closest("tr");
      if (row) {
        pageUrl = row.getAttribute('data-page-url') || 
                  row.querySelector('.page-url[data-full-url]')?.getAttribute('data-full-url');
      }
    }
    
    if (!pageUrl) {
      throw new Error(`URL de la page introuvable pour pageId: ${pageId}`);
    }

    // Créer le brief via l'API
    const briefData = {
      url: pageUrl,
      page_id: pageId.toString(),
      title: pageTitle,
      rest_base: page?.rest_base || templateType,
      wordpress_type: page?.wordpress_type || templateType,
      slug: page?.slug || '',
      source_type: "wordpress",
      status: "pending",
    };
    
    const result = await apiService.createBrief(briefData);

    if (!result.success) {
      throw new Error(result.error || "Erreur inconnue lors de la création du brief");
    }

    // Mettre à jour le cache local
    app.briefsData[pageId] = result.data.brief;

    // Mettre à jour uniquement la ligne concernée
    app.updateBriefRow(pageId, result.data.brief);
    
    return result;
  }

  /**
   * Restaurer le bouton original en cas d'erreur
   */
  restoreOriginalButton(briefItem) {
    const { pageId, pageTitle, templateType } = briefItem;
    const row = document.querySelector(`tr[data-wordpress-id="${pageId}"]`);
    
    if (row) {
      const actionCell = row.querySelector("td:nth-child(4)");
      if (actionCell) {
        actionCell.innerHTML = `
          <button class="generate-btn" onclick="briefQueue.addToQueue({
            pageId: ${pageId}, 
            pageTitle: '${pageTitle}', 
            templateType: '${templateType}', 
            button: this
          })">
            ⚠️ Réessayer
          </button>
        `;
      }
    }
  }

  /**
   * Obtenir les statistiques de la queue
   */
  getStats() {
    return {
      running: this.running.size,
      queued: this.queue.length,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.running.size + this.queue.length + this.completed.size + this.failed.size
    };
  }

  /**
   * Obtenir l'état d'un brief spécifique
   */
  getBriefState(pageId) {
    // Normaliser pageId en nombre pour la comparaison
    const numPageId = Number(pageId);
    const strPageId = String(pageId);
    
    if (this.running.has(numPageId) || this.running.has(strPageId)) {
      return 'generating';
    }
    if (this.queue.find(item => item.pageId == pageId)) { // Utiliser == pour comparaison souple
      return 'queued';
    }
    if (this.completed.has(numPageId) || this.completed.has(strPageId)) {
      return 'completed';
    }
    if (this.failed.has(numPageId) || this.failed.has(strPageId)) {
      return 'failed';
    }
    return 'idle';
  }

  /**
   * Obtenir la position dans la queue
   */
  getQueuePosition(pageId) {
    const index = this.queue.findIndex(item => item.pageId === pageId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Configurer le callback de mise à jour UI
   */
  setUpdateCallback(callback) {
    this.onUpdate = callback;
  }

  /**
   * Déclencher la mise à jour de l'UI
   */
  updateUI() {
    if (this.onUpdate) {
      this.onUpdate(this.getStats());
    }
    
    // Mettre à jour l'indicateur global
    this.updateGlobalIndicator();
  }

  /**
   * Mettre à jour l'indicateur global de queue
   */
  updateGlobalIndicator() {
    const stats = this.getStats();
    let indicator = document.getElementById('queue-indicator');
    
    if (stats.running === 0 && stats.queued === 0) {
      // Pas de briefs en cours, masquer l'indicateur
      if (indicator) {
        indicator.remove();
      }
      return;
    }

    // Créer ou mettre à jour l'indicateur
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'queue-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 12px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        min-width: 200px;
      `;
      document.body.appendChild(indicator);
    }

    // Contenu de l'indicateur
    let content = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #495057;">
        📝 Génération de briefs
      </div>
    `;

    if (stats.running > 0) {
      content += `
        <div style="margin-bottom: 4px;">
          🔄 En cours: <strong>${stats.running}/${this.maxConcurrent}</strong>
        </div>
      `;
    }

    if (stats.queued > 0) {
      content += `
        <div style="margin-bottom: 4px;">
          ⏳ En attente: <strong>${stats.queued}</strong>
        </div>
      `;
    }

    if (stats.completed > 0) {
      content += `
        <div style="color: #28a745; font-size: 11px;">
          ✅ Terminés: ${stats.completed}
        </div>
      `;
    }

    if (stats.failed > 0) {
      content += `
        <div style="color: #dc3545; font-size: 11px;">
          ❌ Échecs: ${stats.failed}
        </div>
      `;
    }

    indicator.innerHTML = content;
  }

  /**
   * Nettoyer les états terminés/échoués
   */
  cleanup() {
    this.completed.clear();
    this.failed.clear();
    this.updateUI();
  }

  /**
   * Réinitialiser complètement la queue
   */
  reset() {
    this.running.clear();
    this.queue = [];
    this.completed.clear();
    this.failed.clear();
    this.updateUI();
  }
}

// Instance globale
const briefQueue = new BriefQueueService();