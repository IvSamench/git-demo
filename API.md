# API Документация

## Веб API парсера HDRezka.ag

### Базовый URL
```
http://localhost:5000
```

### Методы API

#### 1. Главная страница
```
GET /
```
Возвращает HTML интерфейс для работы с парсером.

#### 2. Парсинг одного фильма
```
POST /parse_single
Content-Type: application/json

{
    "url": "https://rezka.ag/films/comedy/79191-pod-prikrytiem-2025-latest.html"
}
```

**Ответ:**
```json
{
    "success": true,
    "message": "Парсинг запущен"
}
```

#### 3. Парсинг категории
```
POST /parse_category
Content-Type: application/json

{
    "category": "films",
    "pages": 1,
    "max_detailed": 10
}
```

**Параметры:**
- `category` - категория для парсинга (films, series, cartoons, animation, new, popular)
- `pages` - количество страниц для парсинга (по умолчанию 1)
- `max_detailed` - максимальное количество элементов для детального парсинга

**Ответ:**
```json
{
    "success": true,
    "message": "Парсинг запущен"
}
```

#### 4. Получение статуса
```
GET /status
```

**Ответ:**
```json
{
    "active": true,
    "progress": 45,
    "current_item": "Парсинг: Название фильма",
    "total_items": 10,
    "results": [],
    "error": null
}
```

#### 5. Получение результатов
```
GET /results
```

**Ответ:**
```json
{
    "results": [
        {
            "title_ru": "Под прикрытием",
            "title_original": "Undercover",
            "year": 2025,
            "country": "Великобритания",
            "genres": ["Комедии"],
            "rating": 7.5,
            "type": "film",
            "quality": "HD 720p",
            "seasons": [],
            "translations": ["Дубляж", "Субтитры"],
            "url": "https://rezka.ag/films/..."
        }
    ],
    "count": 1
}
```

#### 6. Скачивание результатов
```
GET /download/{format}
```

**Параметры:**
- `format` - формат файла (json, csv)

Возвращает файл для скачивания.

#### 7. Получение категорий
```
GET /categories
```

**Ответ:**
```json
{
    "films": "https://rezka.ag/films/",
    "series": "https://rezka.ag/series/",
    "cartoons": "https://rezka.ag/cartoons/",
    "animation": "https://rezka.ag/animation/",
    "new": "https://rezka.ag/new/",
    "popular": "https://rezka.ag/popular/"
}
```

#### 8. Очистка результатов
```
POST /clear_results
```

**Ответ:**
```json
{
    "success": true
}
```

## Консольный API

### Класс RezkaParser

#### Инициализация
```python
from rezka_parser import RezkaParser

parser = RezkaParser()
```

#### Методы

##### parse_movie_info(url)
Парсит информацию об одном фильме/сериале.

**Параметры:**
- `url` (str) - URL фильма на rezka.ag

**Возвращает:**
- `dict` - информация о фильме или `None` при ошибке

**Пример:**
```python
movie_info = parser.parse_movie_info("https://rezka.ag/films/comedy/79191-pod-prikrytiem-2025-latest.html")
```

##### parse_movies_list(category_url, pages=1)
Получает список фильмов из категории.

**Параметры:**
- `category_url` (str) - URL категории
- `pages` (int) - количество страниц для парсинга

**Возвращает:**
- `list` - список базовой информации о фильмах

**Пример:**
```python
movies = parser.parse_movies_list("https://rezka.ag/films/", pages=2)
```

##### parse_detailed_movies(movies_list, max_movies=None)
Получает детальную информацию для списка фильмов.

**Параметры:**
- `movies_list` (list) - список фильмов из parse_movies_list
- `max_movies` (int) - ограничение количества

**Возвращает:**
- `list` - список детальной информации о фильмах

##### save_to_json(data, filename)
Сохраняет данные в JSON файл.

##### save_to_csv(data, filename)
Сохраняет данные в CSV файл.

### Класс AdvancedRezkaParser

Расширенная версия парсера с дополнительными возможностями.

#### Дополнительные методы

##### parse_category_advanced(category, pages=1, max_detailed=10, save_results=True)
Расширенный парсинг категории с автоматическим сохранением.

##### search_movies(query, category='all', max_results=20)
Поиск фильмов по названию.

##### filter_by_criteria(movies, year_from=None, year_to=None, genres=None, countries=None, min_rating=None)
Фильтрация фильмов по различным критериям.

##### export_to_excel(movies, filename)
Экспорт результатов в Excel файл.

## Структура данных фильма

```json
{
    "title_ru": "Русское название",
    "title_original": "Original Title",
    "year": 2025,
    "country": "Страна производства",
    "genres": ["Жанр1", "Жанр2"],
    "rating": 7.5,
    "description": "Описание фильма",
    "type": "film|series",
    "quality": "HD 720p",
    "seasons": [
        {
            "season_number": 1,
            "title": "1 сезон"
        }
    ],
    "translations": ["Перевод1", "Перевод2"],
    "url": "https://rezka.ag/..."
}
```

## Примеры использования

### Python скрипт
```python
from rezka_parser import RezkaParser

# Создание парсера
parser = RezkaParser()

# Парсинг одного фильма
movie = parser.parse_movie_info("https://rezka.ag/films/comedy/79191-pod-prikrytiem-2025-latest.html")
print(f"Фильм: {movie['title_ru']}")

# Парсинг списка фильмов
movies_list = parser.parse_movies_list("https://rezka.ag/films/", pages=1)
detailed_movies = parser.parse_detailed_movies(movies_list[:5])

# Сохранение результатов
parser.save_to_json(detailed_movies, "movies.json")
parser.save_to_csv(detailed_movies, "movies.csv")
```

### cURL запросы

```bash
# Запуск парсинга одного фильма
curl -X POST http://localhost:5000/parse_single \
  -H "Content-Type: application/json" \
  -d '{"url": "https://rezka.ag/films/comedy/79191-pod-prikrytiem-2025-latest.html"}'

# Проверка статуса
curl http://localhost:5000/status

# Получение результатов
curl http://localhost:5000/results

# Скачивание JSON
curl http://localhost:5000/download/json -o results.json
```

## Ограничения и рекомендации

1. **Задержки между запросами**: Рекомендуется задержка 1-2 секунды между запросами
2. **Максимальное количество**: Не рекомендуется парсить более 100 элементов за раз
3. **Обработка ошибок**: Всегда проверяйте результаты на наличие ошибок
4. **Соблюдение правил**: Используйте парсер в соответствии с правилами сайта
