export default {
  name: 'rezka',
  title: 'Rezka.ag',

  manifest() {
    return {
      id: 'rezka',
      name: 'Rezka.ag',
      version: '1.0',
      author: 'IvSamench',
      description: 'Плагин для поиска и просмотра с Rezka.ag'
    };
  },

  search(query) {
    return fetch(`https://rezka.ag/api/v1/search/${encodeURIComponent(query)}/`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://rezka.ag/'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.results || !data.results.length) return [];

        return data.results.map(item => ({
          title: item.title,
          year: item.year,
          url: `https://rezka.ag${item.url}`,
          type: item.type,
          poster: item.poster
        }));
      });
  },

  getList(item) {
    return fetch(item.url, {
      headers: {
        Referer: 'https://rezka.ag',
        'User-Agent': 'Mozilla/5.0'
      }
    })
      .then(res => res.text())
      .then(html => {
        const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/);
        if (!jsonMatch) return [];

        const data = JSON.parse(jsonMatch[1]);
        const seasons = data.seasons || [];
        const episodes = data.episodes || [];

        if (seasons.length) {
          return seasons.map(season => ({
            title: `Сезон ${season.number}`,
            url: item.url + `?season=${season.number}`,
            season: season.number,
            episodes: []
          }));
        } else if (episodes.length) {
          return episodes.map(ep => ({
            title: `Серия ${ep.number}`,
            url: item.url + `?episode=${ep.number}`,
            episode: ep.number
          }));
        } else {
          return [];
        }
      });
  },

  getLink(item) {
    return fetch(item.url, {
      headers: {
        Referer: 'https://rezka.ag',
        'User-Agent': 'Mozilla/5.0'
      }
    })
      .then(res => res.text())
      .then(html => {
        const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/);
        if (!jsonMatch) throw new Error('No video data found');

        const data = JSON.parse(jsonMatch[1]);
        const videos = data.player && data.player.videos;

        if (!videos) throw new Error('No video streams found');

        let bestStream = null;
        let maxQuality = 0;

        Object.keys(videos).forEach(key => {
          const stream = videos[key];
          if (stream && stream.url && stream.quality) {
            const qualityNum = parseInt(stream.quality.replace(/\D/g, ''), 10);
            if (qualityNum > maxQuality) {
              maxQuality = qualityNum;
              bestStream = stream.url;
            }
          }
        });

        if (!bestStream) throw new Error('No suitable stream found');

        return { url: bestStream, subtitles: data.player.subtitles || [] };
      });
  }
};