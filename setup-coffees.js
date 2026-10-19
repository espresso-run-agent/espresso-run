/* Roasters' own published espresso recipes, one per coffee (built by tools/site/coffees.py from
   notes/roaster-recipes.json, checked 2026-10-19; each entry links the page it came from). Classic script. */
(function (root) {
  'use strict';
  const COFFEES = [
{"id":"allpress-art-espresso","roaster":"Allpress Espresso","coffee":"A.R.T. Espresso","roast":null,"dose":18,"yield":40,"ratio":2.22,"time":[28,32],"temp":94,"url":"https://allpress.com/en-au/shop/coffee/art-espresso-roast"},
{"id":"allpress-espresso-blend","roaster":"Allpress Espresso","coffee":"Allpress Espresso Blend","roast":"medium","dose":18,"yield":40,"ratio":2.22,"time":[28,32],"temp":94,"url":"https://allpress.com/en-au/shop/coffee/allpress-espresso-blend"},
{"id":"allpress-bm-organic","roaster":"Allpress Espresso","coffee":"B.M. Organic","roast":"medium","dose":18,"yield":40,"ratio":2.22,"time":[28,32],"temp":94,"url":"https://allpress.com/en-au/shop/coffee/browns-mill-organic"},
{"id":"allpress-house-decaf","roaster":"Allpress Espresso","coffee":"House Decaf","roast":"medium","dose":18,"yield":40,"ratio":2.22,"time":[28,32],"temp":94,"url":"https://allpress.com/en-au/shop/coffee/haus-decaf-blend"},
{"id":"allpress-the-good-brew","roaster":"Allpress Espresso","coffee":"The Good Brew","roast":null,"dose":18,"yield":40,"ratio":2.22,"time":[28,32],"temp":94,"url":"https://allpress.com/en-au/shop/coffee/the-good-brew"},
{"id":"assembly-espresso-blend","roaster":"Assembly Coffee","coffee":"Assembly Espresso Blend","roast":null,"dose":18,"yield":36,"ratio":2.0,"time":[28,30],"temp":94,"url":"https://assemblycoffee.co.uk/products/assembly-espresso-blend-espresso-200g"},
{"id":"assembly-house-espresso","roaster":"Assembly Coffee","coffee":"Assembly House Espresso","roast":null,"dose":18,"yield":36,"ratio":2.0,"time":[28,30],"temp":94,"url":"https://assemblycoffee.co.uk/products/assembly-house-single-espresso-espresso-200g"},
{"id":"blue-bottle-17ft-ceiling","roaster":"Blue Bottle Coffee","coffee":"17ft Ceiling Espresso","roast":"dark","dose":20,"yield":22,"ratio":1.1,"time":[28,38],"temp":null,"url":"https://bluebottlecoffee.com/us/eng/product/17ft-ceiling"},
{"id":"blue-bottle-hayes-valley","roaster":"Blue Bottle Coffee","coffee":"Hayes Valley Espresso","roast":"dark","dose":20,"yield":22,"ratio":1.1,"time":[28,38],"temp":null,"url":"https://bluebottlecoffee.com/us/eng/product/hayes-valley-espresso"},
{"id":"blue-bottle-opascope","roaster":"Blue Bottle Coffee","coffee":"Opascope Espresso","roast":"light","dose":20,"yield":22,"ratio":1.1,"time":[28,38],"temp":null,"url":"https://bluebottlecoffee.com/us/eng/product/opascope"},
{"id":"counter-culture-big-trouble","roaster":"Counter Culture Coffee","coffee":"Big Trouble","roast":null,"dose":18,"yield":null,"ratio":2.0,"time":[25,35],"temp":null,"url":"https://counterculturecoffee.com/products/big-trouble"},
{"id":"counter-culture-forty-six","roaster":"Counter Culture Coffee","coffee":"Forty-Six","roast":"dark","dose":18,"yield":null,"ratio":2.0,"time":[25,35],"temp":null,"url":"https://counterculturecoffee.com/products/12-oz-forty-six"},
{"id":"counter-culture-slow-motion","roaster":"Counter Culture Coffee","coffee":"Slow Motion (decaf)","roast":"medium","dose":18,"yield":null,"ratio":2.0,"time":[25,35],"temp":null,"url":"https://counterculturecoffee.com/products/12-oz-slow-motion"},
{"id":"illy-espresso-beans","roaster":"illy","coffee":"illy espresso, beans or ground (e.g. Classico)","roast":null,"dose":7,"yield":25,"ratio":3.57,"time":[25,30],"temp":89.5,"url":"https://www.illy.com/content/dam/channels/website/professional/usa/professional-standtogether/Espresso-Preparation-Guide-Beans_5-2020.pdf"},
{"id":"intelligentsia-black-cat-analog","roaster":"Intelligentsia","coffee":"Black Cat Analog Espresso","roast":null,"dose":18,"yield":45,"ratio":2.5,"time":null,"temp":null,"url":"https://www.intelligentsia.com/products/black-cat-analog-espresso"},
{"id":"intelligentsia-black-cat-classic","roaster":"Intelligentsia","coffee":"Black Cat Classic Espresso","roast":null,"dose":18,"yield":45,"ratio":2.5,"time":null,"temp":null,"url":"https://www.intelligentsia.com/products/black-cat-classic-espresso"},
{"id":"intelligentsia-decaf-black-cat","roaster":"Intelligentsia","coffee":"Decaf Black Cat Espresso","roast":null,"dose":18,"yield":45,"ratio":2.5,"time":null,"temp":null,"url":"https://www.intelligentsia.com/products/decaf-black-cat-espresso"},
{"id":"intelligentsia-organic-black-cat","roaster":"Intelligentsia","coffee":"Organic Black Cat Espresso","roast":null,"dose":18,"yield":45,"ratio":2.5,"time":null,"temp":null,"url":"https://www.intelligentsia.com/products/organic-black-cat-espresso"},
{"id":"onyx-eclipse","roaster":"Onyx Coffee Lab","coffee":"Eclipse","roast":"dark","dose":20,"yield":47,"ratio":2.35,"time":[25,25],"temp":null,"url":"https://onyxcoffeelab.com/products/eclipse"},
{"id":"onyx-geometry","roaster":"Onyx Coffee Lab","coffee":"Geometry","roast":"light","dose":20,"yield":47,"ratio":2.35,"time":[26,26],"temp":null,"url":"https://onyxcoffeelab.com/products/geometry"},
{"id":"onyx-monarch","roaster":"Onyx Coffee Lab","coffee":"Monarch","roast":"dark","dose":19,"yield":47,"ratio":2.47,"time":[23,23],"temp":null,"url":"https://onyxcoffeelab.com/products/monarch"},
{"id":"onyx-power-nap","roaster":"Onyx Coffee Lab","coffee":"Power Nap","roast":"medium","dose":19,"yield":45,"ratio":2.37,"time":[25,25],"temp":null,"url":"https://onyxcoffeelab.com/products/power-nap"},
{"id":"onyx-sources","roaster":"Onyx Coffee Lab","coffee":"Sources","roast":null,"dose":20,"yield":45,"ratio":2.25,"time":[25,25],"temp":null,"url":"https://onyxcoffeelab.com/products/sources"},
{"id":"onyx-southern-weather","roaster":"Onyx Coffee Lab","coffee":"Southern Weather","roast":"medium","dose":20,"yield":45,"ratio":2.25,"time":[25,25],"temp":null,"url":"https://onyxcoffeelab.com/products/southern-weather"},
{"id":"onyx-tropical-weather","roaster":"Onyx Coffee Lab","coffee":"Tropical Weather","roast":"light","dose":19,"yield":45,"ratio":2.37,"time":[25,25],"temp":null,"url":"https://onyxcoffeelab.com/products/tropical-weather"},
{"id":"origin-decaf","roaster":"Origin Coffee Roasters","coffee":"Decaf (Atlas)","roast":null,"dose":18,"yield":33,"ratio":1.83,"time":[29,32],"temp":null,"url":"https://www.origincoffee.co.uk/products/decaf-coffee-beans"},
{"id":"origin-pathfinder","roaster":"Origin Coffee Roasters","coffee":"Pathfinder","roast":"light","dose":17.7,"yield":38,"ratio":2.15,"time":[28,28],"temp":null,"url":"https://www.origincoffee.co.uk/products/pathfinder"},
{"id":"origin-resolute","roaster":"Origin Coffee Roasters","coffee":"Resolute","roast":null,"dose":18,"yield":33,"ratio":1.83,"time":[29,32],"temp":null,"url":"https://www.origincoffee.co.uk/products/resolute"},
{"id":"origin-stronghold","roaster":"Origin Coffee Roasters","coffee":"Stronghold","roast":null,"dose":17.5,"yield":40,"ratio":2.29,"time":[28,28],"temp":null,"url":"https://www.origincoffee.co.uk/products/stronghold"},
{"id":"ozone-hodson","roaster":"Ozone Coffee (formerly Has Bean)","coffee":"Hodson (formerly Has Bean Blake)","roast":null,"dose":17.5,"yield":38,"ratio":2.17,"time":[28,32],"temp":null,"url":"https://ozonecoffee.co.uk/products/hodson"},
{"id":"ozone-our-house","roaster":"Ozone Coffee (formerly Has Bean)","coffee":"Our House (formerly Has Bean Jailbreak)","roast":null,"dose":17.5,"yield":34,"ratio":1.94,"time":[28,32],"temp":null,"url":"https://ozonecoffee.co.uk/products/our-house"},
{"id":"ozone-seasonal-blend","roaster":"Ozone Coffee (formerly Has Bean)","coffee":"Seasonal Blend (formerly Has Bean Jabberwocky)","roast":"medium","dose":18,"yield":38,"ratio":2.11,"time":[28,32],"temp":null,"url":"https://ozonecoffee.co.uk/products/seasonal-blend"},
{"id":"proud-mary-angel-wings","roaster":"Proud Mary Coffee","coffee":"Angel Wings Blend","roast":null,"dose":null,"yield":null,"ratio":2.0,"time":null,"temp":null,"url":"https://proudmarycoffee.com/products/angel-wings"},
{"id":"proud-mary-honeysuckle","roaster":"Proud Mary Coffee","coffee":"Honeysuckle Blend","roast":null,"dose":null,"yield":null,"ratio":2.5,"time":null,"temp":null,"url":"https://proudmarycoffee.com/products/honeysuckle-blend"},
{"id":"ritual-sweet-tooth-sochiapam","roaster":"Ritual Coffee Roasters","coffee":"Sweet Tooth Espresso (current lot: Sochiapam, Mexico)","roast":null,"dose":17.5,"yield":30,"ratio":1.71,"time":[30,30],"temp":null,"url":"https://ritualcoffee.com/shop/coffee/sweet-tooth-espresso-sochiapam/"},
{"id":"square-mile-red-brick","roaster":"Square Mile Coffee Roasters","coffee":"Red Brick","roast":"medium","dose":19,"yield":null,"ratio":2.0,"time":[28,32],"temp":94,"url":"https://shop.squaremilecoffee.com/products/red-brick"},
{"id":"verve-aster","roaster":"Verve Coffee Roasters","coffee":"Aster","roast":"medium","dose":19.85,"yield":29.5,"ratio":1.49,"time":[22,26],"temp":null,"url":"https://www.vervecoffee.com/products/aster"},
{"id":"verve-buena-vista","roaster":"Verve Coffee Roasters","coffee":"Buena Vista Dark Roast","roast":"dark","dose":18.85,"yield":34.5,"ratio":1.83,"time":[23,27],"temp":null,"url":"https://www.vervecoffee.com/products/buena-vista-dark-roast"},
{"id":"verve-sermon","roaster":"Verve Coffee Roasters","coffee":"Sermon","roast":"medium","dose":19.85,"yield":30,"ratio":1.51,"time":[23,26],"temp":null,"url":"https://www.vervecoffee.com/products/sermon"},
{"id":"verve-streetlevel","roaster":"Verve Coffee Roasters","coffee":"Streetlevel","roast":"medium","dose":19.8,"yield":29.5,"ratio":1.49,"time":[23,26],"temp":null,"url":"https://www.vervecoffee.com/products/streetlevel"},
{"id":"workshop-article","roaster":"Workshop Coffee","coffee":"Article","roast":null,"dose":18,"yield":36,"ratio":2.0,"time":[28,30],"temp":93.5,"url":"https://workshopcoffee.com/products/article"},
{"id":"workshop-legacy","roaster":"Workshop Coffee","coffee":"Legacy","roast":null,"dose":18,"yield":38,"ratio":2.11,"time":[30,32],"temp":93.5,"url":"https://workshopcoffee.com/products/legacy"},
{"id":"workshop-pillar","roaster":"Workshop Coffee","coffee":"Pillar","roast":null,"dose":18,"yield":36,"ratio":2.0,"time":[28,30],"temp":93.5,"url":"https://workshopcoffee.com/products/pillar"}
];
  if (typeof module !== 'undefined' && module.exports) module.exports = COFFEES;
  root.SetupCoffees = COFFEES;
})(typeof window !== 'undefined' ? window : globalThis);
