// ---------------------------------------------------------------------------
// Podcast host / dynamic-ad-insertion (DAI) detection.
// A show's hosting + ad-serving platform and its analytics/attribution layers
// are revealed by the episode audio (enclosure) URL — the host's domain, plus
// any measurement prefixes chained in front. This fingerprints those domains.
//
// Honest limit: this identifies the PLATFORM (host/DAI + analytics), not the
// specific advertiser/DSP. Self-hosted shows on a plain CDN read as "self-hosted".
// ---------------------------------------------------------------------------

// Hosting / ad-serving (DAI) platforms — the effective "ad server" for the show.
const HOSTS = [
  [/megaphone\.fm/, 'Megaphone (Spotify)'],
  [/art19\.com/, 'Art19 (Amazon)'],
  [/simplecast(audio)?\.com|simplecastaudio/, 'Simplecast (AdsWizz)'],
  [/omny\.fm|omnycontent\.com/, 'Omny Studio (iHeart)'],
  [/acast\.com/, 'Acast'],
  [/spreaker\.com/, 'Spreaker (iHeart)'],
  [/libsyn(pro)?\.com|libsyn\.net/, 'Libsyn'],
  [/dovetail|prxu\.org/, 'Dovetail (PRX)'],
  [/buzzsprout\.com/, 'Buzzsprout'],
  [/captivate\.fm/, 'Captivate'],
  [/transistor\.fm/, 'Transistor'],
  [/anchor\.fm|spotifyforpodcasters|spotifycdn\.com|podcasters\.spotify/, 'Spotify / Anchor'],
  [/podbean\.com/, 'Podbean'],
  [/redcircle\.com/, 'RedCircle'],
  [/blubrry\.com|blubrry\.net/, 'Blubrry'],
  [/fireside\.fm/, 'Fireside'],
  [/audioboom\.com|audioboo\.fm/, 'AudioBoom'],
  [/podigee(-cdn)?\.com|podigee\.io/, 'Podigee'],
  [/ausha\.co/, 'Ausha'],
  [/castos\.com|sermonaudio/, 'Castos'],
  [/pinecast\.com/, 'Pinecast'],
  [/soundcloud\.com|sndcdn\.com/, 'SoundCloud'],
  [/tritondigital|tritonsdaccess|triton\.app/, 'Triton Digital'],
  [/iono\.fm/, 'iono.fm'],
  [/feedburner|feedproxy\.google/, 'FeedBurner'],
];

// Generic CDNs / self-hosting (only used when no platform above matches).
const GENERIC = [
  [/amazonaws\.com|cloudfront\.net/, 'Self-hosted (AWS)'],
  [/storage\.googleapis|googleusercontent/, 'Self-hosted (Google Cloud)'],
  [/\.b-cdn\.net|bunnycdn/, 'Self-hosted (Bunny CDN)'],
  [/cdn\.|\.cdn/, 'Self-hosted (CDN)'],
];

// Analytics / attribution / measurement prefixes (chained in front of the host).
const PREFIXES = [
  [/podtrac\.com/, 'Podtrac'],
  [/chtbl\.com|chrt\.fm/, 'Chartable'],
  [/pdst\.fm/, 'Podsights (Spotify)'],
  [/mgln\.ai/, 'Magellan AI'],
  [/op3\.dev/, 'OP3'],
  [/claritaspod\.com|claritas/, 'Claritas'],
  [/verifi\.podscribe|podscribe\.com/, 'Podscribe'],
  [/arttrk\.com|artsai/, 'ArtsAI'],
  [/veritone?one|veritone/, 'Veritone One'],
  [/adbarker/, 'AdBarker'],
  [/gumball\.fm|gum\.fm/, 'Gumball'],
];

/** Detect host + prefixes from a single enclosure URL. */
export function detectFromUrl(url = '') {
  const u = String(url).toLowerCase();
  if (!u) return { server: null, prefixes: [] };

  let server = null;
  for (const [re, name] of HOSTS) if (re.test(u)) { server = name; break; }
  if (!server) for (const [re, name] of GENERIC) if (re.test(u)) { server = name; break; }

  const prefixes = [];
  for (const [re, name] of PREFIXES) if (re.test(u) && !prefixes.includes(name)) prefixes.push(name);

  return { server, prefixes };
}

/** Detect across several enclosure URLs (different episodes); merge results. */
export function detectFromUrls(urls = []) {
  let server = null;
  const prefixes = [];
  for (const url of urls) {
    const d = detectFromUrl(url);
    if (!server && d.server) server = d.server;
    for (const p of d.prefixes) if (!prefixes.includes(p)) prefixes.push(p);
  }
  return { server, prefixes };
}
