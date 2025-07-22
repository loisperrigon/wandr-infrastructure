// Configuration de l'application
const CONFIG = {
  // ====== INFORMATIONS DE VERSION ======
  VERSION: "1.0.0",
  BUILD_DATE: "2025-07-18",

  // ====== CONFIGURATION ENVIRONNEMENT ======
  // Changez cette valeur pour basculer entre dev et prod
  ENVIRONMENT: "prod", // "dev" ou "prod"

  // URLs selon l'environnement
  ENVIRONMENTS: {
    dev: {
      WORDPRESS_URL: "https://www.cercledesvoyages.com",
      API_BASE_URL: "http://localhost:3001/api", // Backend local
    },
    prod: {
      WORDPRESS_URL: "https://www.cercledesvoyages.com",
      API_BASE_URL: "https://cercledesvoyages.larefonte.store/api", // Backend production
    },
  },

  // URLs de base (automatiques selon ENVIRONMENT)
  get WORDPRESS_URL() {
    return this.ENVIRONMENTS[this.ENVIRONMENT].WORDPRESS_URL;
  },
  get API_BASE_URL() {
    return this.ENVIRONMENTS[this.ENVIRONMENT].API_BASE_URL;
  },

  // Pagination
  ITEMS_PER_PAGE: 20,

  // Limite de pages par type WordPress (pour améliorer les performances)
  WORDPRESS_PAGES_PER_TYPE: 25,

  // Mapping des types WordPress vers les templates
  TYPE_MAPPING: {
    // Types natifs WordPress
    post: "blog",
    page: "page",

    // Types custom probables
    sejour: "sejour",
    sejours: "sejour",
    voyage: "sejour",
    voyages: "sejour",
    destination: "sejour",
    destinations: "sejour",

    produit: "produit",
    produits: "produit",
    product: "produit",
    products: "produit",

    landing: "landing",
    "landing-page": "landing",
    landingpage: "landing",

    // Autres types possibles
    formation: "landing",
    formations: "landing",
    service: "landing",
    services: "landing",
  },

  // Noms des templates pour l'affichage
  TEMPLATE_NAMES: {
    blog: "Blog",
    sejour: "Séjour",
    produit: "Produit",
    landing: "Landing",
    page: "Page",
    post: "Article",

    // Noms pour types custom potentiels
    voyage: "Voyage",
    voyages: "Voyages",
    destination: "Destination",
    destinations: "Destinations",
    formation: "Formation",
    formations: "Formations",
    service: "Service",
    services: "Services",
  },

  // Types de posts à ignorer
  IGNORED_POST_TYPES: [
    "attachment",
    "revision",
    "nav_menu_item",
    "custom_css",
    "customize_changeset",
    "oembed_cache",
    "user_request",
    "wp_block",
    "wp_template",
    "wp_template_part",
    "wp_global_styles",
    "wp_navigation",
    "global-styles", // Endpoint qui cause l'erreur 404
  ],

  // Messages d'erreur
  ERROR_MESSAGES: {
    CONNECTION_FAILED: "Erreur de connexion à WordPress",
    BRIEF_GENERATION_FAILED: "Erreur lors de la génération du brief",
    BRIEF_NOT_FOUND: "Brief non trouvé",
    INVALID_CREDENTIALS: "Identifiants invalides",
    POPUP_BLOCKED:
      "Impossible d'ouvrir une nouvelle fenêtre. Vérifiez que les pop-ups ne sont pas bloquées.",
  },

  // Configuration des fenêtres pop-up
  POPUP_CONFIG: {
    width: 1200,
    height: 800,
    features: "width=1200,height=800,scrollbars=yes,resizable=yes",
  },

  // Fonction pour afficher les informations d'environnement
  showEnvironmentInfo() {
    console.log(`🌍 Environnement actuel: ${this.ENVIRONMENT.toUpperCase()}`);
    console.log(`📡 API URL: ${this.API_BASE_URL}`);
    console.log(`🔗 WordPress URL: ${this.WORDPRESS_URL}`);
    console.log(`📦 Version: ${this.VERSION} (${this.BUILD_DATE})`);
  },
};

// Export pour utilisation dans d'autres modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
