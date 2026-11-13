// Antarctica as one ring that includes the pole, so even-odd tests work on an equirectangular map.
// Lon 0..360. Coast follows the ice edge (shelves included). Most hex games leave this out.
import { P } from './geo-old-world.js';

export const ANTARCTICA = P(`
0,-70.0 10,-70.5 20,-70.0 30,-69.8 40,-68.5 50,-66.8 60,-67.5 70,-69.5 75,-69.5 80,-67.5 90,-66.5 100,-66.5
110,-66.5 120,-67.0 130,-66.5 140,-66.7 150,-69.0 160,-70.5 165,-71.5 168,-77.8 180,-78.5 200,-78.2 210,-77.0
220,-75.5 230,-74.5 240,-74.0 250,-74.3 260,-73.2 270,-72.5 283,-72.0 290,-69.0 295,-65.0 303,-63.3 300,-65.0
300,-68.0 298,-72.0 300,-75.5 320,-77.5 330,-74.0 340,-72.5 350,-70.5 360,-70.0 360,-90 0,-90`);
