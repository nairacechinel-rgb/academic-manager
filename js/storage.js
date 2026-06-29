// Camada de abstração do LocalStorage
// Todos os módulos usam este arquivo, nunca chamam localStorage diretamente.

const Storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error(`[Storage] Erro ao ler "${key}":`, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage] Erro ao salvar "${key}":`, e);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // Retorna array vazio se a chave não existir
  getArray(key) {
    const data = this.get(key);
    return Array.isArray(data) ? data : [];
  },

  // Gera ID único simples
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};
