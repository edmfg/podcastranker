// ---------------------------------------------------------------------------
// Podcast host / dynamic-ad-insertion (DAI) detection.
// A show's hosting + ad-serving platform and its analytics/attribution layers
// are revealed by the episode audio (enclosure) URL — the host's domain, plus
// any measurement prefixes chained in front. This fingerprints those domains
// and returns each platform's name + website so the UI can link them.
//
// Honest limit: this identifies the PLATFORM (host/DAI + analytics), not the
// specific advertiser/DSP. Self-hosted shows on a plain CDN read as "self-hosted".
// ---------------------------------------------------------------------------

// Hosting / ad-serving (DAI) platforms — [pattern, name, website].
const HOSTS = [
  [/megaphone\.fm/, 'Megaphone (Spotify)', 'https://megaphone.fm'],
  [/art19\.com/, 'Art19 (Amazon)', 'https://art19.com'],
  [/simplecast(audio)?\.com|simplecastaudio/, 'Simplecast (AdsWizz)', 'https://simplecast.com'],
  [/omny\.fm|omnycontent\.com/, 'Omny Studio (iHeart)', 'https://omnystudio.com'],
  [/acast\.com/, 'Acast', 'https://acast.com'],
  [/spreaker\.com/, 'Spreaker (iHeart)', 'https://www.spreaker.com'],
  [/libsyn(pro)?\.com|libsyn\.net/, 'Libsyn', 'https://libsyn.com'],
  [/dovetail|prxu\.org/, 'Dovetail (PRX)', 'https://dovetail.prx.org'],
  [/buzzsprout\.com/, 'Buzzsprout', 'https://www.buzzsprout.com'],
  [/captivate\.fm/, 'Captivate', 'https://www.captivate.fm'],
  [/transistor\.fm/, 'Transistor', 'https://transistor.fm'],
  [/anchor\.fm|spotifyforpodcasters|spotifycdn\.com|podcasters\.spotify/, 'Spotify / Anchor', 'https://podcasters.spotify.com'],
  [/podbean\.com/, 'Podbean', 'https://www.podbean.com'],
  [/redcircle\.com/, 'RedCircle', 'https://redcircle.com'],
  [/blubrry\.com|blubrry\.net/, 'Blubrry', 'https://blubrry.com'],
  [/fireside\.fm/, 'Fireside', 'https://fireside.fm'],
  [/audioboom\.com|audioboo\.fm/, 'AudioBoom', 'https://audioboom.com'],
  [/podigee(-cdn)?\.com|podigee\.io/, 'Podigee', 'https://www.podigee.com'],
  [/ausha\.co/, 'Ausha', 'https://www.ausha.co'],
  [/castos\.com|sermonaudio/, 'Castos', 'https://castos.com'],
  [/pinecast\.com/, 'Pinecast', 'https://pinecast.com'],
  [/soundcloud\.com|sndcdn\.com/, 'SoundCloud', 'https://soundcloud.com'],
  [/tritondigital|tritonsdaccess|triton\.app/, 'Triton Digital', 'https://www.tritondigital.com'],
  [/iono\.fm/, 'iono.fm', 'https://iono.fm'],
  [/feedburner|feedproxy\.google/, 'FeedBurner', 'https://feedburner.com'],
];

// Generic CDNs / self-hosting (only used when no platform above matches; no link).
const GENERIC = [
  [/amazonaws\.com|cloudfront\.net/, 'Self-hosted (AWS)', null],
  [/storage\.googleapis|googleusercontent/, 'Self-hosted (Google Cloud)', null],
  [/\.b-cdn\.net|bunnycdn/, 'Self-hosted (Bunny CDN)', null],
  [/cdn\.|\.cdn/, 'Self-hosted (CDN)', null],
];

// Analytics / attribution / measurement prefixes — [pattern, name, website].
const PREFIXES = [
  [/podtrac\.com/, 'Podtrac', 'https://podtrac.com'],
  [/chtbl\.com|chrt\.fm/, 'Chartable', 'https://chartable.com'],
  [/pdst\.fm/, 'Podsights (Spotify)', 'https://podsights.com'],
  [/mgln\.ai/, 'Magellan AI', 'https://www.magellan.ai'],
  [/op3\.dev/, 'OP3', 'https://op3.dev'],
  [/claritaspod\.com|claritas/, 'Claritas', 'https://claritas.com'],
  [/verifi\.podscribe|podscribe\.com/, 'Podscribe', 'https://podscribe.com'],
  [/arttrk\.com|artsai/, 'ArtsAI', 'https://artsai.com'],
  [/veritone?one|veritone/, 'Veritone One', 'https://veritoneone.com'],
  [/adbarker/, 'AdBarker', 'https://www.adbarker.com'],
  [/gumball\.fm|gum\.fm/, 'Gumball', 'https://gumball.fm'],
];

/** Detect host + prefixes from a single enclosure URL. */
export function detectFromUrl(url = '') {
  const u = String(url).toLowerCase();
  if (!u) return { server: null, prefixes: [] };

  let server = null;
  for (const [re, name, link] of HOSTS) if (re.test(u)) { server = { name, url: link }; break; }
  if (!server) for (const [re, name, link] of GENERIC) if (re.test(u)) { server = { name, url: link }; break; }

  const prefixes = [];
  const seen = new Set();
  for (const [re, name, link] of PREFIXES) if (re.test(u) && !seen.has(name)) { seen.add(name); prefixes.push({ name, url: link }); }

  return { server, prefixes };
}

/** Detect across several enclosure URLs (different episodes); merge results. */
export function detectFromUrls(urls = []) {
  let server = null;
  const prefixes = [];
  const seen = new Set();
  for (const url of urls) {
    const d = detectFromUrl(url);
    if (!server && d.server) server = d.server;
    for (const p of d.prefixes) if (!seen.has(p.name)) { seen.add(p.name); prefixes.push(p); }
  }
  return { server, prefixes };
}
