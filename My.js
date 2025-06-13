(function () {
    function rezka2(component, _object) {
        const network = new Lampa.Reguest();
        const object = _object;
        const select_title = object.search || object.movie.title;
        const prefer_http = Lampa.Storage.field('online_mod_prefer_http') === true;
        const prefer_mp4 = Lampa.Storage.field('online_mod_prefer_mp4') === true;
        const proxy_mirror = Lampa.Storage.field('online_mod_proxy_rezka2_mirror') === true;
        const prox = component.proxy('rezka2');
        const host = prox && !proxy_mirror ? 'https://rezka.ag' : Utils.rezka2Mirror();
        const ref = host + '/';
        const user_agent = Utils.baseUserAgent();
        const cookie = Lampa.Storage.get('online_mod_rezka2_cookie', '') || ('PHPSESSID=' + Utils.randomId(26));
        const headers = {
            'Origin': host,
            'Referer': ref,
            'User-Agent': user_agent,
            'Cookie': cookie
        };

        const searchUrl = host + '/index.php?do=search&subaction=search&q=' + encodeURIComponent(select_title);
        component.loading(true);

        network.timeout(10000);
        network.silent(component.proxyLink(searchUrl, prox), function (html) {
            const items = parseSearchResults(html);

            if (items.length === 1) {
                getEpisodes(items[0].url, items[0].title);
            } else {
                items.forEach(c => c.is_similars = true);
                component.similars(items);
                component.loading(false);
            }
        }, function () {
            component.emptyForQuery(select_title);
        });

        function parseSearchResults(html) {
            const data = [];
            const matches = html.matchAll(/<div class="b-content__inline_item".*?href="(.*?)".*?<div class="title">([^<]+)<\/div>/gs);
            for (const match of matches) {
                data.push({ title: match[2].trim(), url: match[1].trim() });
            }
            return data;
        }

        function getEpisodes(url, title) {
            network.timeout(10000);
            network.silent(component.proxyLink(url, prox), function (html) {
                const match = html.match(/data-player="([^"]+)"/);
                if (!match) return component.empty('Не удалось найти embed');

                const embedUrl = host + match[1];
                network.silent(component.proxyLink(embedUrl, prox), function (html2) {
                    const jsonMatch = html2.match(/var playerData\s*=\s*(\{.+?\});/s);
                    if (!jsonMatch) return component.empty('Ошибка парсинга playerData');

                    let data;
                    try {
                        data = JSON.parse(jsonMatch[1]);
                    } catch (e) {
                        return component.empty('Ошибка JSON');
                    }

                    const playlist = [];
                    const viewed = Lampa.Storage.cache('online_view', 5000, []);
                    const hash = Lampa.Utils.hash(object.movie.original_title);

                    data.playlist.forEach(item => {
                        const file = prefer_mp4 && item.mp4 ? item.mp4 : item.hls;
                        if (!file) return;

                        const stream = {
                            title: item.title,
                            timeline: {},
                            quality: { 'auto': file },
                            file: file,
                            season: 1, // если не сериал — может быть 0
                            episode: 1
                        };
                        playlist.push(stream);
                    });

                    component.reset();
                    playlist.forEach(stream => {
                        const item = Lampa.Template.get('online_mod', stream);
                        item.on('hover:enter', () => {
                            Lampa.Player.play({
                                url: stream.file,
                                quality: stream.quality,
                                title: stream.title
                            });
                            if (viewed.indexOf(hash) === -1) {
                                viewed.push(hash);
                                Lampa.Storage.set('online_view', viewed);
                            }
                        });
                        component.append(item);
                    });

                    component.start(true);
                    component.loading(false);
                }, () => component.empty('Ошибка embed'));
            }, () => component.empty('Ошибка страницы фильма'));
        }
    }

    const component = new Lampa.Component();

    component.search = function (_object, _id) {
        rezka2(component, _object);
    };

    component.start = function (first_select) {
        if (first_select) Lampa.Controller.toggle('content');
    };

    component.render = function () {
        return component.render();
    };

    component.destroy = function () {
        // очистка, если надо
    };

    Lampa.Component.add('rezka', component);
})();