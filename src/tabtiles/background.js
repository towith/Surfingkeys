
var lastScroll = 0;
var tabtiles_saved_adjust_pctheight = null;
var tabtiles_autohidden = null;
var tabtiles_tooltipshown = false;

if((localStorage["firstrun"]!="false") && (localStorage["firstrun"]!=false))
{
  chrome.tabs.create({url: "tabtiles/tabtiles-options.html", selected:true})
  localStorage["firstrun"] = false;
}

function listen2(request, sendResponse) {
  if (request.name == "getPreferences") {
    options = tabtiles_defaultOptions(); // reset, and load

    var _json_text = localStorage["tabtiles_options"];
    if (_json_text) {
      // add the loaded data to the default values
      var _json_obj = JSON.parse(_json_text);

      // modify some if upgrading
      if (_json_obj.pctheight !== undefined) {
        if (_json_obj.largeNewTab === undefined)
          _json_obj.largeNewTab = true; // default to true if upgrading
        if (_json_obj.centerTooltip === undefined)
          _json_obj.centerTooltip = false; // default to false if upgrading
        if (_json_obj.minheight_mini === undefined)
          _json_obj.minheight_mini = 20; // default to 20 if upgrading
        if ((_json_obj.oldStyle === undefined) && (localStorage["shownNewStyleMessage"] === undefined)) {
          localStorage["shownNewStyleMessage"] = true;
          alert('Update to tabtiles - colors have been changed slightly to ' +
              'improve the visibility of the selected tile.\n\n' +
              'You can disable this in the options page if you prefer the old style colors.\n\n' +
              '(This message will be displayed only this one time)');
        }
      }

      options = object_extend(options, _json_obj, true);
    }

    sendResponse(options);

  }
  if (request.name == "setPreferences") {
    var temp_options = tabtiles_defaultOptions();

    // ensure defaults exist (doesn't matter really)
    temp_options = object_extend(temp_options, request, true);
    // serialize and save
    var _json_text = JSON.stringify(temp_options);
    localStorage["tabtiles_options"] = _json_text;

    tabtiles_saved_adjust_pctheight = null; // reset
    tabtiles_autohidden = null;

    sendResponse("done");
  }

  return true;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.__source__ !== 'tabTilesMsg') {
    return;
  }

  listen1(request, sender, sendResponse);
  listen2(request, sendResponse);

  return true;
})

function listen1(request, sender, sendResponse) {
  switch (request.name) {
    case 'set_fullscreen':
      // unfortunately this doesn't work in metro so little point
      chrome.windows.getCurrent(null,
          function (window) {
            chrome.windows.update(window.id, {'state': 'fullscreen'});
          }
      );
      break;

      // return the current tabs, and selected tab
    case 'getTabs':

      if (lastSelectedTab == -1)
        chrome.tabs.getSelected(null, function (tab, selectInfo) {
          lastSelectedTab = tab.id
        });

      chrome.tabs.query({'windowId': sender.tab.windowId/*, 'windowType': 'normal'*/},
          function (tabs) {

            // only send them if this tab is present in the window
            for (var item in tabs)
              if (tabs[item].id == sender.tab.id) {
                sendResponse({'tabs': tabs, 'tabId': lastSelectedTab});

                break;
              }
          }
      );

      break;

      // get the window that the sender's context is using
    case 'getWindow':

      chrome.windows.get(sender.tab.windowId, null,
          function (window) {
            sendResponse({'window': window});
          });

      break;

      // close the given tab
    case 'closeTab':

      chrome.tabs.remove(request.tabId);

      break;

      // create a new tab - going to the new tab page
    case 'newTab':

      chrome.tabs.create({}, null);

      break;

      // create a new tab - going to the alternate homepage
    case 'newTab_alt':

      chrome.tabs.create({url: options.alternateHomepage}, null);

      break;

      // go to the homepage - new tab page
    case 'home':

      chrome.tabs.update(sender.tab.id, {'url': 'chrome://newtab'});

      break;

      // move a tab, to the given index in its window
    case 'moveTab':

      chrome.tabs.move(request.tabid, {index: request.moveto});

      break;

      // save the current scroll position (and other details)
    case 'saveScroll':

      if (sender.tab.active) {
        lastScroll = request.scroll;
        tabtiles_saved_adjust_pctheight = request.adjust_pctheight;
        tabtiles_autohidden = request.autohidden;
        tabtiles_tooltipshown = request.tooltipshown;
      }

      break;

      // retrieve the current scroll position (and other details)
    case 'getScroll':

      sendResponse(
          {
            'scroll': lastScroll,
            'adjust_pctheight': tabtiles_saved_adjust_pctheight,
            'autohidden': tabtiles_autohidden,
            'tooltipshown': tabtiles_tooltipshown
          });

      break;

      // get the favicon for the given url
      // this needs to save it as base encoded for use by the img src property
    case 'getFavIcon':

      // adapted from http://blog.roomanna.com/09-24-2011/dynamically-coloring-a-favicon
      // don't need to color it though - just GET it,
      // since content pages can't use the chrome://favicon/ system
      // if that changes in the future, this could be removed

      var _url_endpos = request.url.indexOf('://');
      if (_url_endpos == -1) var _url = request.url;
      else {
        var _url_endpos_root = request.url.indexOf('/', _url_endpos + 3);
        if (_url_endpos_root == -1) _url = request.url;
        else _url = request.url.substr(0, _url_endpos_root);
      }
      var faviconUrl = 'chrome://favicon/' + _url;

    function onImageLoaded() {
      var canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      var context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      context.globalCompositeOperation = "source-in";
      //context.fillStyle = "#d00"; // don't need this
      //context.fillRect(0, 0, 16, 16);
      //context.fill();
      sendResponse({'img_id': request.img_id, 'img_data': canvas.toDataURL()});
    };
      var img = document.createElement("img");
      img.addEventListener("load", onImageLoaded);
      img.src = faviconUrl;

      break;

      // go to the given url in a new tab
    case 'goToURL':

      chrome.tabs.create({url: request.url, selected: true})

      break;

    case 'pinTab':

      chrome.tabs.update(request.tabId, {pinned: request.pinned});

      break;

    case 'showHistory':

      chrome.tabs.create({url: 'chrome://history/'});

      break;

  }

  return true;
}


var lastSelectedTab = -1;

chrome.extension.onConnect.addListener(
  function(port)
  {
	if (port.name != 'tabtiles')
		return;
	port.onMessage.addListener(function(data)
    {
      if(data.func == 'selectTab')
      {
        chrome.tabs.update(data.tabId, {selected: true},
          function(tab)
          {
            if(lastSelectedTab != tab.id) _updateTabs(tab.id, tab.id);
          });
      }
    });
  });

// get the tabs
function _updateTabs(tabId, selectedTabId, windowId, noresetkb)
{
  // tabId is the currently selected tab, or -1

  chrome.tabs.query({'windowId': windowId, 'windowType': 'normal'},
    function(tabs)
    {

      if(selectedTabId == -1) selectedTabId = lastSelectedTab; else lastSelectedTab = selectedTabId;

      if(tabId != -1)
      {
        // only send them if this tab is present in the window
        for(var item in tabs)
          if(tabs[item].id == tabId)
          {
            chrome.tabs.sendMessage(tabId, {'name': 'tabs_onSelectionChanged', 'tabId': selectedTabId, 'tabs': tabs, 'noresetkb': noresetkb});
            break;
          }
      }

    }
  );

}

// update the tabs
// this outer function gets the window id if it is not set
//
// noresetkb is a bit obsolete in here - it didn't work as intended
function updateTabs(tabId, selectedTabId, windowId, noresetkb)
{
  // tabId is the currently selected tab, or -1

  // if windowId isn't set, get it here (for this tab)
  if(windowId)
    _updateTabs(tabId, selectedTabId, windowId, noresetkb);
  else
    chrome.tabs.get(tabId,
      function(tab)
      {
        if(tab)
          _updateTabs(tabId, selectedTabId, tab.windowId, noresetkb);
      });

}

// following are event handlers for various tab events, such as selection changed, add, remove, etc

chrome.tabs.onSelectionChanged.addListener(
  function(tabId, selectInfo)
  {
    if(tabId != lastSelectedTab) updateTabs(tabId, tabId, selectInfo.windowId);
  }
);

// no point doing this - as the tab has already gone, and it doesn't give the window id
// NO: it DOES need to update it somehow. updating the last selected tab seems to be enough
chrome.tabs.onRemoved.addListener(
  function(tabId, removeInfo)
  {
    if((lastSelectedTab != -1)&&(lastSelectedTab != tabId)) updateTabs(lastSelectedTab, -1);
    if(lastSelectedTab == tabId) lastSelectedTab = -1;
  }
);

chrome.tabs.onCreated.addListener(
  function(tab)
  {
    //if((lastSelectedTab != -1)&&(lastSelectedTab != tab.id)) updateTabs(lastSelectedTab, -1);
    updateTabs(tab.id, -1, tab.windowId);
  }
);

chrome.tabs.onAttached.addListener(
  function(tabId, attachInfo)
  {
    // this causes it to update the old window with the wrong tabs for some reason >>
    //if((lastSelectedTab != -1)&&(lastSelectedTab != tabId)) updateTabs(lastSelectedTab, -1);
    updateTabs(tabId, -1, attachInfo.newWindowId);
  }
);

chrome.tabs.onDetached.addListener(
  function(tabId, detachInfo)
  {
    // this is giving an error sometimes - no tab with specified id in tabs.get
    // but has clearly just given it the id!
    //console.log('detach [' + tabId + ']');
    if((lastSelectedTab != -1)&&(lastSelectedTab != tabId)) updateTabs(lastSelectedTab, -1);
    updateTabs(tabId, -1, detachInfo.oldWindowId);
  }
);

chrome.tabs.onMoved.addListener(
  function(tabId, moveInfo)
  {
    if((lastSelectedTab != -1)&&(lastSelectedTab != tabId)) updateTabs(lastSelectedTab, -1, undefined, true);
    updateTabs(tabId, -1, moveInfo.windowId, true);
  }
);

chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab)
  {
    // this may be causing issues
    if((lastSelectedTab != -1)&&(lastSelectedTab != tabId)) updateTabs(lastSelectedTab, -1);
    updateTabs(tabId, -1);
  }
);

chrome.windows.onFocusChanged.addListener(
  function(windowId)
  {
    if(windowId != chrome.windows.WINDOW_ID_NONE)
      updateTabs(lastSelectedTab, -1, windowId);
  }
);
