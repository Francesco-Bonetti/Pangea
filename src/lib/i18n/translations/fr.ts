import type { TranslationKeys } from "./en";

const fr: TranslationKeys = {
  nav: {
    dashboard: "Tableau de bord", laws: "Lois", parties: "Partis", elections: "Élections",
    forum: "Forum", jurisdictions: "Juridictions", about: "À propos", feed: "Actualités",
    messages: "Messages", settings: "Paramètres", delegations: "Délégations",
    adminPanel: "Panneau Admin", newProposal: "Nouvelle Proposition", signIn: "Se connecter",
    logout: "Déconnexion", loggingOut: "Déconnexion...", navigation: "Navigation",
    yourSpace: "Votre Espace", search: "Rechercher lois, propositions, citoyens...",
  },
  dashboard: {
    title: "Tableau de bord", welcome: "Bienvenue", recentProposals: "Propositions Récentes",
    activeLaws: "Lois Actives", yourDelegations: "Vos Délégations",
    platformStats: "Statistiques de la Plateforme", citizens: "Citoyens",
    proposals: "Propositions", laws: "Lois", viewAll: "Voir Tout",
    inDeliberation: "En Délibération", inReview: "En Revue Communautaire",
    drafts: "Brouillons", approved: "Approuvées", rejected: "Rejetées",
  },
  laws: {
    title: "Les Codes Vivants de Pangea",
    description: "Le corpus complet du droit de Pangea — des codes vivants modifiables et abrogeables par le processus démocratique.",
    allLaws: "Toutes les Lois", operativeLaws: "Lois Opératives", codes: "Codes",
    articles: "Articles", active: "Actif", inactive: "Inactif", technical: "Technique",
    simplified: "Simplifié", positions: "Postes", noPositions: "Aucun poste requis pour cette loi.",
    applyForPosition: "Postuler au Poste", electedOfficial: "Élu",
    vacant: "Vacant", viewHistory: "Voir l'Historique",
  },
  proposals: {
    title: "Propositions", newProposal: "Nouvelle Proposition", editProposal: "Modifier Proposition",
    submit: "Soumettre", save: "Sauvegarder le Brouillon", proposalTitle: "Titre",
    summary: "Résumé", content: "Contenu", simplifiedContent: "Explication Simplifiée",
    tags: "Tags", votingDuration: "Durée du Vote", days: "jours",
    customDuration: "Durée Personnalisée", noExpiry: "Sans Expiration",
    lawPosition: "Position dans l'Arbre des Lois", status: "Statut", draft: "Brouillon",
    deliberation: "Délibération", communityReview: "Revue Communautaire", voting: "Vote",
    approved: "Approuvée", rejected: "Rejetée", voteYes: "Voter Oui", voteNo: "Voter Non", abstain: "S'abstenir",
  },
  elections: {
    title: "Élections", newElection: "Nouvelle Élection", candidates: "Candidats",
    applyAsCandidate: "Se Porter Candidat", withdrawCandidacy: "Retirer Candidature",
    votingOpen: "Vote Ouvert", votingClosed: "Vote Fermé", upcoming: "À venir",
    results: "Résultats", winner: "Gagnant", votes: "votes",
  },
  parties: {
    title: "Partis Politiques", createParty: "Créer un Parti", joinParty: "Rejoindre le Parti",
    leaveParty: "Quitter le Parti", members: "Membres", leader: "Dirigeant",
    description: "Description", manifesto: "Manifeste",
  },
  jurisdictions: {
    title: "Juridictions", createJurisdiction: "Créer Juridiction", type: "Type",
    virtual: "Virtuelle", geographic: "Géographique", parentJurisdiction: "Juridiction Mère",
    activeLaws: "Lois Actives", citizens: "Citoyens",
  },
  forum: {
    title: "Forum Communautaire", newDiscussion: "Nouvelle Discussion", newChannel: "Nouveau Canal",
    channels: "Canaux", discussions: "Discussions", replies: "Réponses",
    upvote: "Positif", downvote: "Négatif", report: "Signaler", pinned: "Épinglé",
  },
  messages: {
    title: "Messages", newConversation: "Nouvelle Conversation", typeMessage: "Écrire un message...",
    send: "Envoyer", noMessages: "Aucun message", encrypted: "Les messages sont chiffrés de bout en bout",
    setupKeys: "Configurer les Clés de Chiffrement",
    entityBadge: { jurisdiction: "Juridiction", party: "Parti", citizen: "Citoyen" },
  },
  settings: {
    title: "Paramètres", profile: "Profil", privacy: "Confidentialité", security: "Sécurité",
    notifications: "Notifications", email: "Email", emails: "Adresses Email",
    primaryEmail: "Email Principal", addEmail: "Ajouter Email", removeEmail: "Supprimer",
    makePrimary: "Définir comme Principal", changeEmail: "Changer Email", fullName: "Nom Complet",
    bio: "Biographie", save: "Enregistrer", saved: "Modifications Enregistrées", language: "Langue",
  },
  auth: {
    signIn: "Se Connecter", signUp: "S'inscrire", email: "Adresse Email",
    password: "Mot de Passe", confirmPassword: "Confirmer le Mot de Passe",
    forgotPassword: "Mot de passe oublié ?", noAccount: "Pas de compte ?",
    hasAccount: "Déjà un compte ?", register: "S'inscrire", login: "Se Connecter",
  },
  common: {
    loading: "Chargement...", error: "Une erreur est survenue", save: "Enregistrer", cancel: "Annuler",
    delete: "Supprimer", edit: "Modifier", back: "Retour", backToDashboard: "Retour au Tableau de bord",
    next: "Suivant", previous: "Précédent", submit: "Envoyer", confirm: "Confirmer",
    close: "Fermer", search: "Rechercher", noResults: "Aucun résultat", viewMore: "Voir Plus",
    required: "Obligatoire", optional: "Facultatif", yes: "Oui", no: "Non", or: "ou", and: "et",
    of: "de", all: "Tout", none: "Aucun", createdAt: "Créé", updatedAt: "Mis à jour",
  },
  ai: {
    title: "Assistant IA Pangea", placeholder: "Posez une question sur Pangea...", send: "Envoyer",
    thinking: "Réflexion...",
    welcome: "Bonjour ! Je suis l'Assistant IA de Pangea. Je peux vous aider à comprendre la plateforme, expliquer les lois, vous guider dans les propositions et répondre à vos questions sur les processus démocratiques.",
    suggestions: ["Comment créer une proposition ?", "Expliquer le système de vote", "Que sont les délégations ?", "Comment fonctionnent les juridictions ?"],
    error: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
    disclaimer: "Les réponses de l'IA sont uniquement informatives et ne constituent pas un avis juridique.",
  },
  bugReport: {
    title: "Signaler un Problème", category: "Catégorie", bug: "Bug", suggestion: "Suggestion",
    question: "Question", other: "Autre", description: "Description", submit: "Envoyer le Signalement",
    thanks: "Merci pour votre signalement !",
  },
  guest: {
    banner: "Vous naviguez en tant qu'invité. Connectez-vous pour participer à la démocratie.",
    signIn: "Se Connecter",
  },
};

export default fr;
