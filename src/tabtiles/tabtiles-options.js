
  window.addEventListener('load',
    function(e)
    {
      var elem = document.getElementById('save');
      if(elem) elem.addEventListener('click', tabtiles_save_options, false);

      elem = document.getElementById('save2');
      if(elem) elem.addEventListener('click', tabtiles_save_options, false);

      elem = document.getElementById('restore');
      if(elem) elem.addEventListener('click', function(){tabtiles_restore_options(true); return false;}, false);

      elem = document.getElementById('searchProvider');
      if(elem) elem.addEventListener('change', tabtiles_updateCustomProvider_container);

      elem = document.getElementById('showHiddenOptions');
      if(elem) elem.addEventListener('click',
        function()
        {
          var elems = document.getElementsByName('hiddenfield');
          if(elems)
          {
            for(var elem in elems)
              if(!isNaN(elem) && elems[elem])
                if(elems[elem].style.display == 'none') elems[elem].style.display = '';
                else elems[elem].style.display = 'none';
          }
          var elem = document.getElementById('showHiddenOptions');
          if(elem)
            if(elem.innerHTML == '&nbsp;') elem.innerHTML = '<br />Showing hidden items - these may contain bugs. Use at your own risk!';
            else elem.innerHTML = '&nbsp;';
        }, false);

      tabtiles_restore_options(false, tabtiles_updateCustomProvider_container);

    }, false);

  // update the visibility of the custom provider section
  function tabtiles_updateCustomProvider_container()
  {
    var elem = document.getElementById('searchProvider');
    var elem_sp_container = document.getElementById('searchProvider_custom_container');
    if(elem && elem_sp_container)
      if(elem.value == 'custom')
        elem_sp_container.style.display = 'inline';
      else elem_sp_container.style.display = 'none';
  }

  // using translate prevents it from being able to set any other fields
  // (if there is any)
  function tabtiles_translate()
  {
    var ret =
    {
      minheight: "minheight",
      maxheight: "maxheight",
      pctheight: "pctheight",
      showat: "showat",
      backgroundtransparent: "backgroundtransparent",
      disableMiniView: "disableMiniView",
      allowWhenRestored: "allowWhenRestored",
      allowWhenMaximized: "allowWhenMaximized",
      allowWhenFullscreen: "allowWhenFullscreen",
      alternateHomepage: "alternateHomepage",
      autohide: "autohide",
      sensitivity: "sensitivity",
      disableKeyboard: "disableKeyboard",
      disableTooltip: "disableTooltip",
      searchInNewTab: "searchInNewTab",
      addressInNewTab: "addressInNewTab",
      enableAddressBar: "enableAddressBar",
      searchProvider: "searchProvider",
      searchProvider_custom: "searchProvider_custom",
      centerTiles: "centerTiles",
      largeNewTab: "largeNewTab",
      hideHorizontalScrollbar: "hideHorizontalScrollbar",
      min_pctheight: "min_pctheight",
      centerTooltip: "centerTooltip",
      minheight_mini: "minheight_mini",
      oldStyle: "oldStyle",
      disableSelShadow: "disableSelShadow",
      showzoneis1px: "showzoneis1px",
      disableTTS: "disableTTS",
      disableKeyNav: "disableKeyNav",
      hideInterval: "hideInterval",
      autoFullscreen: "autoFullscreen"
    };
    return ret;
  }

  function showMessage(msg)
  {
    var status = document.getElementById("status");
    var status2 = document.getElementById("status2");
    status.innerHTML = msg;
    status2.innerHTML = msg;
    setTimeout(function(e) {
      status.innerHTML = "";
      status2.innerHTML = "";
    }, 1500);
  }

  // tabtiles options save / load javascript

  function tabtiles_save_options()
  {
    // default

    var options = tabtiles_defaultOptions();

    // override defaults with the user's form options

    ObjFromForm(options, tabtiles_translate(), true);

    // need to adjust some things
    var _minheight = parseInt(options.minheight);
    if(options.minheight != _minheight)
    {
      showMessage('Invalid value for Minimum Height');
      return false;
    }
    options.minheight = _minheight;

    var _maxheight = parseInt(options.maxheight);
    if(options.maxheight != _maxheight)
    {
      showMessage('Invalid value for Maximum Height');
      return false;
    }
    options.maxheight = _maxheight;

    var _pctheight = parseFloat(options.pctheight);
    if(options.pctheight != _pctheight)
    {
      showMessage('Invalid value for Usual Height');
      return false;
    }
    options.pctheight = _pctheight / 100;

    var _min_pctheight = parseFloat(options.min_pctheight);
    if(options.min_pctheight != _min_pctheight)
    {
      showMessage('Invalid value for Usual Height');
      return false;
    }
    options.min_pctheight = _min_pctheight / 100;

    var _hideInterval = parseInt(options.hideInterval);
    if(options.hideInterval != _hideInterval)
    {
      showMessage('Invalid value for Auto-hide interval');
      return false;
    }
    options.hideInterval = _hideInterval;

    // send a message to the background page to save it

    options.name = "setPreferences";
    options.__source__ = 'tabTilesMsg';
    chrome.runtime.sendMessage(options,
      function(response)
      {
        var _status = "Error saving settings!";
        if(response == "done")_status = "Saved - Reload your pages."

        showMessage(_status);
      }
    );

    return false;
  }

  function tabtiles_restore_options(resetDefaults, callback)
  {
    // default

    var options = tabtiles_defaultOptions();

    // if not resetting,
    // then get the options by sending a message to the background page
    if(!resetDefaults)
    {
      chrome.runtime.sendMessage({name: "getPreferences", __source__: "tabTilesMsg"},
      function(response)
      {
        if(response)
        {
          options = object_extend(options, response, true);

          // translate back
          options.pctheight = options.pctheight * 100; // convert to pct
          options.min_pctheight = options.min_pctheight * 100;
          if(options.searchProvider_custom == '')
          {
            var sp = tabtiles_getSearchProvider(options.searchProvider);
            if(sp) options.searchProvider_custom = sp.url;
          }

          // set them in the form items now
          ObjToForm(options, tabtiles_translate(), true);

          if(callback) callback();
        }
      });
    }
    else
    {
      options.pctheight = options.pctheight * 100; // convert to pct
      options.min_pctheight = options.min_pctheight *100;

      ObjToForm(options, tabtiles_translate(), true);

      if(callback) callback();
    }

    return false;

  }

