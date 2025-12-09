/**
 * PATTERN COMMAND - Interface Command
 *
 * Encapsule une action et toutes les informations nécessaires
 * pour l'exécuter et l'annuler.
 *
 * Principe : Séparer l'invocation d'une action de son exécution
 */

export interface Command {

  execute(): void;

  undo(): void;

  description: string;

  timestamp: Date;
}
