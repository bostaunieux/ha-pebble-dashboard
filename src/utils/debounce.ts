function debounce<T extends unknown[], U>(
    callback: (...args: T) => PromiseLike<U> | U,
    wait: number
  ) {
    let timer: number;
  
    return (...args: T): Promise<U> => {
      clearTimeout(timer);
      return new Promise((resolve) => {
        timer = window.setTimeout(() => resolve(callback(...args)), wait);
      });
    };
  }

export default debounce;