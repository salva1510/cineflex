/* CineFlex Global YouTube Movies configuration
 * Use a NEW browser-restricted YouTube Data API v3 key.
 * Restrict HTTP referrers to https://cineflex.online/* and https://www.cineflex.online/*.
 */
window.CINEFLEX_YOUTUBE = Object.freeze({
  apiKey: 'AIzaSyDqaBoK5lBfqWa5AR1EP0hnwtU7B4OUd9c',
  channels: [],
  searchQueries: [
    'full movie official English', 'full movie official Filipino Tagalog',
    'full movie official Korean English subtitles', 'full movie official Japanese English subtitles',
    'full movie official Chinese English subtitles', 'full movie official Hindi English subtitles',
    'full movie official Thai English subtitles', 'full movie official Indonesian English subtitles',
    'full movie official Spanish', 'full movie official French',
    'action full movie official', 'comedy full movie official', 'romance full movie official',
    'horror full movie official', 'drama full movie official', 'thriller full movie official',
    'crime full movie official', 'science fiction full movie official', 'fantasy full movie official',
    'adventure full movie official', 'family full movie official', 'animation full movie official',
    'martial arts full movie official', 'war full movie official', 'western full movie official',
    'documentary full movie official', 'classic full movie restored official',
    'Filipino full movie Viva Films', 'Filipino full movie Regal Entertainment',
    'Filipino full movie Star Cinema', 'Filipino full movie FPJ Productions',
    'Korean movie full movie official', 'Chinese movie full movie official',
    'Hindi movie full movie official', 'Japanese movie full movie official'
  ],
  maxSearchPagesPerQuery: 1,
  cacheHours: 6,
  maxVideosPerChannel: 0
});
