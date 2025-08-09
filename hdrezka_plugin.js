(function () {
    'use strict';

    // Основные константы плагина
    var SOURCE_NAME = 'HDRezka';
    var SOURCE_TITLE = 'HDRezka.ag';
    var CACHE_SIZE = 100;
    var CACHE_TIME = 1000 * 60 * 60; // 1 час

    // Основной класс для работы с HDRezka
    function HDRezkaParser(component, object) {
        var network = new Lampa.Reguest();
        var extract = {};
        var select_title = '';
        var cache = {};
        
        // Настройки
        var prefer_http = Lampa.Storage.field('hdrezka_prefer_http') === true;
        var host = 'https://rezka.ag';
        var search_url = host + '/search/';
        
        // Заголовки для запросов
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        // Кэширование
        function getCache(key) {
            var res = cache[key];
            if (res) {
                var cache_timestamp = new Date().getTime() - CACHE_TIME;
                if (res.timestamp > cache_timestamp) {
                    return res.value;
                }
            }
            return null;
        }

        function setCache(key, value) {
            var timestamp = new Date().getTime();
            cache[key] = {
                timestamp: timestamp,
                value: value
            };
        }

        // Поиск контента на HDRezka
        function search(query, callback, error) {
            var cache_key = 'search_' + query;
            var cached = getCache(cache_key);
            
            if (cached) {
                callback(cached);
                return;
            }

            var search_params = '?do=search&subaction=search&q=' + encodeURIComponent(query);
            var url = search_url + search_params;

            network.clear();
            network.timeout(15000);
            network.native(url, function(html) {
                try {
                    var results = parseSearchResults(html);
                    
                    // Если результатов мало, пробуем альтернативный поиск
                    if (results.length === 0) {
                        searchAlternative(query, callback, error);
                        return;
                    }
                    
                    setCache(cache_key, results);
                    callback(results);
                } catch (e) {
                    console.error('HDRezka search parse error:', e);
                    searchAlternative(query, callback, error);
                }
            }, function(a, c) {
                console.error('HDRezka search network error:', a, c);
                error && error(a);
            }, false, {
                headers: headers,
                dataType: 'text'
            });
        }

        // Альтернативный поиск
        function searchAlternative(query, callback, error) {
            // Пробуем поиск по разным категориям
            var categories = ['films', 'series', 'cartoons', 'animation'];
            var results = [];
            var completed = 0;

            categories.forEach(function(category) {
                var categoryUrl = host + '/' + category + '/?q=' + encodeURIComponent(query);
                
                network.native(categoryUrl, function(html) {
                    try {
                        var categoryResults = parseSearchResults(html);
                        results = results.concat(categoryResults);
                    } catch (e) {
                        console.error('Category search error:', e);
                    }
                    
                    completed++;
                    if (completed === categories.length) {
                        // Удаляем дубликаты
                        var uniqueResults = removeDuplicates(results);
                        callback(uniqueResults);
                    }
                }, function(a, c) {
                    completed++;
                    if (completed === categories.length) {
                        if (results.length > 0) {
                            var uniqueResults = removeDuplicates(results);
                            callback(uniqueResults);
                        } else {
                            error && error(a);
                        }
                    }
                }, false, {
                    headers: headers,
                    dataType: 'text'
                });
            });
        }

        // Удаление дубликатов из результатов поиска
        function removeDuplicates(results) {
            var seen = {};
            return results.filter(function(item) {
                var key = item.title + '_' + item.year;
                if (seen[key]) {
                    return false;
                }
                seen[key] = true;
                return true;
            });
        }

        // Парсинг результатов поиска
        function parseSearchResults(html) {
            var results = [];
            
            // Пробуем разные селекторы для поиска результатов
            var searchPatterns = [
                /<div class="b-content__inline_item"[^>]*>[\s\S]*?<\/div>/g,
                /<div class="b-content__collections_item"[^>]*>[\s\S]*?<\/div>/g,
                /<article class="b-content__inline_item"[^>]*>[\s\S]*?<\/article>/g
            ];

            searchPatterns.forEach(function(pattern) {
                var matches = html.match(pattern);
                if (matches && matches.length > 0) {
                    matches.forEach(function(match) {
                        var item = parseSearchItem(match);
                        if (item) {
                            results.push(item);
                        }
                    });
                }
            });

            // Если основные селекторы не сработали, пробуем упрощенный поиск
            if (results.length === 0) {
                results = parseSearchResultsSimple(html);
            }

            return results;
        }

        // Упрощенный парсинг результатов
        function parseSearchResultsSimple(html) {
            var results = [];
            
            // Ищем все ссылки на фильмы/сериалы
            var linkPattern = /href="([^"]*\/(?:films|series|cartoons|animation)\/[^"]+)"/g;
            var titlePattern = />([^<]+)</g;
            var links = [];
            var match;

            while ((match = linkPattern.exec(html)) !== null) {
                var link = match[1];
                if (!link.startsWith('http')) {
                    link = host + link;
                }
                links.push(link);
            }

            // Для каждой найденной ссылки пытаемся извлечь информацию
            links.forEach(function(link) {
                var titleMatch = link.match(/\/([^\/]+)\.html$/);
                if (titleMatch) {
                    var filename = titleMatch[1];
                    var parts = filename.split('-');
                    
                    if (parts.length >= 2) {
                        var title = parts.slice(1).join(' ').replace(/[_-]/g, ' ');
                        var year = '';
                        var yearMatch = title.match(/(\d{4})/);
                        if (yearMatch) {
                            year = yearMatch[1];
                        }

                        var type = 'movie';
                        if (link.includes('/series/') || link.includes('сериал')) {
                            type = 'tv';
                        }

                        results.push({
                            title: title,
                            original_title: title,
                            type: type,
                            year: year,
                            poster: '',
                            hdrezka_link: link,
                            source: SOURCE_NAME
                        });
                    }
                }
            });

            // Удаляем дубликаты
            return removeDuplicates(results);
        }

        // Парсинг отдельного элемента поиска
        function parseSearchItem(html) {
            try {
                // Пробуем разные селекторы для ссылки
                var linkPatterns = [
                    /href="([^"]+)"/,
                    /data-url="([^"]+)"/,
                    /onclick="[^"]*url='([^']+)'/
                ];
                
                var link = '';
                linkPatterns.forEach(function(pattern) {
                    if (!link) {
                        var linkMatch = html.match(pattern);
                        if (linkMatch) {
                            link = linkMatch[1];
                        }
                    }
                });

                if (!link) return null;
                
                if (!link.startsWith('http')) {
                    link = host + link;
                }

                // Пробуем разные селекторы для названия
                var titlePatterns = [
                    /<div class="b-content__inline_item-link"[^>]*>([^<]+)<\/div>/,
                    /<h3[^>]*>([^<]+)<\/h3>/,
                    /<a[^>]*title="([^"]+)"/,
                    /title="([^"]+)"/,
                    /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/
                ];

                var title = '';
                titlePatterns.forEach(function(pattern) {
                    if (!title) {
                        var titleMatch = html.match(pattern);
                        if (titleMatch) {
                            title = titleMatch[1].trim();
                        }
                    }
                });

                if (!title) {
                    // Пытаемся извлечь название из URL
                    var urlTitleMatch = link.match(/\/([^\/]+)\.html$/);
                    if (urlTitleMatch) {
                        title = urlTitleMatch[1].split('-').slice(1).join(' ').replace(/[_-]/g, ' ');
                    }
                }

                // Извлечение года
                var yearPatterns = [
                    /(\d{4})/,
                    /year["\s]*[=:]["\s]*(\d{4})/i,
                    /data-year="(\d{4})"/
                ];

                var year = '';
                yearPatterns.forEach(function(pattern) {
                    if (!year) {
                        var yearMatch = html.match(pattern);
                        if (yearMatch) {
                            year = yearMatch[1];
                        }
                    }
                });

                // Определение типа контента
                var isSerial = html.toLowerCase().includes('сериал') || 
                              html.toLowerCase().includes('сезон') ||
                              link.includes('/series/') ||
                              html.toLowerCase().includes('серии');
                var type = isSerial ? 'tv' : 'movie';

                // Извлечение постера
                var posterPatterns = [
                    /data-src="([^"]+)"/,
                    /src="([^"]+)"/,
                    /poster="([^"]+)"/,
                    /background-image:\s*url\(['"]([^'"]+)['"]\)/
                ];

                var poster = '';
                posterPatterns.forEach(function(pattern) {
                    if (!poster) {
                        var posterMatch = html.match(pattern);
                        if (posterMatch) {
                            var posterUrl = posterMatch[1];
                            if (posterUrl && (posterUrl.includes('.jpg') || posterUrl.includes('.png') || posterUrl.includes('.webp'))) {
                                poster = posterUrl.startsWith('http') ? posterUrl : host + posterUrl;
                            }
                        }
                    }
                });

                // Валидация данных
                if (!title || title.length < 2) {
                    return null;
                }

                return {
                    title: title,
                    original_title: title,
                    type: type,
                    year: year,
                    poster: poster,
                    hdrezka_link: link,
                    source: SOURCE_NAME
                };
            } catch (e) {
                console.error('Parse search item error:', e);
                return null;
            }
        }

        // Получение информации о фильме/сериале
        function getMovieInfo(hdrezka_link, callback, error) {
            var cache_key = 'movie_' + hdrezka_link;
            var cached = getCache(cache_key);
            
            if (cached) {
                callback(cached);
                return;
            }

            network.clear();
            network.timeout(15000);
            network.native(hdrezka_link, function(html) {
                try {
                    var movieInfo = parseMoviePage(html, hdrezka_link);
                    setCache(cache_key, movieInfo);
                    callback(movieInfo);
                } catch (e) {
                    console.error('HDRezka movie parse error:', e);
                    error && error(e);
                }
            }, function(a, c) {
                console.error('HDRezka movie network error:', a, c);
                error && error(a);
            }, false, {
                headers: headers,
                dataType: 'text'
            });
        }

        // Парсинг страницы фильма/сериала
        function parseMoviePage(html, url) {
            var movieInfo = {
                seasons: [],
                translations: [],
                hdrezka_link: url
            };

            // Извлечение переводов
            var translationsMatch = html.match(/<select[^>]*id="translators-list"[^>]*>([\s\S]*?)<\/select>/);
            if (translationsMatch) {
                var translationsHtml = translationsMatch[1];
                var optionMatches = translationsHtml.match(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/g);
                
                if (optionMatches) {
                    optionMatches.forEach(function(option) {
                        var match = option.match(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/);
                        if (match) {
                            movieInfo.translations.push({
                                id: match[1],
                                name: match[2].trim()
                            });
                        }
                    });
                }
            }

            // Извлечение сезонов (для сериалов)
            var seasonsMatch = html.match(/<select[^>]*id="seasons-list"[^>]*>([\s\S]*?)<\/select>/);
            if (seasonsMatch) {
                var seasonsHtml = seasonsMatch[1];
                var seasonMatches = seasonsHtml.match(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/g);
                
                if (seasonMatches) {
                    seasonMatches.forEach(function(season) {
                        var match = season.match(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/);
                        if (match) {
                            movieInfo.seasons.push({
                                id: match[1],
                                name: match[2].trim()
                            });
                        }
                    });
                }
            }

            return movieInfo;
        }

        // Получение ссылок на видео
        function getVideoLinks(hdrezka_link, translatorId, seasonId, episodeId, callback, error) {
            var cache_key = 'video_' + translatorId + '_' + seasonId + '_' + episodeId;
            var cached = getCache(cache_key);
            
            if (cached) {
                callback(cached);
                return;
            }

            // Извлекаем ID фильма из ссылки
            var movieIdMatch = hdrezka_link.match(/\/(\d+)-/);
            if (!movieIdMatch) {
                error && error(new Error('Не удалось извлечь ID фильма'));
                return;
            }
            var movieId = movieIdMatch[1];

            // Определяем тип контента и соответствующий endpoint
            var isSerial = seasonId && episodeId;
            var ajaxUrl = host + (isSerial ? '/ajax/get_cdn_series/' : '/ajax/get_cdn_movie/');
            
            // Формируем данные запроса
            var postData = 'id=' + movieId + '&translator_id=' + translatorId;
            if (isSerial) {
                postData += '&season=' + (seasonId || '1') + '&episode=' + (episodeId || '1');
            }

            network.clear();
            network.timeout(15000);
            
            // Добавляем referrer для обхода защиты
            var requestHeaders = Object.assign({}, headers, {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': hdrezka_link,
                'Origin': host
            });

            network.native(ajaxUrl, function(response) {
                try {
                    var videoData = parseVideoResponse(response);
                    if (videoData.links && videoData.links.length > 0) {
                        setCache(cache_key, videoData);
                        callback(videoData);
                    } else {
                        // Пробуем альтернативный метод получения ссылок
                        getVideoLinksAlternative(hdrezka_link, translatorId, seasonId, episodeId, callback, error);
                    }
                } catch (e) {
                    console.error('HDRezka video parse error:', e);
                    // Пробуем альтернативный метод
                    getVideoLinksAlternative(hdrezka_link, translatorId, seasonId, episodeId, callback, error);
                }
            }, function(a, c) {
                console.error('HDRezka video network error:', a, c);
                error && error(a);
            }, postData, {
                headers: requestHeaders
            });
        }

        // Альтернативный метод получения видео ссылок
        function getVideoLinksAlternative(hdrezka_link, translatorId, seasonId, episodeId, callback, error) {
            // Загружаем страницу фильма и ищем встроенные данные
            network.clear();
            network.timeout(15000);
            
            network.native(hdrezka_link, function(html) {
                try {
                    var videoData = extractVideoFromPage(html, translatorId, seasonId, episodeId);
                    if (videoData.links && videoData.links.length > 0) {
                        callback(videoData);
                    } else {
                        error && error(new Error('Видео ссылки не найдены'));
                    }
                } catch (e) {
                    console.error('Alternative video extraction error:', e);
                    error && error(e);
                }
            }, function(a, c) {
                console.error('Alternative video extraction network error:', a, c);
                error && error(a);
            }, false, {
                headers: headers
            });
        }

        // Извлечение видео данных со страницы
        function extractVideoFromPage(html, translatorId, seasonId, episodeId) {
            var videoLinks = [];
            
            // Ищем JSON данные в скриптах страницы
            var scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
            
            if (scriptMatches) {
                scriptMatches.forEach(function(script) {
                    // Ищем переменные с видео данными
                    var videoDataMatch = script.match(/sof\.tv\.initCDNMoviesEvents\([^,]+,\s*([^,]+),/);
                    if (videoDataMatch) {
                        try {
                            var videoJson = videoDataMatch[1].replace(/'/g, '"');
                            var videoObj = JSON.parse(videoJson);
                            
                            if (videoObj && videoObj.url) {
                                videoLinks = parseVideoUrl(videoObj.url);
                            }
                        } catch (e) {
                            console.log('Failed to parse video JSON:', e);
                        }
                    }
                });
            }

            return {
                links: videoLinks,
                subtitles: null
            };
        }

        // Парсинг URL с качествами
        function parseVideoUrl(url) {
            var links = [];
            
            // Декодируем URL если он закодирован
            try {
                url = decodeURIComponent(url);
            } catch (e) {
                // URL уже декодирован
            }

            // Парсим качества в формате [720p]url,[480p]url2
            var qualityPattern = /\[(\d+p)\]([^,\[\]]+)/g;
            var match;

            while ((match = qualityPattern.exec(url)) !== null) {
                var quality = match[1];
                var videoUrl = match[2].trim();
                
                // Очищаем URL от лишних символов
                videoUrl = videoUrl.replace(/^,+|,+$/g, '');
                
                if (videoUrl && videoUrl.startsWith('http')) {
                    links.push({
                        quality: quality,
                        url: videoUrl
                    });
                }
            }

            // Сортируем по качеству (лучшее первым)
            links.sort(function(a, b) {
                var qualityA = parseInt(a.quality);
                var qualityB = parseInt(b.quality);
                return qualityB - qualityA;
            });

            return links;
        }

        // Парсинг ответа с видео ссылками
        function parseVideoResponse(response) {
            try {
                var data;
                
                // Пробуем парсить как JSON
                if (typeof response === 'string') {
                    data = JSON.parse(response);
                } else {
                    data = response;
                }

                var videoLinks = [];

                if (data.url) {
                    videoLinks = parseVideoUrl(data.url);
                } else if (data.streams) {
                    // Альтернативная структура ответа
                    Object.keys(data.streams).forEach(function(quality) {
                        if (data.streams[quality]) {
                            videoLinks.push({
                                quality: quality,
                                url: data.streams[quality]
                            });
                        }
                    });
                } else if (data.success && data.url) {
                    // Еще один вариант структуры
                    videoLinks = parseVideoUrl(data.url);
                }

                return {
                    links: videoLinks,
                    subtitles: data.subtitle || data.subtitles || null
                };
            } catch (e) {
                console.error('Parse video response error:', e);
                
                // Пробуем извлечь ссылки из сырого текста
                if (typeof response === 'string') {
                    var links = parseVideoUrl(response);
                    return {
                        links: links,
                        subtitles: null
                    };
                }
                
                return { links: [], subtitles: null };
            }
        }

        // Публичные методы
        return {
            search: search,
            getMovieInfo: getMovieInfo,
            getVideoLinks: getVideoLinks,
            clear: function() {
                network.clear();
                cache = {};
            }
        };
    }

    // Главная функция компонента для Lampa
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var files = new Lampa.Explorer(object);
        var parser = new HDRezkaParser(this, object);
        var items = [];
        var last = false;

        // Инициализация
        this.create = function() {
            var _this = this;

            this.activity.loader(true);

            // Настройка интерфейса
            scroll.body().addClass('torrent-list');
            files.appendHead(scroll.render());
            
            this.search();
            return this.render();
        };

        // Поиск контента
        this.search = function() {
            var _this = this;
            var query = object.search || object.movie.title || object.movie.original_title;

            this.activity.loader(true);

            parser.search(query, function(results) {
                _this.activity.loader(false);
                
                if (results && results.length > 0) {
                    _this.buildList(results);
                } else {
                    _this.empty();
                }
            }, function(error) {
                _this.activity.loader(false);
                _this.empty();
            });
        };

        // Построение списка результатов
        this.buildList = function(results) {
            var _this = this;
            
            items = results;
            scroll.reset();

            results.forEach(function(item, index) {
                var element = _this.createListItem(item, index);
                scroll.append(element);
            });

            if (results.length === 0) {
                this.empty();
            } else {
                scroll.update();
            }
        };

        // Создание элемента списка
        this.createListItem = function(item, index) {
            var _this = this;
            
            var element = $('<div class="selector online" data-index="' + index + '">');
            element.append('<div class="online__body">');
            element.find('.online__body').append('<div class="online__title">' + item.title + '</div>');
            element.find('.online__body').append('<div class="online__quality">' + item.year + ' • ' + item.type + '</div>');

            element.on('hover:enter', function() {
                _this.selectItem(item);
            });

            element.on('hover:focus', function(e) {
                last = e.target;
                scroll.update($(e.target), true);
            });

            return element;
        };

        // Выбор элемента
        this.selectItem = function(item) {
            var _this = this;

            this.activity.loader(true);

            parser.getMovieInfo(item.hdrezka_link, function(movieInfo) {
                _this.activity.loader(false);
                _this.showMovieOptions(item, movieInfo);
            }, function(error) {
                _this.activity.loader(false);
                Lampa.Noty.show('Ошибка загрузки информации о фильме');
            });
        };

        // Показ опций фильма (переводы, сезоны)
        this.showMovieOptions = function(item, movieInfo) {
            var _this = this;

            if (movieInfo.translations.length === 0) {
                Lampa.Noty.show('Переводы не найдены');
                return;
            }

            // Если только один перевод, сразу переходим к воспроизведению
            if (movieInfo.translations.length === 1 && movieInfo.seasons.length <= 1) {
                this.playVideo(item, movieInfo, movieInfo.translations[0], movieInfo.seasons[0]);
                return;
            }

            // Показываем меню выбора
            this.showSelectionMenu(item, movieInfo);
        };

        // Меню выбора перевода/сезона
        this.showSelectionMenu = function(item, movieInfo) {
            var _this = this;
            var items = [];

            // Добавляем переводы
            movieInfo.translations.forEach(function(translation) {
                if (item.type === 'tv' && movieInfo.seasons.length > 0) {
                    // Для сериалов добавляем сезоны
                    movieInfo.seasons.forEach(function(season) {
                        items.push({
                            title: translation.name + ' • ' + season.name,
                            translation: translation,
                            season: season
                        });
                    });
                } else {
                    // Для фильмов только перевод
                    items.push({
                        title: translation.name,
                        translation: translation,
                        season: null
                    });
                }
            });

            Lampa.Select.show({
                title: 'Выберите перевод' + (item.type === 'tv' ? ' и сезон' : ''),
                items: items,
                onSelect: function(selected) {
                    _this.playVideo(item, movieInfo, selected.translation, selected.season);
                },
                onBack: function() {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        // Воспроизведение видео
        this.playVideo = function(item, movieInfo, translation, season) {
            var _this = this;

            this.activity.loader(true);

            var episodeId = season ? '1' : null; // Начинаем с первой серии

            parser.getVideoLinks(
                movieInfo.hdrezka_link,
                translation.id,
                season ? season.id : null,
                episodeId,
                function(videoData) {
                    _this.activity.loader(false);
                    
                    if (videoData.links && videoData.links.length > 0) {
                        _this.startPlayer(item, videoData);
                    } else {
                        Lampa.Noty.show('Видео ссылки не найдены');
                    }
                },
                function(error) {
                    _this.activity.loader(false);
                    Lampa.Noty.show('Ошибка получения видео ссылок');
                }
            );
        };

        // Запуск плеера
        this.startPlayer = function(item, videoData) {
            // Выбираем лучшее качество
            var bestQuality = videoData.links[0];
            
            var playerData = {
                url: bestQuality.url,
                title: item.title,
                quality: this.buildQualityMap(videoData.links),
                subtitles: videoData.subtitles
            };

            Lampa.Player.play(playerData);
        };

        // Построение карты качества
        this.buildQualityMap = function(links) {
            var qualityMap = {};
            
            links.forEach(function(link) {
                qualityMap[link.quality] = link.url;
            });

            return qualityMap;
        };

        // Пустой результат
        this.empty = function() {
            var empty = $('<div class="online-empty"><div class="online-empty__text">Контент не найден</div></div>');
            scroll.append(empty);
            scroll.update();
        };

        // Контроллеры
        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function() {
                    Navigator.move('up');
                },
                down: function() {
                    Navigator.move('down');
                },
                back: this.back
            });

            Lampa.Controller.toggle('content');
        };

        this.render = function() {
            return files.render();
        };

        this.back = function() {
            Lampa.Activity.backward();
        };

        this.pause = function() {};
        this.stop = function() {};
        this.destroy = function() {
            network.clear();
            parser.clear();
        };
    }

    // Регистрация плагина в Lampa
    function startPlugin() {
        // Добавляем компонент
        Lampa.Component.add('hdrezka', component);

        // Создаем манифест плагина
        var manifest = {
            type: 'video',
            version: '1.0.0',
            name: SOURCE_TITLE,
            description: 'Плагин для просмотра контента с HDRezka.ag',
            component: 'hdrezka',
            onContextMenu: function(object) {
                return {
                    name: 'Смотреть на HDRezka',
                    description: ''
                };
            },
            onContextLauch: function(object) {
                Lampa.Activity.push({
                    url: '',
                    title: 'HDRezka • ' + (object.title || object.original_title),
                    component: 'hdrezka',
                    search: object.title || object.original_title,
                    movie: object,
                    page: 1
                });
            }
        };

        // Регистрируем манифест
        Lampa.Manifest.plugins = manifest;

        // Добавляем кнопку в интерфейс
        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                var button = $('<div class="full-start__button selector" data-subtitle="' + SOURCE_TITLE + '"><svg><use xlink:href="#play"></use></svg><span>HDRezka</span></div>');
                
                button.on('hover:enter', function() {
                    manifest.onContextLauch(e.data.movie);
                });

                e.object.activity.render().find('.full-start__buttons').append(button);
            }
        });

        console.log('HDRezka plugin loaded successfully');
    }

    // Запускаем плагин
    if (window.Lampa) {
        startPlugin();
    } else {
        // Ждем загрузки Lampa
        document.addEventListener('DOMContentLoaded', function() {
            if (window.Lampa) {
                startPlugin();
            }
        });
    }

})();
