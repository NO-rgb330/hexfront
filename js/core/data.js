// Static game data: map size, nations, unit stats, counters, terrain costs, tech tree.
export const W=14,H=10,ROUND_LIMIT=45;

export const NATIONS=[
  {name:'Valdoria',capital:'Aurelon',motto:'Steel before slogans.',corner:'North-west',cmd:['Aldric','Corvane','Maren','Tolliver','Sedgwick','Ashgrove','Hollis','Brandt']},
  {name:'Karsk',capital:'Karskgrad',motto:'The winter fights for us.',corner:'North-east',cmd:['Vasko','Krylenko','Dmitrin','Zarev','Kostrel','Ivashin','Brannik','Orlenko']},
  {name:'Orsini',capital:'Montoreno',motto:'Gold wins quiet wars.',corner:'South-west',cmd:['Ferrante','Valdini','Corsi','Montresor','Baldesca','Torrelli','Grimaldi','Sforzi']},
  {name:'Tamarin',capital:'Qasr Tamar',motto:'Every road is ours.',corner:'South-east',cmd:['Qadir','Suhayl','Marwen','Tahrir','Idrakh','Nazeem','Al-Rashar','Kadiri']}
];

export const COLORS=['#5b8cff','#f0505a','#6fd16a','#b685f5'];

export const CITY_NAMES=['Port Anvil','Ashgate','Stonehollow','Redmarsh','Kestrel Bay','Highmoor','Dunmere','Ironford','Saltwick','Velmont','Northreach','Cinderfall','Larkspur','Brightwater','Thornbury','Gravelin'];

export const RANKS=['Lt.','Capt.','Col.','Gen.'];

export const XP_STEPS=[14,34,62];

export const UT={
  inf:{key:'inf',name:'Infantry',cost:60,atk:5,def:5,mv:3,rng:1,air:false,desc:'Cheap and sturdy. Climbs hills easily and is the only line that holds ground well.'},
  tank:{key:'tank',name:'Armor',cost:120,atk:8,def:6,mv:4,rng:1,air:false,desc:'Fast and hard-hitting, strong against infantry and guns. Cannot enter mountains.'},
  art:{key:'art',name:'Artillery',cost:100,atk:9,def:2,mv:2,rng:2,air:false,desc:'Fires from two hexes, so most targets cannot hit back. Cannot fire after moving.'},
  air:{key:'air',name:'Fighter',cost:140,atk:7,def:5,mv:6,rng:1,air:true,desc:'Crosses sea and mountain and ignores terrain defense. Cannot capture cities.'}
};

export const MULT={inf:{tank:.9,air:.8},tank:{inf:1.15,art:1.3,air:.7},art:{tank:1.25,air:.5},air:{art:1.3,tank:1.15}};

export const MOVECOST={inf:{plain:1,forest:1,mount:2},tank:{plain:1,forest:2},art:{plain:1,forest:2},air:{plain:1,forest:1,mount:1,sea:1}};

export const TECHS=[
  {key:'fire',name:'Firepower',desc:'+10% attack per level, all units'},
  {key:'armor',name:'Armor Plating',desc:'+10% defense per level, all units'},
  {key:'econ',name:'War Economy',desc:'+15% income per level'}
];

export const TECH_COST=[150,250,400];

export const DIFF={easy:{name:'Recruit',inc:0.8},normal:{name:'Veteran',inc:1},hard:{name:'Warlord',inc:1.3}};

export const TERRAIN_INFO={
  plain:{name:'Open ground',text:'No defensive bonus. Every ground unit moves freely.'},
  forest:{name:'Forest',text:'+25% defense. Armor and artillery pay double to enter.'},
  mount:{name:'Mountains',text:'+50% defense. Impassable to armor and artillery.'},
  sea:{name:'Sea',text:'Only fighters can cross.'}
};
