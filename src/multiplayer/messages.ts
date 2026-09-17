import type { MultiplayerErrorCode } from './types';
export const errorMessage: Record<MultiplayerErrorCode, string> = {
  SESSION_INVALID: 'Cette session ne permet pas de retrouver votre place. Ouvrez le lien dans le navigateur utilisé pour rejoindre la partie.',
  MATCH_NOT_FOUND: 'Cette partie est introuvable. Vérifiez le code ; un redémarrage du serveur de développement efface les parties.',
  LOBBY_FULL: 'Les quatre places sont déjà prises.', NOT_READY: 'Il faut au moins deux joueurs, tous prêts.', HOST_ONLY: 'Seul le créateur peut lancer cette partie.',
  NOT_YOUR_TURN: 'Un autre joueur doit jouer ou résoudre son décompte.', INVALID_PHASE: 'Cette action ne correspond plus à l’étape en cours.',
  INVALID_ACTION: 'Le tour a été refusé : une action n’est pas autorisée. Aucune action n’a été appliquée.',
  INVALID_ACTION_COUNT: 'Préparez vos deux actions avant de valider.', PENDING_DECISION: 'Les choix du décompte doivent être résolus avant les actions.',
  STALE_DRAFT: 'La partie a changé. Votre ancienne préparation a été abandonnée et l’état officiel restauré.',
  DUPLICATE_COMMAND: 'Ce tour a déjà été validé.', INVALID_REQUEST: 'La demande est invalide. Rechargez la page pour retrouver la partie.',
  SERVER_ERROR: 'Le serveur ne peut pas confirmer cette action. Reconnectez-vous avant de réessayer.',
};
