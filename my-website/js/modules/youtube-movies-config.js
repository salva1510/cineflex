/* CineFlex YouTube Movies configuration
 * SECURITY: Use a NEW browser-restricted key. Restrict it to:
 *   https://cineflex.online/*
 *   https://www.cineflex.online/*
 * and restrict API access to YouTube Data API v3 only.
 */
window.CINEFLEX_YOUTUBE = Object.freeze({
  apiKey: 'AIzaSyBN2H7LUujDgdE2edNkXkCoHljbabNGfyE',
  channels: [
    {
      id: 'UCNP49xH_JCwxHIfKdN8dCQw',
      name: 'VIVA Films',
      label: 'Official VIVA Films uploads'
    }
  ],
  searchQueries: [
    'full movie official',
    'full movie Filipino official',
    'full movie English official',
    'full movie Korean official',
    'full movie action official',
    'full movie comedy official',
    'full movie romance official',
    'full movie horror official'
  ],
  maxSearchPagesPerQuery: 1,
  cacheHours: 6,
  maxVideosPerChannel: 300
});
