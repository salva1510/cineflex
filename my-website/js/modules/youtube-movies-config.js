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
  cacheHours: 6,
  maxVideosPerChannel: 200
});
