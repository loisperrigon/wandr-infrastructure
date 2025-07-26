/**
 * Utilitaires et fonctions d'aide
 */

/**
 * Mapper les types de posts WordPress vers nos templates
 */
function mapPostTypeToTemplate(wordpressType) {
  return CONFIG.TYPE_MAPPING[wordpressType] || wordpressType;
}

/**
 * Obtenir le nom d'affichage d'un template
 */
function getTemplateName(template) {
  return CONFIG.TEMPLATE_NAMES[template] || capitalize(template);
}

/**
 * Calculer le temps écoulé depuis une date
 */
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "il y a 1m";
  if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400)
    return `il y a ${Math.floor(diffInSeconds / 3600)}h`;
  return `il y a ${Math.floor(diffInSeconds / 86400)}j`;
}

/**
 * Décoder le Base64 en UTF-8 correctement
 */
function decodeBase64ToUTF8(base64String) {
  try {
    // Décoder le Base64 en binaire
    const binaryString = atob(base64String);

    // Convertir chaque caractère en octets
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Décoder les octets en UTF-8
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch (error) {
    console.error("Erreur lors du décodage Base64 UTF-8:", error);
    // Fallback vers atob() standard
    return atob(base64String);
  }
}

/**
 * Nettoyer un titre pour créer un nom de fichier valide
 */
function sanitizeFileName(title) {
  return title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
}

/**
 * Créer un blob et déclencher le téléchargement
 */
function downloadFile(content, filename, mimeType = "text/html;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;

  // Ajouter temporairement le lien au DOM et le cliquer
  document.body.appendChild(link);
  link.click();

  // Nettoyer
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Ouvrir une nouvelle fenêtre avec du contenu HTML
 */
function openHtmlWindow(htmlContent, title = "Brief") {
  const newWindow = window.open("", "_blank", CONFIG.POPUP_CONFIG.features);

  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.focus();
    return true;
  } else {
    if (window.notificationManager) {
      window.notificationManager.showError(CONFIG.ERROR_MESSAGES.POPUP_BLOCKED);
    } else {
      alert(CONFIG.ERROR_MESSAGES.POPUP_BLOCKED);
    }
    return false;
  }
}

/**
 * Debounce une fonction (utile pour les champs de recherche)
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Vérifier si un type de post doit être ignoré
 */
function shouldIgnorePostType(postType) {
  return CONFIG.IGNORED_POST_TYPES.includes(postType);
}

/**
 * Vérifier si un endpoint REST est valide (sans patterns regex)
 */
function isValidRestEndpoint(endpoint) {
  // Ignorer les endpoints avec des patterns regex WordPress
  const invalidPatterns = ["(?P<", "[d]+", "[w-]+", "(?:", "\\d+", "\\w+"];

  return !invalidPatterns.some((pattern) => endpoint.includes(pattern));
}

/**
 * Formater un nombre avec des séparateurs de milliers
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Capitaliser la première lettre d'une chaîne
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Tronquer un texte à une longueur donnée
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Utilitaires URL consolidés
 */
const UrlUtils = {
  /**
   * Valider une URL
   */
  isValid(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Extraire le domaine d'une URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return url;
    }
  },

  /**
   * Normaliser une URL (ajouter https si nécessaire)
   */
  normalize(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }
};

// Garder les fonctions pour la compatibilité
function isValidUrl(string) { return UrlUtils.isValid(string); }
function extractDomain(url) { return UrlUtils.extractDomain(url); }
