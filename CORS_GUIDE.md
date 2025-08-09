# Решение проблем с CORS и доступностью HDRezka

## 🚨 Проблема: "Failed to fetch" или CORS ошибки

Ошибка `Failed to fetch` при тестировании в браузере - это **нормальное поведение** из-за политики безопасности браузеров (CORS). Это **НЕ означает**, что плагин не работает!

## ✅ Почему это происходит

1. **Браузерные ограничения**: Современные браузеры блокируют кросс-доменные запросы для безопасности
2. **CORS политика**: HDRezka.ag не разрешает запросы с других доменов
3. **Тестовая среда**: Файл `test.html` открыт локально (`file://`), что усиливает ограничения

## 🔧 Решения

### 1. Использование в Lampa (Рекомендуется)

**В Lampa плагин будет работать нормально**, потому что:
- Lampa имеет встроенные механизмы обхода CORS
- Приложение делает запросы через собственные методы
- Нет ограничений браузера на файловые запросы

```javascript
// В Lampa такой код работает без проблем:
Lampa.Reguest().native('https://rezka.ag/search/?q=test', success, error);
```

### 2. Тестирование в браузере

Для полноценного тестирования в браузере:

#### Вариант A: Расширение для CORS
1. Установите расширение "CORS Unblock" или "CORS Everywhere"
2. Включите расширение
3. Перезагрузите страницу с тестами

#### Вариант B: Запуск Chrome без CORS
```bash
# Windows
chrome.exe --user-data-dir="C:/temp-chrome" --disable-web-security --disable-features=VizDisplayCompositor

# macOS
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security

# Linux
google-chrome --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

#### Вариант C: Локальный сервер
```bash
# Запустите локальный HTTP сервер
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (если установлен http-server)
npx http-server

# Затем откройте http://localhost:8000/test.html
```

### 3. Проверка работы плагина

#### В Lampa:
1. Установите плагин в Lampa
2. Найдите любой фильм
3. Нажмите кнопку "HDRezka"
4. Если появляется список результатов - плагин работает!

#### Быстрая проверка в консоли Lampa:
```javascript
// Откройте консоль в Lampa (F12)
// Проверьте загружен ли плагин:
console.log('HDRezka plugin:', typeof window.HDRezkaConfig !== 'undefined' ? 'Loaded' : 'Not loaded');

// Тест поиска (если плагин загружен):
if (window.Lampa) {
    var network = new Lampa.Reguest();
    network.native('https://rezka.ag/search/?q=мстители', 
        function(html) { console.log('Search success, length:', html.length); },
        function(error) { console.log('Search error:', error); }
    );
}
```

## 🔍 Диагностика проблем

### 1. Проверка доступности сайта
```javascript
// В консоли браузера:
fetch('https://rezka.ag', {mode: 'no-cors'})
  .then(() => console.log('✓ Сайт доступен'))
  .catch(e => console.log('✗ Сайт недоступен:', e.message));
```

### 2. Проверка региональных блокировок
- Попробуйте открыть https://rezka.ag в обычной вкладке браузера
- Если сайт не открывается - используйте VPN
- Проверьте альтернативные домены: rezka.me, hdrezka.me, hdrezka.sh

### 3. Проверка сетевых настроек
```javascript
// Проверка DNS
nslookup rezka.ag

// Проверка ping
ping rezka.ag

// Traceroute
tracert rezka.ag  // Windows
traceroute rezka.ag  // Linux/macOS
```

## 🛠️ Настройки для разработчиков

### Отключение CORS в различных браузерах:

#### Chrome/Chromium:
```bash
--disable-web-security --disable-features=VizDisplayCompositor --user-data-dir="/tmp/chrome_dev"
```

#### Firefox:
1. Введите `about:config` в адресной строке
2. Установите `security.fileuri.strict_origin_policy` в `false`
3. Установите `privacy.file_unique_origin` в `false`

#### Safari:
1. Меню Safari → Настройки → Дополнения
2. Включите "Показать меню «Разработка»"
3. Меню Разработка → Отключить политики безопасности

### Использование прокси для разработки:

#### Простой CORS прокси:
```javascript
// Используйте публичный CORS прокси (только для тестирования!)
var proxyUrl = 'https://cors-anywhere.herokuapp.com/';
var targetUrl = 'https://rezka.ag/search/?q=test';
fetch(proxyUrl + targetUrl)
  .then(response => response.text())
  .then(html => console.log('Success:', html.length));
```

## 📋 Чек-лист решения проблем

- [ ] Попробовал открыть HDRezka.ag в браузере напрямую
- [ ] Установил расширение для отключения CORS
- [ ] Запустил браузер с отключенной безопасностью
- [ ] Использовал локальный HTTP сервер
- [ ] Проверил плагин в самой Lampa
- [ ] Использовал VPN если сайт заблокирован
- [ ] Проверил консоль на другие ошибки

## 🎯 Заключение

**Важно понимать**: Ошибки CORS в тестах **НЕ означают**, что плагин не работает. Это ограничения браузера при тестировании.

**В реальной Lampa плагин работает нормально**, потому что:
1. Lampa обходит CORS ограничения
2. Приложение использует собственные сетевые методы
3. Нет файловых ограничений браузера

Если плагин не работает в Lampa, проблема скорее всего в:
1. Региональной блокировке HDRezka
2. Изменении структуры сайта
3. Настройках сети/VPN

---

**Рекомендация**: Протестируйте плагин сразу в Lampa, а не в браузере!
