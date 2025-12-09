export type Observer<T = any> = (data: T) => void;

export class Observable<T = any> {
  private observers: Observer<T>[] = [];

  subscribe(observer: Observer<T>): () => void {
    this.observers.push(observer);
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  protected notify(data: T): void {
    this.observers.forEach((observer) => {
      try {
        observer(data);
      } catch (error) {
        console.error('Error in observer:', error);
      }
    });
  }

  getObserverCount(): number {
    return this.observers.length;
  }

  clearObservers(): void {
    this.observers = [];
  }
}
