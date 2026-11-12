// DOM element lookups shared by the UI modules.
export const $ = id => document.getElementById(id);
export const cv = $('map'), board = $('board'), panel = $('panel'), scoreEl = $('score'), toastEl = $('toast');

