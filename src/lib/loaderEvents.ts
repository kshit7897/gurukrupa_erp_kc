// Simple loader & event dispatcher utility for global UI events
export const loaderEvents = {
  inc: () => {
    if (typeof window !== 'undefined') {
      document.dispatchEvent(new CustomEvent('gurukrupa:loader:inc'));
    }
  },
  dec: () => {
    if (typeof window !== 'undefined') {
      document.dispatchEvent(new CustomEvent('gurukrupa:loader:dec'));
    }
  }
};

export const dataEvents = {
  // notify interested clients that data changed and they should refresh
  dispatch: () => {
    if (typeof window !== 'undefined') {
      document.dispatchEvent(new CustomEvent('gurukrupa:data:updated'));
    }
  }
};
