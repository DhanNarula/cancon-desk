// English / Français. Every string the site shows, including the templates
// that turn analysis output into editorial copy.

const pct = (x) => `${Math.round(x * 100)}%`;

export const STR = {
  en: {
    locale: 'en-CA',
    tagline: 'A programming research desk for Canadian music',
    asOf: (d) => `Charts as of ${d}`,
    refreshed: 'Refreshed daily from public Apple Music charts',
    nav: { pulse: 'Pulse', chart: 'The chart', away: 'Home & away', scenes: 'Scenes', labels: 'Labels', sound: 'Sound', radar: 'Releases', pitches: 'Pitches', method: 'Method' },

    pulseKicker: 'Today in Canada',
    pulseHead: (n, total) => `of the ${total} most-played songs in Canada are by Canadian artists`,
    pulseNo1: (s, ranks) => `${s.artist}’s “${s.name}” is the top Canadian song at #${s.rank}${ranks ? ` — and ${ranks}` : ''}.`,
    ranksAbroad: (parts) => parts.join(', '),
    inMarket: (m, r) => `#${r} in ${MARKET.en[m]}`,
    tiles: {
      albums: 'Canadian albums in the top 100',
      top10: 'Canadian songs in the top 10',
      nonMajor: 'Songs released outside the three majors',
      catalogue: 'Catalogue share (3+ years old)',
      catalogueSub: (us) => `vs ${us} in the US`,
      fresh: 'Released in the last 30 days',
      artists: 'Canadian artists charting',
    },
    coverage: (c, n) => `Nationality verified for ${pct(c)} of songs. ${n ? `Unverified: ${n}.` : ''}`,

    chartTitle: 'The chart, annotated',
    chartDek: 'Canada’s 100 most-played songs on Apple Music, joined with artist origin, label ownership, release age and where each song ranks abroad.',
    songs: 'Songs', albums: 'Albums',
    filters: { all: 'All', canadian: 'Canadian', bigger: 'Bigger here', indie: 'Outside the majors', new: 'New (≤30 days)', catalogue: 'Catalogue' },
    search: 'Search title, artist or label',
    cols: { rank: '#', title: 'Title', genre: 'Genre', released: 'Released', label: 'Label', abroad: 'Abroad' },
    showAll: (n) => `Show all ${n}`, showLess: 'Show fewer',
    noRows: 'Nothing matches those filters.',
    newEntry: 'NEW', unverified: 'unverified',
    canadianFrom: (city) => (city ? `Canadian · ${city}` : 'Canadian'),

    awayTitle: 'Home & away',
    awayDek: 'Each dot is a song in Canada’s top 100. Below the diagonal, a song ranks higher in Canada than in the other market; in the bottom band, it doesn’t chart there at all.',
    compareWith: 'Compare with',
    axisCA: 'Rank in Canada', axisOther: (m) => `Rank in ${MARKET.en[m]}`,
    notCharting: 'Not in top 100',
    legendCA: 'Canadian artist', legendOther: 'Other artist',
    biggerHere: 'Bigger in Canada', biggerThere: (m) => `Bigger in ${MARKET.en[m]}`,
    exportsTitle: 'Canadian exports',
    exportsDek: 'Songs by Canadian artists on other markets’ charts today.',
    staleNote: (m, d) => `${MARKET.en[m]} chart from ${d} (today’s feed was unavailable).`,

    scenesTitle: 'Scenes',
    scenesDek: 'Where today’s charting Canadian artists come from — birthplace for solo artists, formation city for groups.',
    artistsN: (n) => `${n} artist${n === 1 ? '' : 's'}`,

    labelsTitle: 'Who releases it',
    labelsDek: 'Ownership parsed from each release’s copyright line. “Major-distributed” means an independent label whose distribution is owned by a major.',
    tier: { major: 'Major label', 'major-distributed': 'Major-distributed', independent: 'Independent', unknown: 'Unknown' },
    barAll: 'Canada’s top 100', barCA: 'Canadian artists only',
    topLabels: 'Labels on the chart', canadianLabel: 'Canadian label', parentCo: 'Parent company',
    songsN: (n) => `${n} song${n === 1 ? '' : 's'}`,

    soundTitle: 'The sound of the chart',
    soundDek: 'What Canada plays compared with the US — by genre, and by how old the music is.',
    genreTitle: 'Genre share, Canada vs US',
    ageTitle: 'Release age, Canada vs US',
    age: { new: '≤ 30 days', recent: '1–12 months', established: '1–3 years', catalogue: '3+ years' },
    ca: 'Canada', us: 'US',
    leans: (g, d) => `Canada leans ${g} (+${Math.round(d * 100)} pts)`,

    radarTitle: 'Release radar',
    radarDek: 'New and upcoming releases from Canadian chart artists and Polaris Music Prize alumni — the calendar a label-liaison conversation starts from.',
    when: { upcoming: 'Coming up', thisWeek: 'Out this week', recent: 'Last 60 days' },
    tags: { chart: 'Charting now', polaris: 'Polaris alumni', editor: 'Watchlist' },
    kind: { single: 'Single', ep: 'EP', album: 'Album' },
    inDays: (d) => (d === 1 ? 'tomorrow' : `in ${d} days`), daysAgo: (d) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`),

    pitchesTitle: 'Programming opportunities',
    pitchesDek: 'Generated from today’s data. Each one is a starting point: open it, sharpen the angle, pick the tracks, and export a pitch for the editorial team.',
    draft: 'Draft pitch', evidence: 'Why now', partners: 'Label partners', tracksN: (n) => `${n} tracks`,
    opp: {
      homeHeat: (p) => ({
        title: `Bigger here: ${p.n} songs Canada loves more than the US`,
        dek: `${p.n} songs in Canada’s top 50 are missing from, or 25+ places lower on, the US chart${p.canadian ? ` — ${p.canadian} by Canadian artists` : ''}.`,
        format: 'Playlist · “Bigger in Canada”',
        angle: 'Canadian listeners are choosing their own hits. A rolling “Bigger in Canada” playlist would spotlight the songs this country is championing before, or instead of, the US, with homegrown artists up front. It is a programming hook only this market can own.',
      }),
      climbers: (p) => ({
        title: `On the rise: ${p.n} Canadian song${p.n === 1 ? '' : 's'} climbing`,
        dek: `${p.debuts ? `${p.debuts} new entr${p.debuts === 1 ? 'y' : 'ies'} and ` : ''}big moves for Canadian artists since yesterday.`,
        format: 'New-music placement · social',
        angle: 'Momentum is building for these Canadian tracks. Supporting them now, in new-music playlists and on social, puts us early on the story.',
      }),
      releaseWindow: (p, t) => ({
        title: `${p.artist} — “${p.title}”`,
        dek: `${t.kind[p.kind] || ''} ${p.days > 0 ? `out ${t.inDays(p.days)}` : `released ${t.daysAgo(-p.days)}`} · ${p.watch === 'chart' ? `currently charting at #${p.chartRank}` : p.watch === 'polaris' ? 'Polaris Music Prize alumni' : 'on the watchlist'}.`,
        format: 'Priority release · new-music feature',
        angle: `A new ${(t.kind[p.kind] || 'release').toLowerCase()} from ${p.artist}. Worth a conversation with the label about release-week placement, artwork and a short story about the record for the editorial page.`,
      }),
      scene: (p) => ({
        title: `Made in ${p.city}: ${p.artists} artists on the chart`,
        dek: `${p.city} has ${p.artists} artists in Canada’s charts today, enough for a city playlist with a real point of view.`,
        format: 'Playlist · city spotlight',
        angle: `A “Made in ${p.city}” playlist ties today’s chart presence to a place. Mix the current hits with the city’s deeper catalogue and its emerging artists.`,
      }),
      genreLean: (p) => ({
        title: `Canada over-indexes on ${p.genre}`,
        dek: `${pct(p.ca)} of Canada’s top 100 is ${p.genre}, compared with ${pct(p.us)} in the US${p.canadian ? `; ${p.canadian} of those songs are by Canadian artists` : ''}.`,
        format: 'Genre hub · editorial playlist',
        angle: `${p.genre} is over-performing in Canada relative to the US. That points to an audience worth a dedicated Canadian ${p.genre} destination, and to Canadian ${p.genre} artists who could ride the wave.`,
      }),
      indieCanada: (p) => ({
        title: `Independent and Canadian: ${p.n} of ${p.of}`,
        dek: `${p.n} of the ${p.of} Canadian songs on the chart are released outside the three major-label groups.`,
        format: 'Editorial spotlight · independent',
        angle: 'Independent Canadian releases are holding their own against major-label campaigns. A spotlight tells that story and strengthens relationships with Canadian independent labels.',
      }),
      exports: (p) => ({
        title: `Canadian exports: ${p.n} songs charting abroad`,
        dek: `${p.n} songs by Canadian artists are charting in two or more of the ${p.markets} comparison markets.`,
        format: 'Editorial story · social',
        angle: 'Canadian artists are travelling. A “Canada to the world” story, backed by chart positions abroad, makes a strong editorial and social moment.',
      }),
      catalogue: (p) => ({
        title: `Catalogue moment: ${p.n} older songs in the top 50`,
        dek: `${p.n} songs released 3+ years ago sit in Canada’s top 50; the oldest is ${p.oldest} years old.`,
        format: 'Catalogue playlist · seasonal',
        angle: 'Catalogue is driving real listening right now. Packaging these songs with context (why now, what is driving it) turns passive streams into an editorial moment.',
      }),
      polaris: (p) => ({
        title: `Polaris alumni, new music: ${p.n} releases`,
        dek: `${p.n} releases in the last 60 days from Polaris Music Prize winners and shortlisted artists.`,
        format: 'Playlist · Canadian independent',
        angle: 'Polaris alumni are some of the most acclaimed artists in Canadian music. A rolling playlist of their new releases keeps that catalogue alive and gives critically acclaimed independent music a home.',
      }),
    },

    pitch: {
      title: 'Pitch', working: 'Working title', format: 'Format', timing: 'Timing', angle: 'The angle',
      evidence: 'Why now (data)', tracks: 'Proposed tracklist', partners: 'Label partners to loop in', notes: 'Notes',
      by: 'Prepared by', yourName: 'Your name', copy: 'Copy as text', download: 'Download .md', print: 'Print', close: 'Close',
      copied: 'Copied', now: 'This week', sources: 'Sources', saved: 'Draft saved on this device',
    },

    methodTitle: 'Method & sources',
    method: [
      ['Charts', 'Apple Music’s public “most played” feeds for Canada (songs and albums) and four comparison markets: the US, UK, Australia and France. Fetched daily by a scheduled job; history accumulates from the first run.'],
      ['Who counts as Canadian', 'An artist is Canadian when Wikidata lists Canadian citizenship or Canadian origin, a group formed in Canada, or an artist born in Canada. Artists are matched on their exact Apple Music artist ID (Wikidata P2850), so there is no name guessing. MusicBrainz is the fallback. Anything still unknown is shown as unverified, not guessed. This mirrors the “A” (artist) part of the CRTC’s MAPL definition of Canadian content.'],
      ['Labels', 'Parsed from each release’s copyright line in the Apple catalog. When a line names several companies, the last-named parent wins (“X, under exclusive license to Republic Records, a division of UMG” → Universal). Artist-owned masters are classed by the line as written unless an editor override says otherwise.'],
      ['Release age', 'Measured from the release date in the feed. Older songs are sometimes re-issued, so “catalogue” is a floor, not a ceiling.'],
      ['Corrections', 'Editor corrections live in editorial/overrides.json and are applied on every refresh. The watchlist lives in editorial/watchlist.json.'],
      ['Limits', 'Apple Music charts reflect Apple Music listeners, not the whole market. Rankings are point-in-time. Use them to start an editorial conversation, not to end one.'],
    ],
    footer: 'Independent research project. Not affiliated with Apple. Chart data © Apple; artist data from Wikidata (CC0) and MusicBrainz (CC0).',
  },

  fr: {
    locale: 'fr-CA',
    tagline: 'Un bureau de recherche en programmation pour la musique canadienne',
    asOf: (d) => `Palmarès du ${d}`,
    refreshed: 'Mis à jour chaque jour à partir des palmarès publics d’Apple Music',
    nav: { pulse: 'Pouls', chart: 'Le palmarès', away: 'Ici et ailleurs', scenes: 'Scènes', labels: 'Étiquettes', sound: 'Son', radar: 'Sorties', pitches: 'Propositions', method: 'Méthode' },

    pulseKicker: 'Aujourd’hui au Canada',
    pulseHead: (n, total) => `des ${total} chansons les plus écoutées au Canada sont d’artistes canadiens`,
    pulseNo1: (s, ranks) => `« ${s.name} » de ${s.artist} est la chanson canadienne la mieux classée, au nᵒ ${s.rank}${ranks ? `, et ${ranks}` : ''}.`,
    ranksAbroad: (parts) => parts.join(', '),
    inMarket: (m, r) => `nᵒ ${r} ${MARKET_IN.fr[m]}`,
    tiles: {
      albums: 'Albums canadiens dans le top 100',
      top10: 'Chansons canadiennes dans le top 10',
      nonMajor: 'Chansons hors des trois majors',
      catalogue: 'Part du catalogue (3 ans et plus)',
      catalogueSub: (us) => `contre ${us} aux États-Unis`,
      fresh: 'Sorties depuis 30 jours',
      artists: 'Artistes canadiens au palmarès',
    },
    coverage: (c, n) => `Nationalité vérifiée pour ${pct(c)} des chansons. ${n ? `Non vérifiés : ${n}.` : ''}`,

    chartTitle: 'Le palmarès, annoté',
    chartDek: 'Les 100 chansons les plus écoutées sur Apple Music au Canada, avec l’origine des artistes, la propriété des étiquettes, l’âge des sorties et leur classement à l’étranger.',
    songs: 'Chansons', albums: 'Albums',
    filters: { all: 'Tout', canadian: 'Canadien', bigger: 'Plus fort ici', indie: 'Hors majors', new: 'Nouveau (≤ 30 jours)', catalogue: 'Catalogue' },
    search: 'Chercher un titre, un artiste ou une étiquette',
    cols: { rank: 'nᵒ', title: 'Titre', genre: 'Genre', released: 'Sortie', label: 'Étiquette', abroad: 'Ailleurs' },
    showAll: (n) => `Afficher les ${n}`, showLess: 'Afficher moins',
    noRows: 'Aucun résultat pour ces filtres.',
    newEntry: 'NOUV.', unverified: 'non vérifié',
    canadianFrom: (city) => (city ? `Canadien · ${city}` : 'Canadien'),

    awayTitle: 'Ici et ailleurs',
    awayDek: 'Chaque point est une chanson du top 100 canadien. Sous la diagonale, elle se classe mieux au Canada que dans l’autre marché; dans la bande du bas, elle n’y est pas classée.',
    compareWith: 'Comparer avec',
    axisCA: 'Rang au Canada', axisOther: (m) => `Rang ${MARKET_IN.fr[m]}`,
    notCharting: 'Hors du top 100',
    legendCA: 'Artiste canadien', legendOther: 'Autre artiste',
    biggerHere: 'Plus fort au Canada', biggerThere: (m) => `Plus fort ${MARKET_IN.fr[m]}`,
    exportsTitle: 'Exportations canadiennes',
    exportsDek: 'Chansons d’artistes canadiens classées aujourd’hui dans les autres marchés.',
    staleNote: (m, d) => `Palmarès ${MARKET_IN.fr[m]} du ${d} (flux du jour indisponible).`,

    scenesTitle: 'Scènes',
    scenesDek: 'D’où viennent les artistes canadiens au palmarès : lieu de naissance pour les artistes solo, ville de formation pour les groupes.',
    artistsN: (n) => `${n} artiste${n === 1 ? '' : 's'}`,

    labelsTitle: 'Qui publie',
    labelsDek: 'Propriété déduite de la ligne de droits d’auteur de chaque sortie. « Distribué par une major » : étiquette indépendante dont la distribution appartient à une major.',
    tier: { major: 'Major', 'major-distributed': 'Distribué par une major', independent: 'Indépendant', unknown: 'Inconnu' },
    barAll: 'Top 100 canadien', barCA: 'Artistes canadiens seulement',
    topLabels: 'Étiquettes au palmarès', canadianLabel: 'Étiquette canadienne', parentCo: 'Société mère',
    songsN: (n) => `${n} chanson${n === 1 ? '' : 's'}`,

    soundTitle: 'Le son du palmarès',
    soundDek: 'Ce que le Canada écoute par rapport aux États-Unis, par genre et selon l’âge de la musique.',
    genreTitle: 'Part par genre, Canada c. É.-U.',
    ageTitle: 'Âge des sorties, Canada c. É.-U.',
    age: { new: '≤ 30 jours', recent: '1 à 12 mois', established: '1 à 3 ans', catalogue: '3 ans et +' },
    ca: 'Canada', us: 'É.-U.',
    leans: (g, d) => `Le Canada penche vers ${g} (+${Math.round(d * 100)} pts)`,

    radarTitle: 'Radar des sorties',
    radarDek: 'Sorties récentes et à venir des artistes canadiens au palmarès et des anciens du prix Polaris : le calendrier d’où part une conversation avec les étiquettes.',
    when: { upcoming: 'À venir', thisWeek: 'Cette semaine', recent: '60 derniers jours' },
    tags: { chart: 'Au palmarès', polaris: 'Anciens du Polaris', editor: 'Liste de suivi' },
    kind: { single: 'Simple', ep: 'EP', album: 'Album' },
    inDays: (d) => (d === 1 ? 'demain' : `dans ${d} jours`), daysAgo: (d) => (d === 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} jours`),

    pitchesTitle: 'Occasions de programmation',
    pitchesDek: 'Générées à partir des données du jour. Chacune est un point de départ : ouvrez-la, précisez l’angle, choisissez les pistes et exportez une proposition pour l’équipe éditoriale.',
    draft: 'Rédiger', evidence: 'Pourquoi maintenant', partners: 'Étiquettes partenaires', tracksN: (n) => `${n} pistes`,
    opp: {
      homeHeat: (p) => ({
        title: `Plus fort ici : ${p.n} chansons que le Canada préfère aux États-Unis`,
        dek: `${p.n} chansons du top 50 canadien sont absentes du palmarès américain ou 25 places plus bas${p.canadian ? `, dont ${p.canadian} d’artistes canadiens` : ''}.`,
        format: 'Liste de lecture · « Plus fort au Canada »',
        angle: 'Le public canadien choisit ses propres succès. Une liste « Plus fort au Canada » mettrait en valeur les chansons que le pays porte avant ou plutôt que les États-Unis, avec les artistes d’ici à l’avant-plan. C’est un angle que seul ce marché peut revendiquer.',
      }),
      climbers: (p) => ({
        title: `En hausse : ${p.n} chanson${p.n === 1 ? '' : 's'} canadienne${p.n === 1 ? '' : 's'}`,
        dek: `${p.debuts ? `${p.debuts} nouvelle${p.debuts === 1 ? '' : 's'} entrée${p.debuts === 1 ? '' : 's'} et ` : ''}de fortes progressions depuis hier.`,
        format: 'Placement nouveautés · réseaux sociaux',
        angle: 'L’élan se construit pour ces titres canadiens. Les appuyer maintenant nous place tôt dans l’histoire.',
      }),
      releaseWindow: (p, t) => ({
        title: `${p.artist} — « ${p.title} »`,
        dek: `${t.kind[p.kind] || ''} ${p.days > 0 ? `sort ${t.inDays(p.days)}` : `paru ${t.daysAgo(-p.days)}`} · ${p.watch === 'chart' ? `actuellement nᵒ ${p.chartRank}` : p.watch === 'polaris' ? 'ancien du prix Polaris' : 'sur la liste de suivi'}.`,
        format: 'Sortie prioritaire · nouveautés',
        angle: `Nouvelle sortie de ${p.artist} : une conversation avec l’étiquette s’impose sur le placement de la semaine de sortie, la pochette et un court récit pour la page éditoriale.`,
      }),
      scene: (p) => ({
        title: `Fait à ${p.cityFr || p.city} : ${p.artists} artistes au palmarès`,
        dek: `${p.cityFr || p.city} compte ${p.artists} artistes au palmarès aujourd’hui, de quoi bâtir une liste de ville avec un vrai point de vue.`,
        format: 'Liste de lecture · ville',
        angle: `Une liste « Fait à ${p.cityFr || p.city} » relie la présence au palmarès à un lieu. Mélangez les succès actuels, le catalogue de la ville et ses artistes émergents.`,
      }),
      genreLean: (p) => ({
        title: `Le Canada surindexe sur ${p.genre}`,
        dek: `${pct(p.ca)} du top 100 canadien est ${p.genre}, contre ${pct(p.us)} aux États-Unis${p.canadian ? `; ${p.canadian} de ces chansons sont d’artistes canadiens` : ''}.`,
        format: 'Pôle de genre · liste éditoriale',
        angle: `Le genre ${p.genre} performe davantage au Canada qu’aux États-Unis : un public qui mérite une destination canadienne dédiée, et des artistes canadiens prêts à en profiter.`,
      }),
      indieCanada: (p) => ({
        title: `Indépendant et canadien : ${p.n} sur ${p.of}`,
        dek: `${p.n} des ${p.of} chansons canadiennes au palmarès sont publiées hors des trois grandes majors.`,
        format: 'Vitrine éditoriale · indépendant',
        angle: 'Les sorties canadiennes indépendantes tiennent tête aux campagnes des majors. Une vitrine raconte cette histoire et renforce les liens avec les étiquettes indépendantes d’ici.',
      }),
      exports: (p) => ({
        title: `Exportations canadiennes : ${p.n} chansons à l’étranger`,
        dek: `${p.n} chansons d’artistes canadiens sont classées dans au moins deux des ${p.markets} marchés de comparaison.`,
        format: 'Récit éditorial · réseaux sociaux',
        angle: 'Les artistes canadiens voyagent. Un récit « Le Canada dans le monde », appuyé par les classements à l’étranger, fait un moment éditorial fort.',
      }),
      catalogue: (p) => ({
        title: `Moment catalogue : ${p.n} classiques dans le top 50`,
        dek: `${p.n} chansons de plus de 3 ans figurent dans le top 50 canadien; la plus ancienne a ${p.oldest} ans.`,
        format: 'Liste catalogue · saisonnier',
        angle: 'Le catalogue génère une vraie écoute en ce moment. Le présenter avec du contexte (pourquoi maintenant, ce qui le porte) transforme l’écoute passive en moment éditorial.',
      }),
      polaris: (p) => ({
        title: `Anciens du Polaris, nouveautés : ${p.n} sorties`,
        dek: `${p.n} sorties depuis 60 jours de lauréats et finalistes du prix de musique Polaris.`,
        format: 'Liste de lecture · indépendant canadien',
        angle: 'Les anciens du Polaris comptent parmi les artistes les plus salués au pays. Une liste évolutive de leurs nouveautés fait vivre ce catalogue et offre une vitrine à la musique indépendante acclamée.',
      }),
    },

    pitch: {
      title: 'Proposition', working: 'Titre de travail', format: 'Format', timing: 'Calendrier', angle: 'L’angle',
      evidence: 'Pourquoi maintenant (données)', tracks: 'Liste de pistes proposée', partners: 'Étiquettes à impliquer', notes: 'Notes',
      by: 'Préparé par', yourName: 'Votre nom', copy: 'Copier le texte', download: 'Télécharger .md', print: 'Imprimer', close: 'Fermer',
      copied: 'Copié', now: 'Cette semaine', sources: 'Sources', saved: 'Brouillon enregistré sur cet appareil',
    },

    methodTitle: 'Méthode et sources',
    method: [
      ['Palmarès', 'Flux publics « les plus écoutés » d’Apple Music pour le Canada (chansons et albums) et quatre marchés de comparaison : États-Unis, Royaume-Uni, Australie et France. Récupérés chaque jour par une tâche planifiée; l’historique s’accumule depuis la première exécution.'],
      ['Qui est canadien', 'Un artiste est canadien si Wikidata indique la citoyenneté ou l’origine canadienne, une formation au Canada pour un groupe, ou une naissance au Canada. L’appariement se fait par l’identifiant d’artiste Apple Music exact (Wikidata P2850), donc sans deviner à partir des noms. MusicBrainz sert de solution de rechange. Ce qui reste inconnu est affiché comme non vérifié plutôt que deviné. Cela reprend le critère « A » (artiste) du système MAPL du CRTC.'],
      ['Étiquettes', 'Déduites de la ligne de droits d’auteur de chaque sortie dans le catalogue Apple. Quand plusieurs sociétés sont nommées, la dernière société mère l’emporte. Les enregistrements détenus par l’artiste sont classés tels qu’écrits, sauf correction éditoriale.'],
      ['Âge des sorties', 'Mesuré à partir de la date de sortie du flux. Certaines chansons sont rééditées : le « catalogue » est donc un minimum.'],
      ['Corrections', 'Les corrections éditoriales sont dans editorial/overrides.json et s’appliquent à chaque mise à jour. La liste de suivi est dans editorial/watchlist.json.'],
      ['Limites', 'Les palmarès Apple Music reflètent les auditeurs d’Apple Music, pas tout le marché. Ce sont des instantanés : ils servent à lancer une conversation éditoriale, pas à la conclure.'],
    ],
    footer: 'Projet de recherche indépendant, sans affiliation avec Apple. Palmarès © Apple; données d’artistes de Wikidata (CC0) et MusicBrainz (CC0).',
  },
};

export const MARKET = {
  en: { ca: 'Canada', us: 'the US', gb: 'the UK', au: 'Australia', fr: 'France' },
  fr: { ca: 'Canada', us: 'États-Unis', gb: 'Royaume-Uni', au: 'Australie', fr: 'France' },
};
export const MARKET_SHORT = { ca: 'CA', us: 'US', gb: 'UK', au: 'AU', fr: 'FR' };
const MARKET_IN = { fr: { ca: 'au Canada', us: 'aux États-Unis', gb: 'au Royaume-Uni', au: 'en Australie', fr: 'en France' } };

let lang = 'en';
try {
  lang = localStorage.getItem('cancon-lang') || ((navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en');
} catch { /* storage unavailable */ }
export const getLang = () => lang;
export const setLang = (l) => { lang = l; try { localStorage.setItem('cancon-lang', l); } catch { /* ignore */ } };
export const t = () => STR[lang];
