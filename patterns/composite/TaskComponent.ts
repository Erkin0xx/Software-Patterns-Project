/**
 * PATTERN COMPOSITE - Interface Component
 *
 * Cette interface définit le contrat commun pour tous les éléments
 * de la hiérarchie de tâches (feuilles et composites).
 *
 * Permet de traiter uniformément les tâches simples et les groupes de tâches.
 */

export interface TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children?: TaskComponent[];

  /**
   * Compte récursivement le nombre total de tâches
   * (incluant la tâche courante et tous ses enfants)
   */
  getTaskCount(): number;

  /**
   * Compte récursivement le nombre de tâches complétées
   */
  getCompletedCount(): number;

  /**
   * Vérifie si cette tâche (et tous ses enfants) sont complétés
   */
  isComplete(): boolean;

  /**
   * Convertit la tâche en objet JSON sérialisable
   */
  toJSON(): any;
}
