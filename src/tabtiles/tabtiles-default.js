// this is used as the basis for storing the options,
// in all parts of the extension - background, js, options
// in here so it can be loaded correctly by all of these

function tabtiles_defaultOptions()
{
  var opt =
  {
    minheight: 16, // px
    maxheight: 100, // px
    pctheight: 0.02, // ratio, not percentage..
    showat: 'bottom', // show at top or bottom
    backgroundtransparent: true, // background is transparent (clear) or translucent (white)
    disableMiniView: false, // fixed zoom - don't resize to mini view
    allowWhenRestored: false,
    allowWhenMaximized: false,
    allowWhenFullscreen: true,
    alternateHomepage: 'http://www.google.com',
    autohide: false,
    sensitivity: 2, // sensitivity
    disableKeyboard: false, // disable keyboard navigation and search
    disableTooltip: false,
    searchInNewTab: true, // open search results in a new tab
    addressInNewTab: false, // open navigate-to-address in a new tab
    enableAddressBar: true,
    searchProvider: 'google',
    searchProvider_custom: '',
    centerTiles: true,
    largeNewTab: false,
    hideHorizontalScrollbar: true,
    min_pctheight: 0.65,
    centerTooltip: true,
    minheight_mini: 12,
    oldStyle: false,
    disableSelShadow: false,
    showzoneis1px: false,
    disableTTS: false,
    disableKeyNav: false,
    hideInterval: 0,
    autoFullscreen:true
  }
  return opt;
}

var tabtiles_searchProviders =
[ {name: 'google', url: 'http://www.google.com/search?q='},
  {name: 'bing',   url: 'http://www.bing.com/search?q='},
  {name: 'yahoo',  url: 'http://search.yahoo.com/search?p='},
  {name: 'custom', url: ''} ];

function tabtiles_getSearchProvider(name)
{
  if(name == '') return tabtiles_searchProviders[0];
  for(var sp in tabtiles_searchProviders)
    if(tabtiles_searchProviders[sp].name == name)
      return tabtiles_searchProviders[sp];
  return tabtiles_searchProviders[0];
}

