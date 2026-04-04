import type { TranslationKeys } from "./en";

const es: TranslationKeys = {
  nav: {
    dashboard: "Panel", laws: "Leyes", parties: "Partidos", elections: "Elecciones",
    forum: "Foro", jurisdictions: "Jurisdicciones", about: "Acerca de", feed: "Noticias",
    messages: "Mensajes", settings: "Configuración", delegations: "Delegaciones",
    adminPanel: "Panel Admin", newProposal: "Nueva Propuesta", signIn: "Iniciar Sesión",
    logout: "Cerrar Sesión", loggingOut: "Cerrando sesión...", navigation: "Navegación",
    yourSpace: "Tu Espacio", search: "Buscar leyes, propuestas, ciudadanos...",
  },
  dashboard: {
    title: "Panel", welcome: "Bienvenido de vuelta", recentProposals: "Propuestas Recientes",
    activeLaws: "Leyes Activas", yourDelegations: "Tus Delegaciones",
    platformStats: "Estadísticas de la Plataforma", citizens: "Ciudadanos",
    proposals: "Propuestas", laws: "Leyes", viewAll: "Ver Todo",
    inDeliberation: "En Deliberación", inReview: "En Revisión Comunitaria",
    drafts: "Borradores", approved: "Aprobadas", rejected: "Rechazadas",
  },
  laws: {
    title: "Los Códigos Vivos de Pangea",
    description: "El cuerpo completo de la ley de Pangea — códigos vivos enmendables y derogables a través del proceso democrático.",
    allLaws: "Todas las Leyes", operativeLaws: "Leyes Operativas", codes: "Códigos",
    articles: "Artículos", active: "Activo", inactive: "Inactivo", technical: "Técnico",
    simplified: "Simplificado", positions: "Posiciones", noPositions: "No se requieren posiciones para esta ley.",
    applyForPosition: "Aplicar para Posición", electedOfficial: "Funcionario Electo",
    vacant: "Vacante", viewHistory: "Ver Historial",
  },
  proposals: {
    title: "Propuestas", newProposal: "Nueva Propuesta", editProposal: "Editar Propuesta",
    submit: "Enviar Propuesta", save: "Guardar Borrador", proposalTitle: "Título",
    summary: "Resumen", content: "Contenido", simplifiedContent: "Explicación Simplificada",
    tags: "Etiquetas", votingDuration: "Duración de Votación", days: "días",
    customDuration: "Duración Personalizada", noExpiry: "Sin Caducidad",
    lawPosition: "Posición en el Árbol de Leyes", status: "Estado", draft: "Borrador",
    deliberation: "Deliberación", communityReview: "Revisión Comunitaria", voting: "Votación",
    approved: "Aprobada", rejected: "Rechazada", voteYes: "Votar Sí", voteNo: "Votar No", abstain: "Abstención",
  },
  elections: {
    title: "Elecciones", newElection: "Nueva Elección", candidates: "Candidatos",
    applyAsCandidate: "Presentarse como Candidato", withdrawCandidacy: "Retirar Candidatura",
    votingOpen: "Votación Abierta", votingClosed: "Votación Cerrada", upcoming: "Próximas",
    results: "Resultados", winner: "Ganador", votes: "votos",
  },
  parties: {
    title: "Partidos Políticos", createParty: "Crear Partido", joinParty: "Unirse al Partido",
    leaveParty: "Dejar Partido", members: "Miembros", leader: "Líder",
    description: "Descripción", manifesto: "Manifiesto",
  },
  jurisdictions: {
    title: "Jurisdicciones", createJurisdiction: "Crear Jurisdicción", type: "Tipo",
    virtual: "Virtual", geographic: "Geográfica", parentJurisdiction: "Jurisdicción Madre",
    activeLaws: "Leyes Activas", citizens: "Ciudadanos",
  },
  forum: {
    title: "Foro de la Comunidad", newDiscussion: "Nueva Discusión", newChannel: "Nuevo Canal",
    channels: "Canales", discussions: "Discusiones", replies: "Respuestas",
    upvote: "Me gusta", downvote: "No me gusta", report: "Reportar", pinned: "Fijado",
  },
  messages: {
    title: "Mensajes", newConversation: "Nueva Conversación", typeMessage: "Escribe un mensaje...",
    send: "Enviar", noMessages: "Sin mensajes aún", encrypted: "Los mensajes están cifrados de extremo a extremo",
    setupKeys: "Configurar Claves de Cifrado",
    entityBadge: { jurisdiction: "Jurisdicción", party: "Partido", citizen: "Ciudadano" },
  },
  settings: {
    title: "Configuración", profile: "Perfil", privacy: "Privacidad", security: "Seguridad",
    notifications: "Notificaciones", email: "Correo", emails: "Direcciones de Correo",
    primaryEmail: "Correo Principal", addEmail: "Añadir Correo", removeEmail: "Eliminar",
    makePrimary: "Hacer Principal", changeEmail: "Cambiar Correo", fullName: "Nombre Completo",
    bio: "Biografía", save: "Guardar Cambios", saved: "Cambios Guardados", language: "Idioma",
  },
  auth: {
    signIn: "Iniciar Sesión", signUp: "Registrarse", email: "Correo Electrónico",
    password: "Contraseña", confirmPassword: "Confirmar Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?", noAccount: "¿No tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?", register: "Registrarse", login: "Iniciar Sesión",
  },
  common: {
    loading: "Cargando...", error: "Ocurrió un error", save: "Guardar", cancel: "Cancelar",
    delete: "Eliminar", edit: "Editar", back: "Volver", backToDashboard: "Volver al Panel",
    next: "Siguiente", previous: "Anterior", submit: "Enviar", confirm: "Confirmar",
    close: "Cerrar", search: "Buscar", noResults: "Sin resultados", viewMore: "Ver Más",
    required: "Obligatorio", optional: "Opcional", yes: "Sí", no: "No", or: "o", and: "y",
    of: "de", all: "Todo", none: "Ninguno", createdAt: "Creado", updatedAt: "Actualizado",
  },
  ai: {
    title: "Asistente IA Pangea", placeholder: "Pregunta algo sobre Pangea...", send: "Enviar",
    thinking: "Pensando...",
    welcome: "¡Hola! Soy el Asistente IA de Pangea. Puedo ayudarte a entender cómo funciona la plataforma, explicar leyes, guiarte en propuestas y responder preguntas sobre procesos democráticos.",
    suggestions: ["¿Cómo creo una propuesta?", "Explica el sistema de votación", "¿Qué son las delegaciones?", "¿Cómo funcionan las jurisdicciones?"],
    error: "Lo siento, no pude procesar tu solicitud. Inténtalo de nuevo.",
    disclaimer: "Las respuestas de la IA son solo informativas y no constituyen asesoría legal.",
  },
  bugReport: {
    title: "Reportar un Problema", category: "Categoría", bug: "Error", suggestion: "Sugerencia",
    question: "Pregunta", other: "Otro", description: "Descripción", submit: "Enviar Reporte",
    thanks: "¡Gracias por tu reporte!",
  },
  guest: {
    banner: "Estás navegando como invitado. Inicia sesión para participar en la democracia.",
    signIn: "Iniciar Sesión",
  },
};

export default es;
