'use strict';

const { randomUUID } = require('crypto');

function zone(name, slug) {
  return { id: randomUUID(), name, slug };
}

/**
 * All 61 Albanian municipalities (bashki), with common search names.
 * Major cities keep sample zones; others start with an empty zones array.
 */
function buildAlbaniaCities() {
  const majorZones = {
    tirane: [
      zone('Blloku', 'blloku'),
      zone('Komuna e Parisit', 'komuna-e-parisit'),
      zone('Kombinat', 'kombinat'),
      zone('Astir', 'astir'),
      zone('Lapraka', 'lapraka'),
      zone('Kinostudio', 'kinostudio'),
      zone('Don Bosko', 'don-bosko'),
      zone('Ali Demi', 'ali-demi'),
      zone('Yzberisht', 'yzberisht'),
      zone('Kashar', 'kashar'),
    ],
    durres: [
      zone('Plazhi', 'plazhi'),
      zone('Qendra', 'qendra'),
      zone('Currila', 'currila'),
      zone('Shkozet', 'shkozet'),
      zone('Spitallë', 'spitalle'),
    ],
    vlore: [
      zone('Lungomare', 'lungomare'),
      zone('Qendra', 'qendra'),
      zone('Uji i Ftohtë', 'uji-i-ftohte'),
      zone('Skelë', 'skele'),
    ],
    shkoder: [
      zone('Qendra', 'qendra'),
      zone('Bahçallëk', 'bahcalleek'),
      zone('Dobrac', 'dobrac'),
    ],
    elbasan: [
      zone('Qendra', 'qendra'),
      zone('Lagjia 5 Maji', 'lagjia-5-maji'),
      zone('Steel', 'steel'),
    ],
    fier: [zone('Qendra', 'qendra'), zone('Apolloni', 'apolloni')],
    korce: [zone('Qendra', 'qendra'), zone('Rinia', 'rinia')],
    berat: [zone('Qendra', 'qendra'), zone('Mangalem', 'mangalem')],
    sarande: [zone('Qendra', 'qendra'), zone('Limani', 'limani')],
    gjirokaster: [zone('Qendra', 'qendra'), zone('Pazarri i Vjetër', 'pazarri-i-vjeter')],
    kavaje: [zone('Qendra', 'qendra')],
    lushnje: [zone('Qendra', 'qendra')],
    pogradec: [zone('Qendra', 'qendra'), zone('Lungomare', 'lungomare')],
    lezhe: [zone('Qendra', 'qendra')],
    kukes: [zone('Qendra', 'qendra')],
    kamez: [zone('Qendra', 'qendra'), zone('Bathore', 'bathore')],
  };

  /** Official bashki names people search for in classifieds. */
  const names = [
    'Belsh',
    'Berat',
    'Bulqizë',
    'Cërrik',
    'Delvinë',
    'Devoll',
    'Dibër',
    'Dimal',
    'Divjakë',
    'Dropull',
    'Durrës',
    'Elbasan',
    'Fier',
    'Finiq',
    'Fushë-Arrëz',
    'Gjirokastër',
    'Gramsh',
    'Has',
    'Himarë',
    'Kamëz',
    'Kavajë',
    'Këlcyrë',
    'Klos',
    'Kolonjë',
    'Konispol',
    'Korçë',
    'Krujë',
    'Kuçovë',
    'Kukës',
    'Kurbin',
    'Lezhë',
    'Libohovë',
    'Librazhd',
    'Lushnjë',
    'Malësi e Madhe',
    'Maliq',
    'Mallakastër',
    'Mat',
    'Memaliaj',
    'Mirditë',
    'Patos',
    'Peqin',
    'Përmet',
    'Pogradec',
    'Poliçan',
    'Prrenjas',
    'Pukë',
    'Pustec',
    'Roskovec',
    'Rrogozhinë',
    'Sarandë',
    'Selenicë',
    'Shijak',
    'Shkodër',
    'Skrapar',
    'Tepelenë',
    'Tiranë',
    'Tropojë',
    'Vau i Dejës',
    'Vlorë',
    'Vorë',
  ];

  return names.map((name) => {
    const slug = slugify(name);
    return {
      name,
      slug,
      zones: majorZones[slug] ? majorZones[slug] : [],
    };
  });
}

function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  buildAlbaniaCities,
  slugify,
};
