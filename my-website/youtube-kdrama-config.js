window.CINEFLEX_KDRAMA_CONFIG = {
  // Gumamit lamang ng BAGONG key na naka-restrict sa:
  // https://cineflex.online/* at https://www.cineflex.online/*
  apiKey: 'YOUR_RESTRICTED_YOUTUBE_API_KEY',
  maxSearchPagesPerQuery: 3,
  cacheHours: 6,
  minMinutes: 18,
  queries: [
    'Korean drama Tagalog dubbed full episode official',
    'K-drama Tagalog dubbed full episode official',
    'Korean series Filipino dubbed full episode official',
    'Korean drama Tagalog dubbed full movie official'
  ],
  // Optional: ilagay rito ang verified/official YouTube channel IDs.
  // Kapag may laman, videos mula lamang sa mga channel na ito ang ipapakita.
  allowedChannelIds: []
};
