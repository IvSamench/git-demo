// Конфигурация HDRezka плагина
(function() {
    'use strict';

    // Экспорт конфигурации
    window.HDRezkaConfig = {
        // Основные настройки
        VERSION: '1.0.0',
        PLUGIN_NAME: 'HDRezka',
        SOURCE_NAME: 'HDRezka.ag',
        
        // URL и пути
        URLS: {
            BASE: 'https://rezka.ag',
            SEARCH: '/search/',
            AJAX_SERIES: '/ajax/get_cdn_series/',
            AJAX_MOVIE: '/ajax/get_movie_info/'
        },

        // Настройки кэширования
        CACHE: {
            SIZE: 100,
            TIME: 1000 * 60 * 60, // 1 час
            ENABLED: true
        },

        // Настройки сети
        NETWORK: {
            TIMEOUT: 15000,
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000,
            USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },

        // HTTP заголовки
        HEADERS: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        },

        // Регулярные выражения для парсинга
        REGEX: {
            SEARCH_ITEMS: /<div class="b-content__inline_item"[^>]*>[\s\S]*?<\/div>/g,
            LINK: /href="([^"]+)"/,
            TITLE: /<div class="b-content__inline_item-link"[^>]*>([^<]+)<\/div>/,
            YEAR: /(\d{4})/,
            POSTER: /data-src="([^"]+)"/,
            TRANSLATIONS: /<select[^>]*id="translators-list"[^>]*>([\s\S]*?)<\/select>/,
            SEASONS: /<select[^>]*id="seasons-list"[^>]*>([\s\S]*?)<\/select>/,
            OPTIONS: /<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/g,
            VIDEO_QUALITY: /\[(\d+p)\]([^,\]]+)/g
        },

        // Качества видео (в порядке приоритета)
        VIDEO_QUALITIES: ['1080p', '720p', '480p', '360p'],

        // Типы контента
        CONTENT_TYPES: {
            MOVIE: 'movie',
            TV: 'tv'
        },

        // Селекторы для поиска
        SELECTORS: {
            SERIAL_INDICATORS: ['сериал', 'сезон', 'серия'],
            MOVIE_INDICATORS: ['фильм', 'кино']
        },

        // Настройки отладки
        DEBUG: {
            ENABLED: false,
            LOG_REQUESTS: false,
            LOG_PARSING: false,
            LOG_CACHE: false
        },

        // Локализация
        LOCALIZATION: {
            ru: {
                PLUGIN_TITLE: 'HDRezka',
                SEARCH_PLACEHOLDER: 'Поиск на HDRezka...',
                NO_RESULTS: 'Контент не найден',
                LOADING: 'Загрузка...',
                ERROR_SEARCH: 'Ошибка поиска',
                ERROR_MOVIE_INFO: 'Ошибка загрузки информации о фильме',
                ERROR_VIDEO_LINKS: 'Ошибка получения видео ссылок',
                SELECT_TRANSLATION: 'Выберите перевод',
                SELECT_SEASON: 'Выберите сезон',
                NO_TRANSLATIONS: 'Переводы не найдены',
                NO_VIDEO_LINKS: 'Видео ссылки не найдены'
            },
            en: {
                PLUGIN_TITLE: 'HDRezka',
                SEARCH_PLACEHOLDER: 'Search on HDRezka...',
                NO_RESULTS: 'Content not found',
                LOADING: 'Loading...',
                ERROR_SEARCH: 'Search error',
                ERROR_MOVIE_INFO: 'Error loading movie information',
                ERROR_VIDEO_LINKS: 'Error getting video links',
                SELECT_TRANSLATION: 'Select translation',
                SELECT_SEASON: 'Select season',
                NO_TRANSLATIONS: 'Translations not found',
                NO_VIDEO_LINKS: 'Video links not found'
            }
        },

        // Функции-утилиты
        UTILS: {
            // Получение текста для текущего языка
            getText: function(key, lang) {
                lang = lang || 'ru';
                return this.LOCALIZATION[lang] && this.LOCALIZATION[lang][key] || key;
            },

            // Проверка типа контента
            isSerial: function(html) {
                var text = html.toLowerCase();
                return this.SELECTORS.SERIAL_INDICATORS.some(function(indicator) {
                    return text.includes(indicator);
                });
            },

            // Очистка URL
            cleanUrl: function(url) {
                if (!url) return '';
                if (url.startsWith('http')) return url;
                return this.URLS.BASE + url;
            },

            // Логирование с проверкой режима отладки
            log: function(message, type) {
                if (this.DEBUG.ENABLED) {
                    type = type || 'log';
                    console[type]('[HDRezka Plugin]', message);
                }
            },

            // Задержка
            delay: function(ms) {
                return new Promise(function(resolve) {
                    setTimeout(resolve, ms);
                });
            },

            // Повторная попытка с задержкой
            retry: function(fn, times, delay) {
                var self = this;
                return new Promise(function(resolve, reject) {
                    function attempt(n) {
                        fn().then(resolve).catch(function(error) {
                            if (n > 0) {
                                setTimeout(function() {
                                    attempt(n - 1);
                                }, delay);
                            } else {
                                reject(error);
                            }
                        });
                    }
                    attempt(times);
                });
            }
        }
    };

    // Расширяем конфигурацию методами Utils
    Object.assign(window.HDRezkaConfig, window.HDRezkaConfig.UTILS);

})();
