// Быстрый тест HDRezka плагина для выполнения в консоли Lampa
// Скопируйте и вставьте этот код в консоль браузера на странице Lampa

(function() {
    'use strict';
    
    console.log('🔍 Быстрый тест HDRezka плагина для Lampa');
    console.log('=====================================');
    
    // Проверка загрузки Lampa
    if (typeof window.Lampa === 'undefined') {
        console.error('❌ Lampa не найдена! Убедитесь, что вы в приложении Lampa.');
        return;
    }
    
    console.log('✅ Lampa обнаружена');
    
    // Проверка загрузки плагина
    if (typeof window.HDRezkaConfig !== 'undefined') {
        console.log('✅ HDRezka конфигурация загружена');
        console.log('   Версия:', window.HDRezkaConfig.VERSION);
    } else {
        console.log('⚠️ HDRezka конфигурация не найдена');
    }
    
    // Тест сетевого запроса через Lampa
    console.log('\n🌐 Тестирование сетевого запроса...');
    
    var network = new Lampa.Reguest();
    var testUrl = 'https://rezka.ag';
    
    network.timeout(10000);
    network.native(testUrl, function(response) {
        console.log('✅ Сетевой запрос успешен!');
        console.log('   Размер ответа:', response.length, 'символов');
        console.log('   Содержит "rezka":', response.toLowerCase().includes('rezka') ? 'Да' : 'Нет');
        
        // Тест поиска
        testSearch();
        
    }, function(error) {
        console.error('❌ Сетевой запрос не удался:', error);
        console.log('💡 Возможные причины:');
        console.log('   • Региональная блокировка HDRezka');
        console.log('   • Проблемы с интернет-соединением');
        console.log('   • Изменение домена HDRezka');
        console.log('   • Необходимость использования VPN');
    }, false, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    
    function testSearch() {
        console.log('\n🔎 Тестирование поиска...');
        
        var searchUrl = 'https://rezka.ag/search/?do=search&subaction=search&q=' + encodeURIComponent('мстители');
        
        network.clear();
        network.native(searchUrl, function(html) {
            console.log('✅ Поиск выполнен успешно!');
            
            // Простой парсинг результатов
            var itemPattern = /<div class="b-content__inline_item"[^>]*>/g;
            var matches = html.match(itemPattern);
            var resultsCount = matches ? matches.length : 0;
            
            console.log('   Найдено результатов:', resultsCount);
            
            if (resultsCount > 0) {
                console.log('🎉 HDRezka плагин должен работать корректно!');
                
                // Попробуем извлечь первый результат
                var firstItemMatch = html.match(/<div class="b-content__inline_item"[^>]*>[\s\S]*?<\/div>/);
                if (firstItemMatch) {
                    var item = firstItemMatch[0];
                    var titleMatch = item.match(/<div class="b-content__inline_item-link"[^>]*>([^<]+)<\/div>/);
                    var linkMatch = item.match(/href="([^"]+)"/);
                    
                    if (titleMatch && linkMatch) {
                        console.log('   Пример результата:');
                        console.log('     Название:', titleMatch[1].trim());
                        console.log('     Ссылка:', linkMatch[1]);
                    }
                }
            } else {
                console.log('⚠️ Результаты не найдены. Возможно, изменилась структура страницы.');
            }
            
            testMoviePage();
            
        }, function(error) {
            console.error('❌ Поиск не удался:', error);
        });
    }
    
    function testMoviePage() {
        console.log('\n🎬 Тестирование страницы фильма...');
        
        // Тестируем с известной страницей фильма
        var movieUrl = 'https://rezka.ag/films/action/';
        
        network.clear();
        network.native(movieUrl, function(html) {
            console.log('✅ Страница фильмов загружена');
            
            // Ищем любую ссылку на фильм
            var movieLinkMatch = html.match(/href="(\/films\/[^"]+\.html)"/);
            if (movieLinkMatch) {
                var moviePath = movieLinkMatch[1];
                var fullMovieUrl = 'https://rezka.ag' + moviePath;
                
                console.log('   Тестирование конкретного фильма:', fullMovieUrl);
                
                network.clear();
                network.native(fullMovieUrl, function(movieHtml) {
                    // Проверяем наличие переводов
                    var translatorsMatch = movieHtml.match(/<select[^>]*id="translators-list"/);
                    var seasonsMatch = movieHtml.match(/<select[^>]*id="seasons-list"/);
                    
                    console.log('   Переводы найдены:', translatorsMatch ? 'Да' : 'Нет');
                    console.log('   Сезоны найдены:', seasonsMatch ? 'Да' : 'Нет');
                    
                    if (translatorsMatch) {
                        console.log('🎉 Структура страницы фильма корректна!');
                        console.log('✅ HDRezka плагин готов к использованию в Lampa!');
                    } else {
                        console.log('⚠️ Структура страницы могла измениться');
                    }
                    
                    showSummary(true);
                    
                }, function(error) {
                    console.error('❌ Не удалось загрузить страницу фильма:', error);
                    showSummary(false);
                });
            } else {
                console.log('⚠️ Не найдены ссылки на фильмы');
                showSummary(false);
            }
        }, function(error) {
            console.error('❌ Не удалось загрузить список фильмов:', error);
            showSummary(false);
        });
    }
    
    function showSummary(success) {
        console.log('\n📋 ИТОГОВЫЙ РЕЗУЛЬТАТ');
        console.log('====================');
        
        if (success) {
            console.log('🎉 ОТЛИЧНО! HDRezka плагин должен работать в Lampa');
            console.log('');
            console.log('📝 Что делать дальше:');
            console.log('   1. Установите плагин в Lampa');
            console.log('   2. Найдите любой фильм в каталоге');
            console.log('   3. Нажмите кнопку "HDRezka" на странице фильма');
            console.log('   4. Выберите перевод и наслаждайтесь просмотром!');
        } else {
            console.log('⚠️ Обнаружены проблемы с доступностью HDRezka');
            console.log('');
            console.log('🔧 Рекомендации:');
            console.log('   1. Проверьте доступность rezka.ag в браузере');
            console.log('   2. Используйте VPN если сайт заблокирован');
            console.log('   3. Попробуйте альтернативные домены: hdrezka.me, rezka.me');
            console.log('   4. Проверьте настройки сети и DNS');
        }
        
        console.log('');
        console.log('📞 Если проблемы продолжаются, сохраните этот лог и обратитесь за поддержкой');
    }
    
})();
