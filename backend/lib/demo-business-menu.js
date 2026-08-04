'use strict';

const { randomUUID } = require('crypto');

/** Shared Unsplash food/drink photos for demo menu items. */
const IMG = {
  bruschetta: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
  chicken: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80',
  paella: 'https://images.unsplash.com/photo-1534080561176-c4e71ab63dfe?w=600&q=80',
  steak: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80',
  tiramisu: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
  baklava: 'https://images.unsplash.com/photo-1598110750624-207050bd30e3?w=600&q=80',
  iceCream: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80',
  espresso: 'https://images.unsplash.com/photo-1510591509090-a183fc9d4ba0?w=600&q=80',
  cappuccino: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80',
  latte: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80',
  tea: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80',
  lemonade: 'https://images.unsplash.com/photo-1523677011782-c13c859a88c4?w=600&q=80',
  avocado: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
  toast: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
  cheesecake: 'https://images.unsplash.com/photo-1533134242443-d176fd82f361?w=600&q=80',
  brownie: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80',
  mojito: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80',
  spritz: 'https://images.unsplash.com/photo-1560512823-829485b0bf34?w=600&q=80',
  negroni: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80',
  margarita: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
  beer: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80',
  wine: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
  gin: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  nachos: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80',
  wings: 'https://images.unsplash.com/photo-1527477396000-e27173b8ba9f?w=600&q=80',
  olives: 'https://images.unsplash.com/photo-1571066811602-716837d681de?w=600&q=80',
  eggs: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  omelette: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80',
  pancakes: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  granola: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80',
  club: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
  shakshuka: 'https://images.unsplash.com/photo-1590412209527-4dd71e5e8a0c?w=600&q=80',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd341b88?w=600&q=80',
  smoothie: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  pepperoni: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80',
  cheesePizza: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?w=600&q=80',
  prosciutto: 'https://images.unsplash.com/photo-1571407970349-bc81e7e336a8?w=600&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  cheeseBurger: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
  fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80',
  soda: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600&q=80',
  water: 'https://images.unsplash.com/photo-1548832633-5e3c9d1b8c0a?w=600&q=80',
  chocolateCake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
  fruitCake: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80',
  eclair: 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=600&q=80',
  macaron: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&q=80',
  cookie: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80',
  cannoli: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=600&q=80',
};

/**
 * Sample menus by business category — ~10 products across 3 categories (3+ each).
 */
const MENUS_BY_CATEGORY = {
  restorant: {
    categories: ['Paragjykimet', 'Kryesoret', 'Ëmbëlsira'],
    items: [
      { cat: 0, name: 'Bruschetta me domate', description: 'Bukë e pjekur, domate, borzilok dhe vaj ulliri.', price: 4.5, image: IMG.bruschetta },
      { cat: 0, name: 'Sallatë greke', description: 'Kastravec, domate, ullinj, djathë feta.', price: 5.5, image: IMG.salad },
      { cat: 0, name: 'Supë e ditës', description: 'Supë e freskët sezonale.', price: 3.5, image: IMG.soup },
      { cat: 1, name: 'Peshk i ditës', description: 'Peshk i freskët me perime të pjekura.', price: 14, image: IMG.fish },
      { cat: 1, name: 'Fileto pule', description: 'Me salcë kremoze dhe oriz.', price: 9.5, image: IMG.chicken },
      { cat: 1, name: 'Paella me fruta deti', description: 'Oriz, karkalec, midhje dhe erëza.', price: 16, image: IMG.paella },
      { cat: 1, name: 'Biftek viçi', description: 'Me patate të pjekura dhe salcë piper.', price: 18, image: IMG.steak },
      { cat: 2, name: 'Tiramisu', description: 'Klasike italiane me mascarpone.', price: 4.5, image: IMG.tiramisu },
      { cat: 2, name: 'Bakllava', description: 'Me arra dhe mjaltë.', price: 3.5, image: IMG.baklava },
      { cat: 2, name: 'Akullore shtëpie', description: 'Tri shije të ditës.', price: 3, image: IMG.iceCream },
    ],
  },
  kafe: {
    categories: ['Pije', 'Ushqim i lehtë', 'Ëmbëlsira'],
    items: [
      { cat: 0, name: 'Espresso', description: 'Kafe e fortë klasike.', price: 1.2, image: IMG.espresso },
      { cat: 0, name: 'Cappuccino', description: 'Espresso me qumësht të shkumëzuar.', price: 1.8, image: IMG.cappuccino },
      { cat: 0, name: 'Latte', description: 'Kafe me qumësht të bollshëm.', price: 2, image: IMG.latte },
      { cat: 0, name: 'Limonadë shtëpie', description: 'Me limon të freskët dhe mentë.', price: 2.5, image: IMG.lemonade },
      { cat: 1, name: 'Sandwich me avokado', description: 'Bukë e plotë, avokado, vezë.', price: 4.5, image: IMG.avocado },
      { cat: 1, name: 'Croissant me djathë', description: 'I ngrohtë, me djathë të shkrirë.', price: 2.8, image: IMG.croissant },
      { cat: 1, name: 'Toast me gjalpë & reçel', description: 'Bukë e pjekur, gjalpë, reçel shtëpie.', price: 2.2, image: IMG.toast },
      { cat: 2, name: 'Cheesecake', description: 'Me fruta të kuqe.', price: 3.8, image: IMG.cheesecake },
      { cat: 2, name: 'Brownie me çokollatë', description: 'I ngrohtë, me akullore.', price: 3.5, image: IMG.brownie },
      { cat: 2, name: 'Croissant me çokollatë', description: 'I pjekur i freskët.', price: 2, image: IMG.croissant },
    ],
  },
  bar: {
    categories: ['Koktejle', 'Pije', 'Snacks'],
    items: [
      { cat: 0, name: 'Mojito', description: 'Rum, mentë, limon, soda.', price: 6, image: IMG.mojito },
      { cat: 0, name: 'Aperol Spritz', description: 'Aperol, prosecco, soda.', price: 5.5, image: IMG.spritz },
      { cat: 0, name: 'Negroni', description: 'Gin, Campari, vermouth.', price: 6.5, image: IMG.negroni },
      { cat: 0, name: 'Margarita', description: 'Tequila, triple sec, limon.', price: 6, image: IMG.margarita },
      { cat: 1, name: 'Birrë lokale', description: '0.5L e ftohtë.', price: 2.5, image: IMG.beer },
      { cat: 1, name: 'Verë e kuqe / e bardhë', description: 'Gotë e shtëpisë.', price: 3.5, image: IMG.wine },
      { cat: 1, name: 'Gin Tonic', description: 'Gin premium me tonic.', price: 5, image: IMG.gin },
      { cat: 2, name: 'Nachos me djathë', description: 'Me salsa dhe guacamole.', price: 5, image: IMG.nachos },
      { cat: 2, name: 'Krahë pule', description: 'Me salcë BBQ.', price: 6.5, image: IMG.wings },
      { cat: 2, name: 'Olive & arra', description: 'Për me pije.', price: 3, image: IMG.olives },
    ],
  },
  brunch: {
    categories: ['Mëngjes', 'Brunch', 'Pije'],
    items: [
      { cat: 0, name: 'Veza Benedict', description: 'Me sallam dhe salcë hollandaise.', price: 6.5, image: IMG.eggs },
      { cat: 0, name: 'Omletë me perime', description: 'Veza, kërpudha, djathë, spinaq.', price: 5, image: IMG.omelette },
      { cat: 0, name: 'Pancakes me mjaltë', description: 'Me fruta të freskëta.', price: 5.5, image: IMG.pancakes },
      { cat: 1, name: 'Avocado toast', description: 'Bukë sourdough, avokado, vezë poçe.', price: 5.5, image: IMG.avocado },
      { cat: 1, name: 'Bowl me granola', description: 'Jogurt, granola, fruta.', price: 4.5, image: IMG.granola },
      { cat: 1, name: 'Sandwich club', description: 'Pule, bekon, sallatë, majonez.', price: 6, image: IMG.club },
      { cat: 1, name: 'Shakshuka', description: 'Veza në salcë domatesh.', price: 5.5, image: IMG.shakshuka },
      { cat: 2, name: 'Fresh orange juice', description: 'Lëng portokalli i saposhtrydhur.', price: 3, image: IMG.juice },
      { cat: 2, name: 'Smoothie i ditës', description: 'Fruta sezonale.', price: 3.5, image: IMG.smoothie },
      { cat: 2, name: 'Flat white', description: 'Kafe me qumësht velvety.', price: 2.2, image: IMG.latte },
    ],
  },
  'piceri-fast-food': {
    categories: ['Pica', 'Fast food', 'Pije'],
    items: [
      { cat: 0, name: 'Margherita', description: 'Domate, mozzarella, borzilok.', price: 6, image: IMG.pizza },
      { cat: 0, name: 'Pepperoni', description: 'Domate, mozzarella, pepperoni.', price: 7.5, image: IMG.pepperoni },
      { cat: 0, name: 'Quattro formaggi', description: 'Katër djathëra.', price: 8, image: IMG.cheesePizza },
      { cat: 0, name: 'Prosciutto e funghi', description: 'Prosciutto, kërpudha, mozzarella.', price: 8.5, image: IMG.prosciutto },
      { cat: 1, name: 'Burger klasik', description: 'Viç, sallatë, domate, salcë.', price: 6.5, image: IMG.burger },
      { cat: 1, name: 'Burger me djathë', description: 'Viç, cheddar, bekon.', price: 7.5, image: IMG.cheeseBurger },
      { cat: 1, name: 'Patate të skuqura', description: 'Me ketchup / majonez.', price: 2.5, image: IMG.fries },
      { cat: 2, name: 'Coca-Cola / Fanta', description: '0.33L.', price: 1.5, image: IMG.soda },
      { cat: 2, name: 'Ujë mineral', description: '0.5L.', price: 1, image: IMG.water },
      { cat: 2, name: 'Wrap me pule', description: 'Pule, sallatë, salcë jogurti.', price: 5.5, image: IMG.wrap },
    ],
  },
  pasticeri: {
    categories: ['Torta', 'Ëmbëlsira', 'Pije'],
    items: [
      { cat: 0, name: 'Tortë çokollate', description: 'Fetë e freskët e ditës.', price: 3.5, image: IMG.chocolateCake },
      { cat: 0, name: 'Tortë me fruta', description: 'Krema dhe fruta sezonale.', price: 3.8, image: IMG.fruitCake },
      { cat: 0, name: 'Cheesecake', description: 'Me reçel frutash.', price: 3.5, image: IMG.cheesecake },
      { cat: 1, name: 'Croissant me çokollatë', description: 'I pjekur në mëngjes.', price: 1.8, image: IMG.croissant },
      { cat: 1, name: 'Eclair', description: 'Me krem pasticcier.', price: 2.2, image: IMG.eclair },
      { cat: 1, name: 'Makarona', description: 'Tri shije të përzgjedhura.', price: 2.5, image: IMG.macaron },
      { cat: 1, name: 'Kurabie me arra', description: 'Të shtëpisë.', price: 1.5, image: IMG.cookie },
      { cat: 2, name: 'Kafe espresso', description: 'Me ëmbëlsirën tuaj.', price: 1.2, image: IMG.espresso },
      { cat: 2, name: 'Çaj i nxehtë', description: 'Zgjidhni aromën.', price: 1.5, image: IMG.tea },
      { cat: 2, name: 'Cannoli', description: 'Me ricotta dhe çokollatë.', price: 2.8, image: IMG.cannoli },
    ],
  },
};

const FALLBACK = MENUS_BY_CATEGORY.kafe;

/**
 * Build menu_categories + menu_items JSON for a business category.
 */
function buildDemoBusinessMenu(category) {
  const pack = MENUS_BY_CATEGORY[category] || FALLBACK;
  const categories = pack.categories.map((name, i) => ({
    id: randomUUID(),
    name,
    sortOrder: i,
  }));
  const items = pack.items.map((row, i) => ({
    id: randomUUID(),
    categoryId: categories[row.cat]?.id || categories[0].id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: 'EUR',
    imageUrl: row.image || null,
    sortOrder: i,
  }));
  return { menuCategories: categories, menuItems: items };
}

module.exports = { buildDemoBusinessMenu, MENUS_BY_CATEGORY };
