// Mountain ranges and forest belts as coarse polygons, standard lon (west negative). They only need to be
// right to a hex (~5 degrees), so ranges are drawn a little wider than they really are.
import { P } from './geo-old-world.js';

export const MOUNTAINS = [
  P(`70,34 78,37 90,36 100,34 102,30 95,27 85,27.5 78,30 72,32`),            // Himalaya, Karakoram, Tibet edge
  P(`70,41 80,44 92,44 90,41 78,40 72,38`),                                   // Tian Shan, Pamir
  P(`84,50 92,52 100,52 98,49 90,48`),                                        // Altai, Sayan
  P(`57,52 61,52 64,60 66,68 62,68 59,60`),                                   // Urals
  P(`38,43.5 44,43 49,41.5 46,40.5 40,42`),                                   // Caucasus
  P(`45,36 50,32 56,27 54,26 48,30 44,34`),                                   // Zagros
  P(`5,45 8,47 14,47.5 15,46.5 10,45.5 7,44.5`),                              // Alps
  P(`20,48.5 25,49 26,47 24,46 22,47`),                                       // Carpathians
  P(`-2,43 3,42.7 3,42.3 -2,42.7`),                                           // Pyrenees
  P(`5,60 8,63 12,67 17,69 20,69 15,66 12,63 9,60`),                          // Scandinavian mountains
  P(`-9,31 -5,34.5 0,35 5,36 9,36 8,34.5 2,33 -4,32`),                        // Atlas
  P(`36,6 40,6 43,9 41,13 37,14 35,10`),                                      // Ethiopian highlands
  P(`27,-31 31,-28 30,-26 27,-29`),                                           // Drakensberg
  P(`122,57 128,66 140,67 148,64 142,59 132,56`),                             // Verkhoyansk, Chersky
  P(`156,52 158,58 162,58 160,53`),                                           // Kamchatka
  P(`136,-4.5 142,-4.5 147,-6.5 145,-7 138,-5.5`),                            // New Guinea highlands
  P(`-116,32 -114,38 -119,45 -124,52 -130,58 -137,61 -142,62 -138,64 -130,63 -123,58 -116,53 -110,47 -105,41 -105,36 -108,32`), // Rockies and coast ranges
  P(`-110,31 -106,30 -102,25 -103,21 -99,17 -97,17 -98,20 -101,24 -105,28`),  // Sierra Madre
  P(`-77,8 -78,-1 -80,-8 -76,-14 -72,-18 -71,-24 -71,-32 -73,-40 -75,-48 -74,-54 -70,-54 -69,-48 -68,-40 -67,-32 -66,-24 -66,-18 -69,-12 -72,-7 -75,-2 -76,3 -73,7`), // Andes
];

export const FORESTS = [
  P(`-78,2 -70,4 -62,5 -52,3 -49,-1 -50,-8 -57,-12 -64,-11 -70,-11 -73,-8 -78,-4`),   // Amazon
  P(`9,3 16,4 25,4 30,2 29,-5 24,-6 16,-5 12,-3 9,0`),                                // Congo basin
  P(`-12,7 -5,7 4,7 8,6 4,5 -4,4.5 -10,5.5`),                                         // Guinea coast
  P(`24,66 40,66 60,64 75,64 90,63 105,62 120,60 135,58 138,54 130,52 118,52 105,52 90,54 75,55 60,56 45,56 30,57 24,60`), // Siberian taiga
  P(`-135,62 -120,62 -105,60 -90,57 -78,56 -66,53 -60,50 -68,48 -80,49 -90,49 -105,52 -120,54 -130,56`), // Canadian boreal
  P(`-165,66 -150,67 -142,65 -145,62 -155,61 -163,62`),                               // Alaska interior
  P(`-96,35 -90,36 -82,36 -78,34 -76,38 -72,42 -68,45 -72,47 -80,45 -88,46 -94,45 -96,40`), // Eastern North America
  P(`-125,49 -121,49 -121,42 -124,42`),                                               // Pacific Northwest
  P(`-92,18 -86,18 -83,13 -85,9 -80,8 -77,8 -82,11 -89,15`),                          // Central America
  P(`2,48 10,52 20,52 28,52 28,47 20,46 12,46 4,46`),                                 // Central Europe
  P(`94,24 100,24 105,22 108,17 108,11 104,9 99,8 98,14 96,18`),                      // Mainland Southeast Asia
  P(`109,-3 118,-3 119,6 109,3`),                                                     // Borneo
  P(`95,5 98,4 104,-1 106,-5 102,-5 97,0`),                                           // Sumatra
  P(`132,-1 142,-2 148,-8 140,-9 133,-4`),                                            // New Guinea lowlands
  P(`126,34 131,34 142,38 142,44 135,48 128,48 124,42 126,38`),                       // Korea, Japan, Manchuria
  P(`105,24 118,26 122,30 116,32 108,30`),                                            // Southern China
  P(`47,-12 50,-17 48,-24 46,-18`),                                                   // Madagascar east
  P(`-74,-38 -72,-38 -72,-46 -74,-46`),                                               // Southern Chile
  P(`145,-16 148,-20 151,-27 152,-32 150,-37 146,-38 148,-30 146,-24`),               // Eastern Australia
];

const inside = (poly, x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const hit = (list, lon, lat) => [lon, lon - 360, lon + 360].some(x => list.some(p => inside(p, x, lat)));

// Map lon (Americas shifted east of the dateline) to 'mount' | 'forest' | 'plain'.
export function terrainAt(lon, lat) {
  if (hit(MOUNTAINS, lon, lat)) return 'mount';
  if (hit(FORESTS, lon, lat)) return 'forest';
  return 'plain';
}
