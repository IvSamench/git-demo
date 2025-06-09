export default {
  id: 'rezka',
  name: 'Rezka.ag',

  manifest() {
    return {
      id: 'rezka',
      name: 'Rezka.ag',
      version: '1.0',
      author: 'IvSamench',
      description: 'Минимальный тестовый плагин-заглушка',
      type: 'plugin',
    };
  },

  search(query) {
    // Просто возвращаем пустой список результатов
    return Promise.resolve([]);
  },

  getList(item) {
    // Возвращаем пустой список
    return Promise.resolve([]);
  },

  getLink(item) {
    // Возвращаем пустую ссылку
    return Promise.resolve({ url: '' });
  }
};