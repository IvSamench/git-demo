(function waitForLampa() { if (typeof Lampa === 'undefined' || typeof Lampa.Component === 'undefined') { setTimeout(waitForLampa, 100); return; }

const network = new Lampa.Reguest();
const component = new Lampa.Component();
const Storage = Lampa.Storage;
const Utils = {
    rezka2Mirror: function () {
        let url = Storage.get('online_mod_rezka2_mirror', '') + '';
        if (!url) return 'https://rezka.ag';
        if (url.indexOf('://') === -1) url = 'https://' + url;
        if (url.charAt(url.length - 1) === '/') url = url.slice(0, -1);
        return url;
    }
};

let object = {};
let select_title = '';
let viewed = Storage.cache('online_view', 5000, []);

function parseSearchResults(html) {
    const items = [];
    const regex = /<div class="b-content__inline_item.*?<a href="([^"]+)">.*?<div class="title">([^<]+)<\/div>/gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
        items.push({ title: match[2].trim(), url: match[1].trim() });
    }
    return items;
}

function extractPlayerData(html) {
    const match = html.match(/var\s+playerData\s*=\s*(\{.+?\});/s);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch (e) {
        return null;
    }
}

function append(items) {
    component.reset();
    const hash = Lampa.Utils.hash(object.movie.original_title);

    items.forEach(element => {
        const item = Lampa.Template.get('online_mod', element);
        item.append(Lampa.Timeline.render({}));

        item.on('hover:enter', () => {
            Lampa.Player.play({
                url: element.file,
                title: element.title,
                quality: { 'auto': element.file }
            });

            if (!viewed.includes(hash)) {
                viewed.push(hash);
                item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Storage.set('online_view', viewed);
            }
        });

        component.append(item);
    });

    component.start(true);
}

function getEpisodes(page_url, title) {
    const host = Utils.rezka2Mirror();
    const prox = component.proxy('rezka2');

    network.timeout(10000);
    network.silent(component.proxyLink(page_url, prox), html => {
        const embedMatch = html.match(/data-player="([^"]+)"/);
        if (!embedMatch) return component.empty('Не найден embed');

        const embedUrl = host + embedMatch[1];

        network.silent(component.proxyLink(embedUrl, prox), html2 => {
            const data = extractPlayerData(html2);
            if (!data || !data.playlist) return component.empty('Ошибка playerData');

            const playlist = data.playlist.map(item => ({
                title: item.title || title,
                file: item.hls || item.mp4,
                quality: { 'auto': item.hls || item.mp4 }
            }));

            append(playlist);
        }, () => component.empty('Ошибка загрузки embed'));
    }, () => component.empty('Ошибка загрузки страницы'));
}

function search(_object) {
    object = _object;
    select_title = object.search || object.movie.title;
    const host = Utils.rezka2Mirror();
    const prox = component.proxy('rezka2');

    const searchUrl = host + '/index.php?do=search&subaction=search&q=' + encodeURIComponent(select_title);

    component.loading(true);
    network.timeout(10000);
    network.silent(component.proxyLink(searchUrl, prox), html => {
        const items = parseSearchResults(html);
        if (items.length === 1) {
            getEpisodes(items[0].url, items[0].title);
        } else if (items.length > 1) {
            items.forEach(i => i.is_similars = true);
            component.similars(items);
            component.loading(false);
        } else {
            component.emptyForQuery(select_title);
        }
    }, () => component.empty('Ошибка поиска'));
}

component.search = function (_object, _id) {
    search(_object);
};

component.start = function (first_select) {
    if (first_select) Lampa.Controller.toggle('content');
};

component.render = function () {
    return component.render();
};

component.destroy = function () {
    network.clear();
};

Lampa.Component.add('rezka', component);
Lampa.Source.add('rezka', {
    name: 'HDRezka',
    component: 'rezka'
});

})();

