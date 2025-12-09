/**
 * PATTERN OBSERVER - Hook React personnalisé
 *
 * Permet aux composants React de s'abonner facilement aux observables
 * et de se mettre à jour automatiquement lors de changements.
 *
 * Intégration parfaite avec le cycle de vie React
 */

'use client';

import { useEffect, useState } from 'react';
import { Observable, Observer } from './Observable';

/**
 * Hook pour s'abonner à un Observable et forcer un re-render
 * quand une notification est reçue
 */
export function useObserver<T>(
  observable: Observable<T>,
  callback?: Observer<T>
): void {
  const [, setUpdateCount] = useState(0);

  useEffect(() => {
    const observer: Observer<T> = (data: T) => {
      // Appeler le callback si fourni
      callback?.(data);

      // Forcer un re-render
      setUpdateCount((count) => count + 1);
    };

    // S'abonner
    const unsubscribe = observable.subscribe(observer);

    // Se désabonner au démontage
    return unsubscribe;
  }, [observable, callback]);
}

/**
 * Hook pour s'abonner à un Observable et obtenir une valeur dérivée
 */
export function useObservableValue<T, R>(
  observable: Observable<T>,
  getValue: () => R
): R {
  const [value, setValue] = useState<R>(() => getValue());

  useEffect(() => {
    const observer: Observer<T> = () => {
      setValue(getValue());
    };

    const unsubscribe = observable.subscribe(observer);

    return unsubscribe;
  }, [observable, getValue]);

  return value;
}
