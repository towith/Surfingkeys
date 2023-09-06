(function(document, window)
{

  var enable_lasttabback_integration = true;

  var options = tabtiles_defaultOptions();
  var options_loaded = false;

  var tabtiles_adjust_pctheight_full = 1;
  var tabtiles_adjust_pctheight_mini = 0.5;
  var tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_mini; // ratio

  // load tabtiles options from local storage - call goes out to the background page
  function loadOptions(callback)
  {
    try
    {
      chrome.runtime.sendMessage({name: "getPreferences", __source__: "tabTilesMsg"},
        function(response)
        {
          if(response)
          {
            {
              options = response;
              options_loaded = true; // for some reason, it isn't saving this right
              tabtiles_adjust_pctheight_mini = options.min_pctheight;
              tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_mini;
              minheight_mini = options.minheight_mini;
              console.log('tabtiles - loaded options');
            }
            if(callback) callback();
          }
        });
    }
    catch(err)
    {}
  }

  //loadOptions();

  var debug = false; // display debugging console messages

  // dynamically load js or css file
  function loadjscssfile(filename, filetype)
  {
    if(filetype=="js")
    { //if filename is a external JavaScript file
      var fileref=document.createElement('script')
      fileref.setAttribute("type","text/javascript")
      fileref.setAttribute("src", filename)
    }
    else if(filetype=="css")
    { //if filename is an external CSS file
      var fileref=document.createElement("link")
      fileref.setAttribute("rel", "stylesheet")
      fileref.setAttribute("type", "text/css")
      fileref.setAttribute("href", filename)
    }
    if (typeof fileref!="undefined")
    {
      var elems = document.getElementsByTagName("head");
      if(elems && (elems.length > 0))
        elems[0].appendChild(fileref);
      return fileref;
    }
    return null;
  }

  // fix zoom when using auto page zooming extensions
  // this should be applied to any values that are taken from outside of the body context
  // (mainly viewport)
  function modifyZoom(old)
  {
    var zoom = parseFloat(document.body.style.zoom);
    if(!isNaN(zoom)&&(zoom!=0))
    {
      var z = document.body.style.zoom;
      if((z!="")&&(z.slice(z.length-1)=="%"))zoom /= 100;
      zoom = 1 / zoom;
    }
    else
    {
      zoom = 1;
    }
    return old * zoom;
  }

  // encode html entities
  function htmlentities(str)
  {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // get window scroll viewport
  function getViewport()
  {
  	var scrOfX = 0, scrOfY = 0;
     if( document.documentElement && (
        document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
      scrOfY = document.documentElement.scrollTop;
      scrOfX = document.documentElement.scrollLeft;}
      else if( typeof( window.pageYOffset ) == 'number' ) {
      scrOfY = window.pageYOffset;
        scrOfX = window.pageXOffset;
     }
      else if( document.body && ( document.body.scrollLeft ||
        document.body.scrollTop ) ) {
      scrOfY = document.body.scrollTop;
        scrOfX = document.body.scrollLeft;
     }

    //if(document.doctype)
    var width = document.documentElement.clientWidth;
    var height = document.documentElement.clientHeight;
    if(width - 1 > window.innerWidth) width = document.body.clientWidth;
    if(height - 1 > window.innerHeight) height = document.body.clientHeight;
      return {left: scrOfX, top: scrOfY,
        right: scrOfX + width,
        bottom: scrOfY + height}
      /*return {left: scrOfX, top: scrOfY,
        right: scrOfX + Math.min(document.documentElement.clientWidth, document.body.clientWidth),
        bottom: scrOfY + Math.min(document.documentElement.clientHeight, document.body.clientHeight)}*/
    /*else
      return {left: scrOfX, top: scrOfY,
        right: scrOfX + window.innerWidth, bottom: scrOfY + window.innerHeight}*/
  }



  // mouse wheel code adapted from http://www.adomas.org/javascript-mouse-wheel/

  function handle(delta)
  {
    // tabtiles code in here:

    //console.log('mouse wheel [' + delta + ']');
    // reset if required
    if(Math.abs(tabtiles_elem.scrollLeft - tabtiles_scrollLeft_float) > 20)
      tabtiles_scrollLeft_float = tabtiles_elem.scrollLeft;

    // scroll to the left or right
    if(tabtiles_lastMouseOverBar)
    {
      if(delta > 0)
  		  // up - left
        tabtiles_scrollLeft_float -= tabtiles_elem.scrollWidth * 0.03;
      if(delta < 0)
  		  // down - right
        tabtiles_scrollLeft_float += tabtiles_elem.scrollWidth * 0.03;
      tabtiles_elem.scrollLeft = tabtiles_scrollLeft_float;
      tabtiles_text_onmouseover();
      tabtiles_startedMoveX = -1;
      tabtiles_startedMove = false;
      return false; // cancel event, handled
    }
  }

  /** Event handler for mouse wheel event.
   */
  function wheel(event)
  {
    var delta = 0;
    if(!event) /* For IE. */
      event = window.event;
    if(event.wheelDelta) { /* IE/Opera. */
      delta = event.wheelDelta/120;
    } else if (event.detail) { /** Mozilla case. */
      /** In Mozilla, sign of delta is different than in IE.
       * Also, delta is multiple of 3.
       */
      delta = -event.detail/3;
    }
    /** If delta is nonzero, handle it.
     * Basically, delta is now positive if wheel was scrolled up,
     * and negative, if wheel was scrolled down.
     */
    if(delta)
      if(handle(delta) === false)
      {
        /** Prevent default actions caused by mouse wheel.
         * That might be ugly, but we handle scrolls somehow
         * anyway, so don't bother here..
         */
        if(event.preventDefault)
          event.preventDefault();
        event.returnValue = false;
      }
  }



  // actual tabtiles code:

  var tabtiles_lastmousex = -1;
  //var tabtiles_lastmousey = -1;
  // ^^ doesn't currently use this, as they are all horizontal
  //    (across top or bottom)

  var tabtiles_speedboost = 2.2;//1.6;
  var tabtiles_startedMoveX = -1;
  var tabtiles_startedMove = false;

  var tabtiles_last_x_change = 0;
  var tabtiles_scrollLeft_float = 0;

  var tabtiles_lastmouseover = null;

  var tabtiles_focusAtX = -1;

  var tabtiles_lastMouseOverBar = false;

  var tabtiles_height_raw = 40; // this will be overridden in load

  // sensitivity presets
  var tabtiles_max_mousemove_speed_normal = 1;
  var tabtiles_max_mousemove_speed_slow = tabtiles_max_mousemove_speed_normal / 4;
  var tabtiles_max_mousemove_speed_fast = tabtiles_max_mousemove_speed_normal * 4;

  var tabtiles_max_mousemove_speed = tabtiles_max_mousemove_speed_normal;

  var tabtiles_max_mousemove_speed_perpx = 0.005; // ratio of viewport size

  // used so it won't hide the tooltips while the mouse is still over one
  var tabtiles_mouseovertooltip = false;

  var tabtiles_dragging = false;
  var tabtiles_dragstartx = -1;
  var tabtiles_lastdragdir = null;
  var tabtiles_dragging_timer_id = -1;

  // this causes the drag to timeout if it has taken too long
  // it can also be used to cancel the drag op elsewhere in the code
  function tabtiles_dragging_timer()
  {
    if(tabtiles_dragging)
    {
      console.log('tabtiles - end drag');

      tabtiles_dragging = false;
      tabtiles_dragstartx = -1;
      tabtiles_keyboardFocus = null;
      tabtiles_checkTileSize(false, true);
    }
    if(tabtiles_dragging_timer_id != -1)
      window.clearTimeout(tabtiles_dragging_timer_id);
    tabtiles_dragging_timer_id = -1;
  }

  // the main move function - handles scrolling the bar based on mouse movement
  // also switches to full size / shows it if set to autohide,
  // and displays the popup tooltips
  function tabtiles_mousemove(e)
  {
    tabtiles_lastMouseOverBar = false;

    if(tabtiles_onclick_closedisable_tabtile || tabtiles_onclick_pintoleft_tabtile) return;

    if(tabtiles_button)
    {
      var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
      var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;
    }
    else tabtiles_buttons_width = 0;

    var e_x = e.x;
    var e_y = e.y;
    var _x = modifyZoom(e_x); // - tabtiles_buttons_width;
    var _y = modifyZoom(e_y);

    var viewport = getViewport();
    var elem = document.getElementById('tabtiles');
    if(elem)
    {
      elem_rect = elem.getBoundingClientRect();
      viewport.left = elem_rect.left;
      viewport.right = elem_rect.right;
    }
    else
    {
      viewport.left = modifyZoom(viewport.left);
      viewport.right = modifyZoom(viewport.right);
    }
    viewport.top = modifyZoom(viewport.top);
    viewport.bottom = modifyZoom(viewport.bottom);
    var viewport_width = /*modifyZoom(*/viewport.right - viewport.left/*)*/;
    var viewport_height = /*modifyZoom(*/viewport.bottom - viewport.top/*)*/;

    var tabtiles_zone_height = tabtiles_height_raw; // so it can be set before creating the element
    var tabtiles_extrazone_height = tabtiles_zone_height * 3;

    var elem = document.getElementById('tabtiles');
    var elem_hidden = !elem;
    if(elem) elem_hidden = elem.style.display == 'none';

    if(options.showzoneis1px)
        if(elem_hidden && (tabtiles_windowState != 'normal'))
            tabtiles_extrazone_height = 1.5; // doesn't always activate with just 1px

    tabtiles_zone_height = tabtiles_zone_height * 1.2;
    var allowit = true;
    var allowit_extra = true;
    if(options.showat == 'top')
    {
      if(_y < tabtiles_zone_height) {}
      else allowit = false;
      if(Math.round(_y) <= Math.round(tabtiles_extrazone_height)) {}
      else allowit_extra = false;
    }
    if(options.showat == 'bottom')
    {
      if(_y > (viewport_height - tabtiles_zone_height)) {}
      else allowit = false;
      if(Math.round(_y) >= (Math.floor(viewport_height - tabtiles_extrazone_height))) {}
      else allowit_extra = false;
    }

    if(allowit)
    {
        tabtiles_lastMouseOverBar = true;
        disable_options_interval = true;
    }
    else disable_options_interval = false;

    if(options.showzoneis1px)
        if(elem_hidden && (tabtiles_windowState != 'normal'))
            allowit = allowit_extra;

    if(allowit && /*allowit_extra && */options.autohide && (elem_hidden) && !tabtiles_manualhide)
    {
      if(tabtiles_showForWindowState())
      {
        if(!elem) tabtiles_initComponents();
        if(!tabtiles_elem) return; // if still not, quit - should do it later
        tabtiles_button.style.display = 'block'; // need to show this first or it won't get the size
        tabtiles_checkTileSize(true, true, false, true /* don't skip if hidden */)
        tabtiles_showIt(true); // moved this after the update - smoother
      }
    }

    var elem = document.getElementById('tabtiles');
    if(!elem) return;

    if(elem.style.display == 'none') return;

    var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
    var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;

    if(allowit_extra && !tabtiles_startedMove
    && (tabtiles_adjust_pctheight != tabtiles_adjust_pctheight_full))
    {
      // change to full size

      // find the closest tab to this x
      var closest = null;
      for(var item in tabtiles_array)
      {
        if(tabtiles_array[item])
        {
          var item_rect = tabtiles_array[item].tabtiles_text.getBoundingClientRect();
          if((_x >= item_rect.left)&&(_x <= item_rect.right))
          {
            closest = tabtiles_array[item].tabtiles_id;
            tabtiles_focusAtX = _x;
            break;
          }
        }
      }
      if(closest == null) closest = true; // focus the selected item if none found
      tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;
      if(!options.autohide && !options.disableMiniView && tabtiles_showForWindowState())
        tabtiles_resize_overrideNoUpdate = true;
      tabtiles_checkTileSize(closest, true);

      tabtiles_saveScroll();

      return;
    }
    //console.log('allowit: ' + allowit + ' allowit_extra: ' + allowit_extra + ' timer: ' + tabtiles_reset_started_timerid);
    if(!allowit_extra && !tabtiles_keyboardFocus_activated)
    {
      // hide the tooltip immediately
      if(tabtiles_tooltip && !tabtiles_mouseovertooltip)
        tabtiles_prepareTooltip(null, false);

      if(allowit || (tabtiles_reset_started_timerid == -1))
        tabtiles_mouseout_event();
    }
    if(allowit_extra && (tabtiles_startedMove === true)) allowit = true;
    if(allowit_extra && options.autohide) allowit = true;

    if(_x < (tabtiles_buttons_width))
      allowit = false;

    if(allowit && elem && (tabtiles_lastmousex != -1))
    {
      var x_change = modifyZoom(tabtiles_lastmousex - e_x);
      var old_elem_scrollLeft = tabtiles_scrollLeft_float;

      if(tabtiles_startedMoveX == -1)
      {
        tabtiles_scrollLeft_float = elem.scrollLeft;
        //console.log('clear');
      }

      if(tabtiles_startedMove !== null)
        if(tabtiles_startedMoveX == -1)
          tabtiles_startedMoveX = e_x;
      if(!tabtiles_startedMove && (Math.abs(tabtiles_startedMoveX - e_x) > (viewport_width * 0.05)))
      {
        tabtiles_startedMove = true;
        //console.log('startedMove go');
      }

      var startingDrag = !tabtiles_dragging;
      if((tabtiles_dragstartx != -1)
      &&(tabtiles_dragging || (Math.abs(tabtiles_dragstartx - e_x) > (viewport_width * 0.15))))
      {
        tabtiles_dragging = true;
        if(tabtiles_dragging_timer_id != -1) window.clearTimeout(tabtiles_dragging_timer_id);
        tabtiles_dragging_timer_id = window.setTimeout(tabtiles_dragging_timer, 7000);
        //console.log('tabtiles - in dragging');

        if(startingDrag)
          // update to show kb selection
          tabtiles_checkTileSize(tabtiles_keyboardFocus, true);

        // find the closest tab to this x
        var closest = null;
        var closest_infirsthalf = false;
        var closest_insecondhalf = false;
        for(var item in tabtiles_array)
        {
          if(tabtiles_array[item])
          {
            var item_rect = tabtiles_array[item].tabtiles_text.getBoundingClientRect();
            if((_x >= item_rect.left)&&(_x <= item_rect.right))
            {
              closest = item;
              closest_infirsthalf = (_x < item_rect.left + ((item_rect.right - item_rect.left)/2));
              closest_insecondhalf = (_x > item_rect.left + ((item_rect.right - item_rect.left)/2));
              tabtiles_focusAtX = _x;
              break;
            }
          }
        }

        // note: closest is index here, not pointer OR tab id
        if(closest !== null)
        {
          // find the index of the keyboardFocus item
          var tabtiles_keyboardFocus_index = null;
          for(var item in tabtiles_array)
            if(tabtiles_array[item])
              if(tabtiles_array[item].tabtiles_id == tabtiles_keyboardFocus)
              {
                tabtiles_keyboardFocus_index = item;
                break;
              }

          //console.log('closest: ' + closest + '  keyfocus: ' + tabtiles_keyboardFocus_index);

          if(tabtiles_keyboardFocus_index !== null)
            if(closest != tabtiles_keyboardFocus_index)
              if(closest < tabtiles_keyboardFocus_index)
              {
                if((x_change > 0) && closest_infirsthalf) // only if moving to the left
                {
                  // drag to the left
                  //console.log('tabtiles - drag to the left');

                  // need to move it to BEFORE this ("closest") item
                  // find the index in the window
                  var toindex = 0;
                  for(var item in tabtiles_array)
                    if(tabtiles_array[item])
                    {
                      if(item == closest)
                      {
                        //console.log('moving tab #' + tabtiles_array[tabtiles_keyboardFocus_index].tabtiles_id + ' to index: ' + toindex);
                        chrome.runtime.sendMessage(
                          {
                            __source__: "tabTilesMsg",
                            name: 'moveTab',
                            'tabid': tabtiles_array[tabtiles_keyboardFocus_index].tabtiles_id,
                            'moveto': toindex
                          });
                        break;
                      }
                      toindex++;
                    }
                }
              }
              else
              {
                if((x_change < 0) && closest_insecondhalf) // only if moving to the right
                {
                  // drag to the right
                  //console.log('tabtiles - drag to the right');
                  var toindex = -1; // last, if there isn't a next one
                  var doitnext = false;
                  for(var item in tabtiles_array)
                    if(tabtiles_array[item])
                    {
                      if(doitnext)
                      {
                        break;
                      }
                      if(item == closest)
                        doitnext = true;
                      toindex++;
                    }
                  //console.log('moving tab #' + tabtiles_array[tabtiles_keyboardFocus_index].tabtiles_id + ' to index: ' + toindex);
                  chrome.runtime.sendMessage(
                  {
                    __source__: "tabTilesMsg",
                    name: 'moveTab',
                    'tabid': tabtiles_array[tabtiles_keyboardFocus_index].tabtiles_id,
                    'moveto': toindex
                  });
                }
              }


        }

      }

      if((x_change != 0) && ((tabtiles_startedMove === null)|| tabtiles_startedMove))
      {
        if(Math.abs(elem.scrollLeft - tabtiles_scrollLeft_float) > 20)
          tabtiles_scrollLeft_float = elem.scrollLeft;

        if(x_change < 0)
        {
          // move to the right
          var visible_length = viewport_width - (_x - tabtiles_buttons_width);
          var hidden_length = elem.scrollWidth - elem.scrollLeft - /*modifyZoom(*//*viewport.right*/viewport_width/*)*/;
          hidden_length += viewport_width * 0.1; // ensure it can easily move far enough

          if(visible_length > 0) var per_px = hidden_length / visible_length;
          else per_px = 0;
          if(per_px < 0) per_px = 0;

          per_px = per_px * tabtiles_speedboost * tabtiles_max_mousemove_speed;

          if(per_px > tabtiles_max_mousemove_speed_perpx * tabtiles_max_mousemove_speed * viewport_width)
            per_px = tabtiles_max_mousemove_speed_perpx * tabtiles_max_mousemove_speed * viewport_width;

          var add = Math.abs(x_change) * per_px;
          tabtiles_scrollLeft_float += add;
          elem.scrollLeft = tabtiles_scrollLeft_float;
          //console.log('right: [' + tabtiles_scrollLeft_float + '] actual: [' + elem.scrollLeft +'] add: [' + add + '] perpx: [' + per_px + ']');
        }
        if(x_change > 0)
        {
          // move to the left
          hidden_length = elem.scrollLeft/* + tabtiles_buttons_width*/;
          visible_length = _x - tabtiles_buttons_width;
          hidden_length += viewport_width * 0.1; // ensure it can easily move far enough

          if(visible_length > 0) per_px = hidden_length / visible_length;
          else per_px = 0;
          if(per_px < 0) per_px = 0;

          per_px = per_px * tabtiles_speedboost * tabtiles_max_mousemove_speed;

          if(per_px > tabtiles_max_mousemove_speed_perpx * tabtiles_max_mousemove_speed * viewport_width)
            per_px = tabtiles_max_mousemove_speed_perpx * tabtiles_max_mousemove_speed * viewport_width;

          add = Math.abs(x_change) * per_px;
          tabtiles_scrollLeft_float -= add;
          elem.scrollLeft = tabtiles_scrollLeft_float;
          //console.log('left: [' + tabtiles_scrollLeft_float + '] actual: [' + elem.scrollLeft + '] perpx: [' + per_px + ']');
        }

        // find the closest tab to this x
        // this is duplicated a little from above - but without the focusat_x
        // and it uses the object, not id
        var closest = null;
        for(var item in tabtiles_array)
        {
          if(tabtiles_array[item])
          {
            var item_rect = tabtiles_array[item].tabtiles_text.getBoundingClientRect();
            if((_x >= item_rect.left)&&(_x <= item_rect.right))
            {
              closest = tabtiles_array[item];
              break;
            }
          }
        }
        tabtiles_prepareTooltip(closest, true);

        // for short movements, best to save this here like this
        // that way it will only reset for the next time if it has actually
        // moved it - so if not, the mouse movement will carry over to next time
        if((tabtiles_scrollLeft_float != old_elem_scrollLeft)||((x_change != tabtiles_last_x_change)&&(x_change!=0)))
          tabtiles_lastmousex = e_x;
        tabtiles_last_x_change = x_change;

      }

    }

    // always need to do this if it isn't set
    // otherwise, it will never be
    if(tabtiles_lastmousex == -1) tabtiles_lastmousex = e_x;

    if(allowit && (tabtiles_reset_started_timerid != -1))
    {
      window.clearTimeout(tabtiles_reset_started_timerid);
      tabtiles_reset_started_timerid = -1;
      //console.log('prevent clear startedMove');
    }
  }

  var tabtiles_reset_started_timerid = -1;
  var tabtiles_address_blur = true;

  // switch back to mini view, or hide if set to auto-hide
  // this function is the end result of the timer - and can be called
  // from elsewhere if the affect needs to be immediate
  function tabtiles_mouseout_timercode()
  {
    if(!tabtiles_elem) return;

    if(tabtiles_onclick_closedisable_timerid != -1)
    {
      tabtiles_mouseout(1000); // reset for next time
      return;
    }

    //console.log('timer: ' + tabtiles_reset_started_timerid);
    tabtiles_startedMoveX = -1;
    tabtiles_startedMove = false;
    if(tabtiles_reset_started_timerid != -1)
      window.clearTimeout(tabtiles_reset_started_timerid);
    tabtiles_reset_started_timerid = -1;
    if(tabtiles_address_shown && !tabtiles_address_blur)
    {
      tabtiles_mouseout();
      return;
    }
    if(tabtiles_address_shown && tabtiles_address_blur)
    {
      tabtiles_address_toggle();
    }
    tabtiles_address_blur = false;

    if(!tabtiles_mouseovertooltip)
    {
      if(tabtiles_tooltip && !tabtiles_keyboardFocus_activated)
        tabtiles_prepareTooltip(null, false);

      if(options.autohide && (tabtiles_elem.style.display != 'none') && !tabtiles_keyboardFocus_activated)
      {
        tabtiles_showIt(false);
        tabtiles_saveScroll();
        return;
      }

      if(tabtiles_elem.style.display != 'none')
        if(!options.autohide && !tabtiles_keyboardFocus_activated)
        {
          if(!options.disableMiniView && (tabtiles_adjust_pctheight == tabtiles_adjust_pctheight_full))
          {
            tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_mini;
          }
          tabtiles_keyboardFocus = null;
          tabtiles_keyboardFocus_activated = false;
          if(!options.autohide && !options.disableMiniView && tabtiles_showForWindowState())
            tabtiles_resize_overrideNoUpdate = true;
          tabtiles_checkTileSize(/*false*/true, true); // changed to focus it back to the selected tab on the timeout
          tabtiles_saveScroll();
        }
      //console.log('cleared startedMove');
    }
  }

  // disable the options hide interval if it was over the bar
  var disable_options_interval = false;

  // set the timer for hiding it (the timer will run the above function)
  // this can be used elsewhere to start the timer
  function tabtiles_mouseout(specifyInterval)
  {
    if(tabtiles_reset_started_timerid != -1)
      window.clearTimeout(tabtiles_reset_started_timerid);
    tabtiles_reset_started_timerid = window.setTimeout(
      function()
      {
        tabtiles_mouseout_timercode();
      }, specifyInterval === undefined ? ((options.hideInterval !== undefined)&& !disable_options_interval ? options.hideInterval : 1500) : specifyInterval);
  }

  var tabtiles_backbutton_lastupdated = -1;
  function tabtiles_backbutton_update()
  {
    if(tabtiles_elem && tabtiles_elem.tabtiles_backbutton)
    {
      // only do it now and then, for performance
      var _date = new Date();
      var currenttime = _date.getTime();
      if((tabtiles_backbutton_lastupdated == -1)||(currenttime - tabtiles_backbutton_lastupdated > 1300))
      {
        tabtiles_backbutton_lastupdated = currenttime;
        // set it now
        var backmessage = 'Go back';
        var newtabmessage = 'New tab (Right click for alternate homepage)'

        if(enable_lasttabback_integration)
        {
            var lasttabback_div = document.getElementById("lasttabback_div");
            if(lasttabback_div) backmessage += ' (Right click to immediately go back to the tab\'s creator without closing this tab)';
        }
        //var firstbuttonmessage = '\n' + _date.getHours() + ':' + _date.getMinutes() + ' - ' + _date.toDateString();
        var _minutes = _date.getMinutes();
        var firstbuttonmessage = '\n' + _date.getHours() + ':' + (_minutes < 10 ? '0' : '') + _minutes + ' - ' + _date.toLocaleDateString();
        if(options.largeNewTab) newtabmessage += firstbuttonmessage;
        else backmessage += firstbuttonmessage;

        tabtiles_elem.tabtiles_backbutton.setAttribute('title', backmessage);
        tabtiles_elem.tabtiles_button_newtab.setAttribute('title', newtabmessage);
      }
    }
  }

  // actual event for setting the timer
  // don't use this from the code - use the previous function
  function tabtiles_mouseout_event()
  {
    tabtiles_lastmousex = -1;
    //tabtiles_scrollLeft_float = 0;
    tabtiles_mouseout();
    //console.log('mouseout_event');
  }

  // main elements
  // some don't need to be accessed globally, so aren't stored here
  var tabtiles_elem = null;
  var tabtiles_button = null;
  var tabtiles_array = [];
  var tabtiles_blankspacer = null;

  // look up the given tabid in the array
  function tabtiles_array_findtabid(tabId)
  {
    for(var item in tabtiles_array)
      if(tabtiles_array[item])
        if(tabtiles_array[item].tabtiles_id == tabId)
          return tabtiles_array[item];
    return null;
  }

  var tabtiles_savedMargin = null;

  var tabtiles_address = null;
  var tabtiles_address_show = null;
  var tabtiles_address_shown = false;

  /*if(enable_lasttabback_integration)
  {
      var lasttabbackExtensionId = 'oijipkokfkhgojikimbbcafnbppebnhe';
      if(chrome.i18n.getMessage("@@extension_id") != 'aaeapgfkbbbdpbfjmpcblemfajmkiddh')
          lasttabbackExtensionId = 'nbjnndlggoodbkifllnkdkfjecgmibei';
  }*/
  // set up the buttons and other components of the bar
  // if this doesn't need to be done at first (autohide), it will be delayed to improve
  // page load performance - until the user moves the mouse to the activation area
  function tabtiles_initComponents()
  {
    if(!options_loaded) return;

    tabtiles_elem = document.createElement('div');
    tabtiles_elem.setAttribute('id', 'tabtiles');
    tabtiles_elem.setAttribute('class', 'notranslate');
    tabtiles_elem.style.display = 'block';
    tabtiles_elem.onmousedown =
      function()
      {
        if(tabtiles_tooltip)
        {
          var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
          var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;
          if(event.x > tabtiles_buttons_width)
            tabtiles_onmousedown(tabtiles_tooltip);
        }
      };
    tabtiles_elem.onmouseup =
      function()
      {
        if(tabtiles_tooltip)
        {
          var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
          var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;
          if(event.x > tabtiles_buttons_width)
            tabtiles_onclick(tabtiles_tooltip);
        }
      };

    //window.addEventListener('mousemove', tabtiles_mousemove, false);
    window.addEventListener('mouseout', tabtiles_mouseout_event, false);

    document.body.appendChild(tabtiles_elem);

    tabtiles_button = document.createElement('div');
    tabtiles_button.setAttribute('id', 'tabtiles_buttons');
    tabtiles_button.onmousemove =
      function()
      {
        if(tabtiles_reset_started_timerid != -1)
        {
          window.clearTimeout(tabtiles_reset_started_timerid);
          tabtiles_reset_started_timerid = -1;
        }
      };
    document.body.appendChild(tabtiles_button);

    var tabtiles_backbutton = document.createElement('span');
    tabtiles_backbutton.setAttribute('class', 'tabtiles_button tabtiles_back');
    tabtiles_backbutton.innerHTML = '&lt;';
    tabtiles_backbutton.onclick =
      function()
      {
        event.stopPropagation();

        // check for lasttabback - if it is here, use that instead
        var lasttabback_div = document.getElementById("lasttabback_div");
        if(lasttabback_div && enable_lasttabback_integration && chrome.runtime)
        {
          //lasttabback_div.onclick("backkeydown");
          //lasttabback_div.onclick("backkeyup");

          var lasttabbackExtensionId = lasttabback_div.innerHTML.trim();

          chrome.runtime.sendMessage({
            name: 'lasttabbackExtensionId',
            lasttabbackExtensionId,
            __source__: "tabTilesMsg"
          }, {func: 'lasttabback_backkeydown'});
          chrome.runtime.sendMessage({
            name: 'lasttabbackExtensionId',
            lasttabbackExtensionId,
            __source__: "tabTilesMsg"
          }, {func: 'lasttabback_backkeyup'});
        }
        else history.back();
      }
    tabtiles_backbutton.oncontextmenu = // right click
      function()
      {
        event.stopPropagation();

        // check for lasttabback - if it is here, use that instead
        // but ctrl-back
        var lasttabback_div = document.getElementById("lasttabback_div");
        if(lasttabback_div && enable_lasttabback_integration && chrome.runtime)
        {
          //lasttabback_div.onclick("ctrlbackkeydown");
          //lasttabback_div.onclick("backkeyup");

          var lasttabbackExtensionId = lasttabback_div.innerHTML.trim();

          chrome.runtime.sendMessage({
            name: 'lasttabbackExtensionId',
            lasttabbackExtensionId,
            __source__: "tabTilesMsg"
          }, {func: 'lasttabback_ctrlbackkeydown'});
          chrome.runtime.sendMessage({
            name: 'lasttabbackExtensionId',
            lasttabbackExtensionId,
            __source__: "tabTilesMsg"
          }, {func: 'lasttabback_backkeyup'});
        }
        else history.back();
        return false;
      };
    tabtiles_elem.tabtiles_backbutton = tabtiles_backbutton;

    var tabtiles_forwardbutton = document.createElement('span');
    tabtiles_forwardbutton.setAttribute('class', 'tabtiles_button tabtiles_forward'
    + ((!options.enableAddressBar & options.largeNewTab) ? ' tabtiles_noaddress' : '')
    + ((!options.enableAddressBar & options.largeNewTab) ? ' tabtiles_endbutton' : ''));
    tabtiles_forwardbutton.innerHTML = '&gt;';
    tabtiles_forwardbutton.setAttribute('title', 'Go forward');
    tabtiles_forwardbutton.onclick =
      function()
      {
        event.stopPropagation();
        history.forward();
      }

    var tabtiles_button_sub = document.createElement('span');
    tabtiles_button_sub.setAttribute('class', 'tabtiles_button tabtiles_newtab'
    + ((!options.enableAddressBar & !options.largeNewTab) ? ' tabtiles_noaddress' : '')
    + ((!options.enableAddressBar & !options.largeNewTab) ? ' tabtiles_endbutton' : ''));
    tabtiles_button_sub.innerHTML = '+';
    tabtiles_button_sub.onclick = tabtiles_newtab;
    tabtiles_button_sub.oncontextmenu = tabtiles_newtab_alt;
    tabtiles_elem.tabtiles_button_newtab = tabtiles_button_sub;

    tabtiles_backbutton_update();
    tabtiles_backbutton_lastupdated = -1; // do it next time too

    if(!tabtiles_address && options.enableAddressBar)
    {
      tabtiles_address = document.createElement('span');
      //tabtiles_address_shown = false; // disabled this so it can show the bar and address when typing in text
      tabtiles_address.style.display = 'none';

      var tabtiles_address_cancel = document.createElement('span');
      tabtiles_address_cancel.setAttribute('class', 'tabtiles_button tabtiles_cancel');
      tabtiles_address_cancel.setAttribute('id', 'tabtiles_go_cancel');
      tabtiles_address_cancel.innerHTML = 'X';
      tabtiles_address_cancel.setAttribute('title', 'Close address / search bar (Right click to hide all of the tabtiles bar)');
      tabtiles_address_cancel.onclick = tabtiles_address_docancel;
      tabtiles_address_cancel.oncontextmenu = tabtiles_hide;
      tabtiles_address.appendChild(tabtiles_address_cancel);

      var tabtiles_address_home = document.createElement('span');
      tabtiles_address_home.setAttribute('class', 'tabtiles_button tabtiles_home');
      tabtiles_address_home.innerHTML = 'H';
      tabtiles_address_home.setAttribute('title', 'Home (Right click for alternate homepage)');
      tabtiles_address_home.onclick = tabtiles_address_home_click;
      tabtiles_address_home.oncontextmenu = tabtiles_address_alt_home_click;
      tabtiles_address.appendChild(tabtiles_address_home);

      var tabtiles_address_history = document.createElement('span');
      tabtiles_address_history.setAttribute('class', 'tabtiles_button tabtiles_history');
      tabtiles_address_history.innerHTML = '%';
      tabtiles_address_history.setAttribute('title', 'History');
      tabtiles_address_history.onclick = tabtiles_address_history_click;
      tabtiles_address_history.oncontextmenu = tabtiles_address_history_click;
      tabtiles_address.appendChild(tabtiles_address_history);

      var tabtiles_address_text = document.createElement('input');
      tabtiles_address_text.setAttribute('id', 'tabtiles_go_text');
      tabtiles_address_text.setAttribute('name', 'tabtiles_go_text');
      tabtiles_address_text.setAttribute('type', 'text');
      tabtiles_address_text.value = window.location;
      tabtiles_address_text.addEventListener('blur',
        function()
        {
          // why is it going into this even when it is showing it?
          if(tabtiles_address_shown)
          {
            tabtiles_address_blur = true;
            tabtiles_mouseout();
          }
        }, false);
      tabtiles_address_text.addEventListener('keydown',
        function(e)
        {
          if(tabtiles_address_shown)
          {
            if(e.keyCode == 13)
              tabtiles_address_go_click(e);
            if(e.keyCode == 27)
              tabtiles_address_docancel();
          }
        }, false);
      tabtiles_address.appendChild(tabtiles_address_text);
      tabtiles_address.tabtiles_text = tabtiles_address_text;

      var tabtiles_address_go = document.createElement('span');
      tabtiles_address_go.setAttribute('class', 'tabtiles_button tabtiles_go tabtiles_endbutton');
      tabtiles_address_go.innerHTML = '=';
      tabtiles_address_go.setAttribute('title', 'Go to location / Search');
      tabtiles_address_go.onclick = tabtiles_address_go_click;
      tabtiles_address_go.oncontextmenu = tabtiles_address_go_click;
      tabtiles_address.appendChild(tabtiles_address_go);

      tabtiles_address_show = document.createElement('span');
      tabtiles_address_show.setAttribute('class', 'tabtiles_button tabtiles_address tabtiles_endbutton');
      //tabtiles_address_show.setAttribute('accesskey', '\\');
      // would be better to have a dedicated global key - perhaps configurable
      // (and only work when not in a form? possibly an option for this)
      // also: it should show the bar when this happens if set to auto-hide.
      // can't do this until it has a global key though
      tabtiles_address_show.innerHTML = '_'; // ok for now
      var msg = 'Show address / search bar\n(Double right click to hide tabtiles)';
      if(tabtiles_hiding_horizontalScrollbar) msg += '\nThis will also show the horizontal scrollbar if there is one';
      tabtiles_address_show.setAttribute('title', msg);
      tabtiles_address_show.onclick = tabtiles_address_toggle;
      tabtiles_address_show.oncontextmenu = tabtiles_address_toggle;
    }

    if(options.largeNewTab)
    {
      //console.log('tabtiles - init - largeNewTab on');
      tabtiles_button.appendChild(tabtiles_button_sub); // new tab
      tabtiles_button.appendChild(tabtiles_backbutton);
      tabtiles_button.appendChild(tabtiles_forwardbutton);
    }
    else
    {
      //console.log('tabtiles - init - largeNewTab off');
      tabtiles_button.appendChild(tabtiles_backbutton);
      tabtiles_button.appendChild(tabtiles_forwardbutton);
      tabtiles_button.appendChild(tabtiles_button_sub); // new tab
    }
    if(tabtiles_address)
    {
      tabtiles_button.appendChild(tabtiles_address);
      tabtiles_button.appendChild(tabtiles_address_show);
    }

    var tabtiles_endspacer = document.createElement('span');
    tabtiles_endspacer.setAttribute('class', 'tabtiles_button tabtiles_endspacer');
    tabtiles_endspacer.innerHTML = ' ';
    tabtiles_button.appendChild(tabtiles_endspacer);

    if(window.addEventListener)
      tabtiles_elem.addEventListener('mousewheel', wheel, true);

    if(debug)console.log('tabtiles - load');

    // first run
    tabtiles_resizetimer_firstrun = true;
    tabtiles_resizetimer_tick();
  }

  function tabtiles_address_docancel()
  {
    var elem = document.getElementById('tabtiles_go_text');
      if(elem) elem.value = window.location;
    tabtiles_address_toggle();
  }

  // manual hide of the bar - on right clicking the X in the address bar
  // pressing the address activation keys will show it again
  // it will also appear once again on reloading the page / navigating to another (it isn't persistent)
  function tabtiles_hide()
  {
    tabtiles_manualhide = true;
    tabtiles_elem.style.display = 'none';
    tabtiles_button.style.display = 'none';
    if(tabtiles_isAt == 'top') document.body.style.marginTop = tabtiles_savedMargin;
    if(tabtiles_isAt == 'bottom') document.body.style.marginBottom = tabtiles_savedMargin;
    tabtiles_prepareTooltip(null, false);
    return false;
  };

  document.addEventListener('mousemove',
    function()
    {
      // this is for if it doesn't call onload correctly
      if(document.body && !options_loaded)
        loadOptions(tabtiles_load_afteroptions);
    }, false);

  // main page load event
  // code has been moved to the following function now
  // as a callback from loading the options - this seems a more reliable way to do it
  window.addEventListener('load',
    function()
    {
      if(document.body && !options_loaded)
        loadOptions(tabtiles_load_afteroptions);
    }, false);

  var tabtiles_hiding_horizontalScrollbar = false;

  // main page load callback function
  // this is run after the options are loaded,
  // to ensure that it has the options ok before setting things up
  function tabtiles_load_afteroptions()
  {
    if(options.disableMiniView)
      tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;

    if(options.hideHorizontalScrollbar && (options.showat == 'bottom')
    && !startsWith(new String(window.location).toLowerCase(), 'https://'))
    // disabled this for https too, as google's pages seem to have problems with it
      tabtiles_hiding_horizontalScrollbar = true;

    // do this in the manifest instead
    // no, actually - chrome seems to unload it when on a different tab
    // but the manifest load does seem to appear faster at first
    // so - no harm loading it BOTH WAYS?.. best of both
    loadjscssfile(chrome.extension.getURL('tabtiles/tabtiles.css'), 'css');

    //loadjscssfile(chrome.extension.getURL('jquery-1.8.0.min.js'), 'js');

    // need to calculate the initial height, if set to autohide
    if(options.autohide)
    {
      tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;

      var viewport = getViewport();
      var calcheight = Math.floor((viewport.bottom - viewport.top) * options.pctheight);
      if(calcheight < options.minheight) calcheight = options.minheight;
      if(calcheight > options.maxheight) calcheight = options.maxheight;
      calcheight = calcheight * tabtiles_adjust_pctheight;
      if(calcheight < minheight_mini) calcheight = minheight_mini;
      tabtiles_height_raw = calcheight;
    }

    // mouse move sensitivity options
    switch(options.sensitivity)
    {
      case '0':
        tabtiles_max_mousemove_speed = tabtiles_max_mousemove_speed_normal;
        break;
      case '1':
        tabtiles_max_mousemove_speed = tabtiles_max_mousemove_speed_slow;
        break;
      case '2':
        tabtiles_max_mousemove_speed = tabtiles_max_mousemove_speed_fast;
        break;
    }

    window.addEventListener('mousemove', tabtiles_mousemove, false);
    /*window.addEventListener('mouseout',
      function()
      {
        tabtiles_dragging = false; // this is getting triggered all the time for some reason??
        tabtiles_dragstartx = -1;
      }, false);*/
    window.addEventListener('mouseup',
      function()
      {
        if(tabtiles_dragging)
          tabtiles_dragging_timer(); // this resets it
      }, false);

    window.addEventListener('keydown', tabtiles_keydown, false);

    window.addEventListener('click',
      function()
      {
        tabtiles_keyboardFocus_activated = false;
        tabtiles_mouseout();
      }, false);

    //chrome.runtime.sendMessage({name: 'set_fullscreen',__source__: "tabTilesMsg"});
    // seems to be a bug - it won't allow this to work in metro
    // so not much point
    // might add a way to save what the state is, so it can set it itself?
    // perhaps only on the first window created?

    tabtiles_getWindowState(
      function()
      {
        tabtiles_checkTileSize(true, true, true);
      });

  }

  // find out if a form element is editable
  // this allows it to disable type-to-search if a form element is selected already
  function isFormTag(tag)
  {
    if(!tag)return false;
    if(tag.tagName == "INPUT")return true;
    if(tag.tagName == "TEXTAREA")return true;
    if(tag.tagName == "SELECT")return true;
    if(tag.tagName == "BUTTON")return true;
    if(tag.isContentEditable)return true;
    return false;
  }

  // main key press event
  // first part is type-to-search
  // then cancel edit, left / right tab navigation
  function tabtiles_keydown(e)
  {
    if(options.disableKeyboard) return;

    if((document.activeElement)&&(isFormTag(document.activeElement))&&(document.activeElement.id != 'tabtiles_go_text'))
      return;

    if(!event.altKey && !event.ctrlKey && ((event.keyCode >= 65) && (event.keyCode <= 90)))
    {
      if(options.disableTTS) return;
      if(!tabtiles_address_shown && options.enableAddressBar)
      {
        tabtiles_address_shown = true;
        tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;
        tabtiles_showIt(true);
        tabtiles_address_shown = false;
        tabtiles_address_toggle();
        var elem = document.getElementById('tabtiles_go_text');
        if(elem)
          // since keycodes "are" uppercase, if shift is not pressed then convert to lowercase
          // this won't work correctly if caps lock is on, but better than nothing
          if(!event.shiftKey)
            elem.value = String.fromCharCode(event.keyCode).toLowerCase();
          else elem.value = String.fromCharCode(event.keyCode);
        e.preventDefault();
        return;
      }
    }

    switch(event.keyCode)
    {
      case 220: // Alt+\ for address
      case 117: // F6, but only when in full screen

        var doit = false;
        if((event.keyCode == 117) && (tabtiles_windowState == 'fullscreen')) doit = true;
        if((event.keyCode == 220) && event.altKey) doit = true;
        if(doit && options.enableAddressBar)
        {
          if(!tabtiles_address_shown)
          {
            tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;
            tabtiles_manualhide = false;
            tabtiles_showIt(true);
            tabtiles_address_toggle();
            e.preventDefault();
          }
          else
          {
            tabtiles_address_toggle();
            e.preventDefault();
          }
        }

        break;

      case 13: // enter

        if(tabtiles_keyboardFocus_activated)
        {
          for(var tabtile in tabtiles_array)
          {
            if(tabtiles_array[tabtile])
              if(tabtiles_array[tabtile].tabtiles_id === tabtiles_keyboardFocus)
              {
                tabtiles_showIt(true);
                tabtiles_prepareTooltip(null, false);
                tabtiles_saveScroll();
                tabtiles_mousedown_overtile = true; // 20141005
                tabtiles_doclick(tabtiles_array[tabtile]);
                e.preventDefault();
                break;
              }
          }
        }
        break;

      case 27: // cancel (esc)

        if(tabtiles_keyboardFocus_activated)
        {
          if(tabtiles_address_shown) tabtiles_address_blur = true;
          tabtiles_keyboardFocus_activated = false;
          tabtiles_keyboardFocus = null;
          tabtiles_mouseout_timercode();
        }

        break;

      case 46: // delete - close tab

        if(tabtiles_keyboardFocus_activated)
        {
          var sel_tabtile = tabtiles_array_findtabid(tabtiles_keyboardFocus);
          if(sel_tabtile)
          {
            if(tabtiles_onclick_closedisable_tabtile
            && (tabtiles_onclick_closedisable_tabtile == sel_tabtile))
              tabtiles_close(tabtiles_keyboardFocus);
            else
               tabtiles_clickto('del', sel_tabtile);
          }
        }

        break;

      case 37: // left

        if(options.disableKeyNav) return;
        if(!tabtiles_showForWindowState()) return;
        if(event.ctrlKey || event.shiftKey)return;
        if((document.activeElement)&&(document.activeElement.id == 'tabtiles_go_text')
        && tabtiles_address_shown)
          return; // don't allow when the address is selected

        if(!event.altKey)
        {
          tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;

          if(((tabtiles_elem === null) || (tabtiles_keyboardFocus === null))
          && tabtiles_showForWindowState())
          {
            tabtiles_showIt(true);
            tabtiles_checkTileSize(tabtiles_keyboardFocus, true, undefined, undefined,
              function()
              {
                tabtiles_keydown_left(e);
              });
            e.preventDefault();
            break;
          }
          tabtiles_keydown_left(e);
        }

        break;

      case 39: // right

        if(options.disableKeyNav) return;
        if(!tabtiles_showForWindowState()) return;
        if(event.ctrlKey || event.shiftKey)return;
        if((document.activeElement)&&(document.activeElement.id == 'tabtiles_go_text')
        && tabtiles_address_shown)
          return; // don't allow when the address is selected

        if(!event.altKey)
        {
          tabtiles_adjust_pctheight = tabtiles_adjust_pctheight_full;

          if(((tabtiles_elem === null) || (tabtiles_keyboardFocus === null))
          && tabtiles_showForWindowState())
          {
            tabtiles_showIt(true);
            tabtiles_checkTileSize(tabtiles_keyboardFocus, true, undefined, undefined,
              function()
              {
                tabtiles_keydown_right(e);
              });
            e.preventDefault();
            break;
          }
          tabtiles_keydown_right(e);
        }

        break;

      // on using page navigation keys (other than left / right)
      // hide the bar and tooltips if tabtiles keyboard navigation is active
      case 38: // up
      case 40: // down
      case 32: // space
      case 33: // page up
      case 34: // page down
      case 36: // home
      case 35: // end

        // similar to cancel, but don't do it if the address bar is shown
        if(!event.altKey)
        {
          if(tabtiles_keyboardFocus_activated && !tabtiles_address_shown)
          {
            tabtiles_keyboardFocus_activated = false;
            tabtiles_keyboardFocus = null;
            tabtiles_mouseout_timercode();
          }
        }
        break;
    }
  }

  // these two needed to be moved out so they can be run in a callback AND in
  // the normal flow
  function tabtiles_keydown_left(e)
  {
    if(tabtiles_keyboardFocus !== null)
    {
      var last_tabtile = null;
      var show_tabtile = null;
      for(var tabtile in tabtiles_array)
      {
        if(tabtiles_array[tabtile])
        {
          if(tabtiles_array[tabtile].tabtiles_id === tabtiles_keyboardFocus)
          {
            // if there was a last tile, show that
            // otherwise, show the selected one
            if(last_tabtile)
            {
              show_tabtile = last_tabtile;
              e.preventDefault();
            }
            else
            {
              show_tabtile = tabtiles_array[tabtile];
            }
            break;
          }
          last_tabtile = tabtiles_array[tabtile];
        }
      }
      // need to disable the hide-timer
      /*if(tabtiles_reset_started_timerid != -1)
        window.clearTimeout(tabtiles_reset_started_timerid);*/

      // show the bar
      tabtiles_keyboardFocus = show_tabtile.tabtiles_id;
      tabtiles_keyboardFocus_activated = true;
      if(!options.autohide && !options.disableMiniView && tabtiles_showForWindowState())
        tabtiles_resize_overrideNoUpdate = true;
      tabtiles_showIt(true);
      tabtiles_checkTileSize(tabtiles_keyboardFocus, true, undefined, undefined,
        function(){tabtiles_prepareTooltip(show_tabtile, true, true);});
    }
  }

  function tabtiles_keydown_right(e)
  {
    if(tabtiles_keyboardFocus !== null)
    {
      var last_tabtile_issel = false;
      var show_tabtile = null;
      var sel_tabtile = null;
      for(var tabtile in tabtiles_array)
      {
        if(tabtiles_array[tabtile])
        {
          if(last_tabtile_issel)
          {
            show_tabtile = tabtiles_array[tabtile];
            break;
          }
          if(tabtiles_array[tabtile].tabtiles_id === tabtiles_keyboardFocus)
          {
            last_tabtile_issel = true;
            sel_tabtile = tabtiles_array[tabtile];
          }
        }
      }
      if(show_tabtile === null)
      {
        show_tabtile = sel_tabtile;
      }
      else e.preventDefault();

      // need to disable the hide-timer
      /*if(tabtiles_reset_started_timerid != -1)
        window.clearTimeout(tabtiles_reset_started_timerid);*/

      // show the bar
      tabtiles_keyboardFocus = show_tabtile.tabtiles_id;
      tabtiles_keyboardFocus_activated = true;
      if(!options.autohide && !options.disableMiniView && tabtiles_showForWindowState())
        tabtiles_resize_overrideNoUpdate = true;
      tabtiles_showIt(true);
      tabtiles_checkTileSize(tabtiles_keyboardFocus, true, undefined, undefined,
        function(){tabtiles_prepareTooltip(show_tabtile, true, true);});
    }
  }

  // toggle the address bar, based on its current state
  function tabtiles_address_toggle()
  {
    if(event)event.stopPropagation();
    tabtiles_keyboardFocus_activated = false;
    tabtiles_keyboardFocus = null;
    tabtiles_address_blur = false;
    tabtiles_address.style.display = tabtiles_address_shown ? 'none' : 'inline';
    tabtiles_address_show.style.display = tabtiles_address_shown ? 'inline' : 'none';
    tabtiles_address_shown = !tabtiles_address_shown;
    if(!options.autohide && !options.disableMiniView && tabtiles_showForWindowState())
      tabtiles_resize_overrideNoUpdate = true;

    if(tabtiles_hiding_horizontalScrollbar)
      if(tabtiles_address_shown)document.body.style.overflowX = '';
      else document.body.style.overflowX = 'hidden';

    tabtiles_checkTileSize(false, true);
    if(tabtiles_address_shown)
    {
      tabtiles_address.tabtiles_text.focus();
      tabtiles_address.tabtiles_text.select();
    }
    return false;
  }

  // string helpers
  function startsWith(this_str, search_str)
  {
    return this_str.slice(0, search_str.length) == search_str;
  }

  function endsWith(this_str, search_str)
  {
    return this_str.slice(-search_str.length) == search_str;
  }

  // navigate to url
  function goToURL(url)
  {
    if(debug)console.log('tabtiles - go to: ' + url);
    window.location = url;
  }

  // run a search - handles either running it in this page or opening a new tab
  function doSearch(text)
  {
    var sp = tabtiles_getSearchProvider(options.searchProvider);
    if(!sp)
      var search_engine = 'http://www.google.com/search?q=';
    else
      search_engine = sp.url;
      if(search_engine == '')
        search_engine = options.searchProvider_custom;

    if(debug)console.log('tabtiles - searching for [' + text + ']');

    // open in this tab
    if(!options.searchInNewTab)
      goToURL(search_engine + text);
    else
      // or a new tab
      chrome.runtime.sendMessage({name: 'goToURL', url: search_engine + text, __source__: "tabTilesMsg"});
  }

  // address bar GO clicked - go to url or search
  // this tries to auto-detect what the user wants to do based on the search string
  function tabtiles_address_go_click(e)
  {
    var elem = document.getElementById('tabtiles_go_text');

    if(elem)
    {

      var go_text = elem.value;
      var go_text_tolower = go_text.toLowerCase();

      if(e && e.ctrlKey)
        if(go_text_tolower.indexOf(' ') == -1) // not if there is a space
        {
          if(!endsWith(go_text_tolower, '.com'))
          {
            go_text += '.com';
            go_text_tolower += '.com';
          }
          if(!startsWith(go_text_tolower, 'www.'))
          {
            go_text = 'www.' + go_text;
            go_text_tolower = 'www.' + go_text;
          }
        }

      // hide it
      tabtiles_address_toggle();

      var isAddress = false;
      var isAddress_noprotocol = false;

      // need to decide if it is an address, or keywords to search for
      // first, starts with protocol - could use more, but ok for now
      if((startsWith(go_text_tolower, 'http://')
      || startsWith(go_text_tolower, 'https://')
      /*|| startsWith(go_text_tolower, 'chrome://')*/) // won't allow chrome links to work, so disabled it
      &&(go_text_tolower.indexOf(' ', 0) == -1))
        isAddress = true;
      if((go_text_tolower.indexOf(' ', 0) == -1) && (go_text_tolower.indexOf('.', 0) != -1))
        isAddress_noprotocol = true;

      elem.value = window.location;
      if(isAddress)
      {
        if(!options.addressInNewTab)
          // open in this tab
          goToURL(go_text);
        else
          // or a new tab
          chrome.runtime.sendMessage({name: 'goToURL', url: go_text, __source__: "tabTilesMsg"});
      }
      else
        if(isAddress_noprotocol)
        {
          if(!options.addressInNewTab)
            // open in this tab
            goToURL('http://' + go_text);
          else
            // or a new tab
            chrome.runtime.sendMessage({name: 'goToURL', url: 'http://' + go_text, __source__: "tabTilesMsg"});

        }
        else doSearch(go_text);

    }

    return false;
  }

  // extra checking for resize - it doesn't always get it correctly just from
  // the onresize event
  var tabtiles_resizetimer_id = -1;
  var tabtiles_resizetimer_firstrun = false;
  function tabtiles_resizetimer_tick()
  {
    if(tabtiles_resizetimer_id != -1) window.clearTimeout(tabtiles_resizetimer_id);
    tabtiles_resizetimer_id = window.setTimeout(tabtiles_resizetimer_tick,
      tabtiles_resizetimer_firstrun ? 750 : 4000); // on first run, shorter timer
    tabtiles_backbutton_update();
    tabtiles_getWindowState(
      function()
      {
        if(tabtiles_button)
        {
          var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
          var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;
          if(tabtiles_last_buttons_width != tabtiles_buttons_width)
          {
            tabtiles_checkTileSize(true, true);
            return;
          }
        }
        if(!tabtiles_manualhide)
          tabtiles_checkTileSize(false, false);
      });
  }

  // display the tooltip popup on mouse over of tiles
  // also updates this in the global mouse move event, but it DOES seem to need both
  function tabtiles_text_onmouseover()
  {
    var sel_tabtile = null;
    if(event.target.tabtiles_id)
      sel_tabtile = event.target;
    else
      if(event.target.tabtiles_ownertile)
        sel_tabtile = event.target.tabtiles_ownertile;
      else
        if(event.target.parentElement.tabtiles_id)
          sel_tabtile = event.target.parentElement;
        else if(event.target.parentElement.tabtiles_ownertile)
          sel_tabtile = event.target.parentElement.tabtiles_ownertile;
    tabtiles_lastmouseover = sel_tabtile;
    if(sel_tabtile) tabtiles_prepareTooltip(sel_tabtile, true);
  }

  function tabtiles_text_rightclick()
  {
    event.stopPropagation();

    var sel_tabtile = null;
    if(event.target.tabtiles_id)
      sel_tabtile = event.target;
    else
      if(event.target.tabtiles_ownertile)
        sel_tabtile = event.target.tabtiles_ownertile;
      else
        if(event.target.parentElement.tabtiles_id)
          sel_tabtile = event.target.parentElement;
        else if(event.target.parentElement.tabtiles_ownertile)
          sel_tabtile = event.target.parentElement.tabtiles_ownertile;

    if(sel_tabtile)
      chrome.runtime.sendMessage({
        __source__: "tabTilesMsg", name: 'pinTab',
        tabId: sel_tabtile.tabtiles_id, pinned: !sel_tabtile.tabtiles_pinned});

    tabtiles_onclick_disableforright = true;

    return false;
  }

  // create the components required for a tile
  // setting the identifying values is done separately now,
  // to allow non-destructive updates
  function tabtiles_createTile_createComponents()
  {
    var newtile = document.createElement('div');

    newtile.onselectstart = function(){return false;};
    //newtile.onclick = tabtiles_onclick;
    newtile.onmouseup = tabtiles_onclick;
    newtile.onmousedown = tabtiles_onmousedown;

    /*if(document.doctype)*/ newtile.style.top = '0';
    // only add the "top: 0.16em" if no doctype ** actually, setting fontsize
    // for the bar seems to have fixed it? remove the css definition later if so **

    newtile_contentdiv = document.createElement('div');
    newtile_contentdiv.tabtiles_ownertile = newtile;
    newtile_contentdiv.setAttribute('class', 'tabtiles_contentdiv');
    newtile.tabtiles_contentdiv = newtile_contentdiv;
    newtile_contentdiv.onmouseover = tabtiles_text_onmouseover;
    newtile_contentdiv.oncontextmenu = //tabtiles_text_rightclick;
      function(){event.stopPropagation();return false};
    newtile.appendChild(newtile_contentdiv);

    newtile_icon = document.createElement('img');
    newtile.tabtiles_icon = newtile_icon;
    newtile_icon.setAttribute('class', 'tabtiles_favicon');
    //newtile_icon.onclick = tabtiles_onclick;
    newtile_icon.onmouseup = tabtiles_onclick;
    newtile_icon.onmousedown = tabtiles_onmousedown;
    newtile_icon.onmouseover = tabtiles_text_onmouseover;
    newtile_icon.oncontextmenu = //tabtiles_text_rightclick;
      function(){event.stopPropagation();return false};
    newtile_icon.tabtiles_ownertile = newtile;
    newtile_contentdiv.appendChild(newtile_icon);

    newtile_text = document.createElement('span');
    newtile_text.setAttribute('class', 'tabtiles_text');
    //newtile_text.onclick = tabtiles_onclick;
    newtile_text.onmouseup = tabtiles_onclick;
    newtile_text.onmousedown = tabtiles_onmousedown;
    newtile_text.tabtiles_ownertile = newtile;
    newtile_text.oncontextmenu = //tabtiles_text_rightclick;
      function(){event.stopPropagation();return false};
    newtile_text.onmouseover = tabtiles_text_onmouseover;
    /*newtile_text.onmousemove =
      function()
      {
        var sel_tabtile = null;
        if(event.target.tabtiles_id)
          sel_tabtile = event.target;
        else
          if(event.target.tabtiles_ownertile)
            sel_tabtile = event.target.tabtiles_ownertile;
        if(sel_tabtile) tabtiles_prepareTooltip(sel_tabtile, true);
      }*/
    newtile.tabtiles_text = newtile_text;
    newtile_contentdiv.appendChild(newtile_text);

    newtile_close = document.createElement('span');
    newtile_close.setAttribute('class', 'tabtiles_close');
    newtile_close.innerHTML = 'X.';
    newtile_close.setAttribute('title', 'Close Tab');
    newtile_close.onmouseup =
      function()
      {
        event.stopPropagation();
        tabtiles_dragging = false;
        tabtiles_dragstartx = -1;
        return false
      };
    newtile_close.onclick =
      function()
      {
        tabtiles_close(event.target.tabtiles_ownertile.tabtiles_id)
      };
    newtile_close.tabtiles_ownertile = newtile;
    newtile_close.onmouseover = tabtiles_text_onmouseover;
    newtile.tabtiles_close = newtile_close;
    newtile_contentdiv.appendChild(newtile_close);

    var newtile_shadow = document.createElement('span');
    newtile_shadow.setAttribute('class', 'tabtiles_tile tabtiles_shadow');
    newtile.tabtiles_shadow = newtile_shadow;

    newtile_shadow_contentdiv = document.createElement('span');
    newtile_shadow_contentdiv.setAttribute('class', 'tabtiles_contentdiv');
    newtile_shadow.appendChild(newtile_shadow_contentdiv);

    newtile_shadow_icon = document.createElement('img');
    newtile.tabtiles_shadow_icon = newtile_shadow_icon;
    newtile_shadow_icon.setAttribute('class', 'tabtiles_favicon');
    newtile_shadow_contentdiv.appendChild(newtile_shadow_icon);

    newtile_shadow_text = document.createElement('span');
    newtile_shadow_text.tabtiles_ownertile = newtile;
    newtile_shadow_contentdiv.appendChild(newtile_shadow_text);
    newtile_shadow.tabtiles_text = newtile_shadow_text;

    newtile_shadow_close = document.createElement('span');
    newtile_shadow_close.setAttribute('class', 'tabtiles_close');
    newtile_shadow_close.innerHTML = 'X.';
    newtile.tabtiles_shadow_close = newtile_shadow_close;
    newtile_shadow_contentdiv.appendChild(newtile_shadow_close);

    tabtiles_elem.appendChild(newtile);
    tabtiles_elem.appendChild(newtile_shadow);

    return newtile;
  }

  // set the identifying features of a tile
  // this is done separately here to allow non-destructive updates
  function tabtiles_createTile_updateComponents(newtile, tab, isSelected)
  {
    var newtile_class = 'tabtiles_tile tabtiles_main';
    if(isSelected)
      newtile_class += ' tabtiles_sel';
    if((tabtiles_keyboardFocus_activated || tabtiles_dragging)
    && (tabtiles_keyboardFocus === tab.id)/*&& !isSelected*/)
      newtile_class += ' tabtiles_keyboardsel';
    newtile.setAttribute('class', newtile_class);
    newtile.style.fontSize = tabtiles_elem.tabtiles_height;
    newtile.style.height = tabtiles_elem.tabtiles_height;
    newtile.style.lineHeight = tabtiles_elem.tabtiles_height;
    newtile.tabtiles_shadow.style.fontSize = tabtiles_elem.tabtiles_height;
    /*if(tabtiles_height_raw <= 12)
      newtile.tabtiles_text.style.color = 'transparent';
    else newtile.tabtiles_text.style.color = '';*/

    var hasChanged = false;
    newtile.tabtiles_id = tab.id;
    if(startsWith(tab.url.toLowerCase(), 'https://') && !isSelected)
    {
      newtile.tabtiles_url = '[Address hidden]';
      newtile.tabtiles_title = tabtiles_tooltip_clip(tab.title, 1) + ' - Secure page';
    }
    else
    {
      newtile.tabtiles_url = tab.url;

      // if the url is the same as the title (ie it doesn't have a title),
      // then don't show the full address - it shows it as the 2nd line in the popup hint anyway
      // this is mainly so that pdfs don't have tabs that take up too much space
      // now that it allows click-through over the non-tab areas (so you can click on the
      // chrome pdf viewer buttons - if there isn't too many tabs)

      // decided to add a check for pdfs too - but it will only work if the page ends in .pdf
      if(tab.title.substring(tab.title.length - 4).toLowerCase() == '.pdf')
          newtile.tabtiles_title = 'PDF Document';
      else
        if((tab.url == 'http://' + tab.title) || (tab.url == 'https://' + tab.title) || (tab.url == 'ftp://' + tab.title))
        {
            /*if(tab.title.length > 20)
              newtile.tabtiles_title = tab.title.substring(0, 20);
            else newtile.tabtiles_title = tab.title;*/
            // rather than clipping it, show a message - that will make it shorter
            newtile.tabtiles_title = 'Untitled';
        }
        else newtile.tabtiles_title = tab.title;
    }
    //newtile.setAttribute('title', tab.title + '\n' + tab.url);

    var newtile_icon_id = 'tabtiles_icon_' + tab.id;
    newtile.tabtiles_icon.setAttribute('id', newtile_icon_id);
    newtile.tabtiles_shadow_icon.setAttribute('id', newtile_icon_id + '_shadow');
    newtile.tabtiles_icon.setAttribute('class', 'tabtiles_favicon');
    newtile.tabtiles_shadow_icon.setAttribute('class', 'tabtiles_favicon');

    newtile.tabtiles_pinned = tab.pinned;

    newtile.tabtiles_close.style.display = newtile.tabtiles_pinned ? 'none' : 'inline';
    newtile.tabtiles_shadow_close.style.display = newtile.tabtiles_pinned ? 'none' : 'inline';

    // set both the main and shadow icons here, to save processing (only has to prep it once)
    chrome.runtime.sendMessage(
        {'name': 'getFavIcon', 'url': tab.url, 'img_id': newtile_icon_id, __source__: "tabTilesMsg"},
      function(response)
      {
        var img_elem = document.getElementById(response.img_id);
        if(img_elem)
        {
          img_elem.src = response.img_data;
          //img_elem.setAttribute('class', 'tabtiles_favicon');
        }
        img_elem = document.getElementById(response.img_id + '_shadow');
        if(img_elem)
        {
          img_elem.src = response.img_data;
          //img_elem.setAttribute('class', 'tabtiles_favicon');
        }
      });

  }

  // create a tile - this does both the create AND the update
  function tabtiles_createTile(tab, isSelected)
  {
    var newtile = tabtiles_createTile_createComponents();

    tabtiles_createTile_updateComponents(newtile, tab, isSelected);

    return newtile;
  }

  var tabtiles_tooltip = null;
  var tabtiles_tooltip_tabtile_id = -1; // the current tile

  // clip a string to a particular length, adding ".." to the end
  // this is just used for the tooltip, not for clipping the main tab text
  function tabtiles_tooltip_clip(thisstr, cliplength)
  {
    if(thisstr.length > cliplength)
      return thisstr.substring(0, cliplength) + ' ..';
    else return thisstr;
  }

  var tabtiles_tooltip_maxtitle = 128;
  var tabtiles_tooltip_maxurl = 72;

  // this function sets the tooltip to shadow a particular tile
  // it also auto-creates the tooltip element if it hasn't been created yet
  function tabtiles_prepareTooltip(tabtile_elem, showit, forcePositioning)
  {
    if(options.disableTooltip) return;

    if(!tabtiles_elem) return;

    if(!tabtiles_tooltip)
    {
      tabtiles_tooltip = document.getElementById('tabtiles_tooltip');
      if(!tabtiles_tooltip)
      {
        // autocreate
        tabtiles_tooltip = document.createElement('div');
        tabtiles_tooltip.setAttribute('id', 'tabtiles_tooltip');
        //tabtiles_tooltip.setAttribute('class', 'notranslate');
        tabtiles_tooltip.onmouseup = tabtiles_onclick;
        tabtiles_tooltip.onmousedown = function(){tabtiles_mousedown_overtile = true;};
        tabtiles_tooltip.onselectstart = function(){return false;};
        tabtiles_tooltip.onmouseover = function(){tabtiles_mouseovertooltip = true};
        tabtiles_tooltip.onmouseout = function(){tabtiles_mouseovertooltip = false};

        var line = document.createElement('div');
        line.onclick = tabtiles_onclick;
        line.setAttribute('id', 'tabtiles_tooltip_line1');
        line.innerHTML = '&nbsp;';
        tabtiles_tooltip.appendChild(line);
        tabtiles_tooltip.tabtiles_line1 = line;

        var line = document.createElement('div');
        line.onclick = tabtiles_onclick;
        line.setAttribute('id', 'tabtiles_tooltip_line2');
        line.innerHTML = '&nbsp;';
        tabtiles_tooltip.appendChild(line);
        tabtiles_tooltip.tabtiles_line2 = line;

        document.body.appendChild(tabtiles_tooltip);
      }
    }

    if(tabtiles_tooltip)
    {
      if(!tabtile_elem) tabtile_elem = tabtiles_array_findtabid(tabtiles_tooltip_tabtile_id);
      if(!tabtile_elem)
        showit = false;
      if(showit === undefined)
        showit = tabtiles_tooltip_tabtile_id !== -1;

      var haschanged = (showit != (tabtiles_tooltip.style.display != 'none'));
      tabtiles_tooltip.style.display = showit ? 'block' : 'none';
      if(tabtile_elem && showit)
      {
        if(tabtiles_tooltip_tabtile_id != tabtile_elem.tabtiles_id)
          haschanged = true;
        tabtiles_tooltip_tabtile_id = tabtile_elem.tabtiles_id;
        tabtiles_tooltip.tabtiles_line1.tabtiles_ownertile = tabtile_elem;
        tabtiles_tooltip.tabtiles_line2.tabtiles_ownertile = tabtile_elem;
        tabtiles_tooltip.tabtiles_ownertile = tabtile_elem;
        var temp = htmlentities(tabtiles_tooltip_clip(tabtile_elem.tabtiles_title, tabtiles_tooltip_maxtitle))
          + (tabtile_elem.tabtiles_pinned ? ' [Pinned tab - Right click to expand]' : '');
        if(tabtiles_tooltip.tabtiles_line1.innerHTML != temp)
        {
          haschanged = true;
          tabtiles_tooltip.tabtiles_line1.innerHTML = temp;
        }
        var temp = htmlentities(tabtiles_tooltip_clip(tabtile_elem.tabtiles_url, tabtiles_tooltip_maxurl));
        if(tabtiles_tooltip.tabtiles_line2.innerHTML != temp)
        {
          haschanged = true;
          tabtiles_tooltip.tabtiles_line2.innerHTML = temp;
        }

        var tabtile_rect = tabtile_elem.tabtiles_contentdiv.getBoundingClientRect();
        var tooltip_rect = tabtiles_tooltip.getBoundingClientRect();
        var havesetit = false;

        tabtiles_tooltip.style.textAlign = 'left';
        if(options.centerTiles && (!tabtile_elem.tabtiles_pinned || (tabtiles_nonpinnedcount == 0)))
        {
          if(options.centerTooltip)
            tabtiles_tooltip.style.textAlign = 'center'; // always if centered
          var tabtiles_elem_rect = tabtiles_elem.getBoundingClientRect();
          if((tabtiles_elem.scrollWidth - 5) <= (tabtiles_elem_rect.right - tabtiles_elem_rect.left))
          {
            temp =
              (tabtile_rect.left
              + ((tabtile_rect.right - tabtile_rect.left) / 2)
              - ((tooltip_rect.right - tooltip_rect.left) / 2));
            if(temp < 0) temp = 0;
            if(haschanged || forcePositioning)
            {
              tabtiles_tooltip.style.left = temp + 'px';
              //tabtiles_tooltip.style.textAlign = 'center';
            }

            tabtile_rect = tabtile_elem.tabtiles_contentdiv.getBoundingClientRect();
            tooltip_rect = tabtiles_tooltip.getBoundingClientRect();
            temp =
              (tabtile_rect.left
              + ((tabtile_rect.right - tabtile_rect.left) / 2)
              - ((tooltip_rect.right - tooltip_rect.left) / 2));
            if(temp < 0) temp = 0;
            if(haschanged || forcePositioning || (tooltip_rect.left > temp))
              tabtiles_tooltip.style.left = temp + 'px';

            havesetit = true;
          }
        }
        if(!havesetit)
        {
          tabtiles_tooltip.style.left = tabtile_rect.left + 'px';
        }

        tabtiles_tooltip.style.fontSize = (tabtiles_height_raw * 0.5) + 'px';
        if(tabtiles_isAt == 'top')
        {
          temp = (tabtile_rect.bottom + (tabtiles_height_raw * 0.065) + 2);
          if(tooltip_rect.top != temp)
            tabtiles_tooltip.style.top = temp + 'px';
        }
        if(tabtiles_isAt == 'bottom')
        {
          tooltip_rect = tabtiles_tooltip.getBoundingClientRect(); // update
          temp = (tabtile_rect.top - (tooltip_rect.bottom - tooltip_rect.top)
             - (tabtiles_height_raw * 0.065) - 2);
          if(tooltip_rect != temp)
            tabtiles_tooltip.style.top = temp + 'px';
        }
      }
      else tabtiles_tooltip_tabtile_id = -1;
    }
  }

  // not really used - it didn't fix the problem as intended,
  // it was resolved in other ways
  var tabtiles_disableresize = false;
  var tabtiles_resize_overrideNoUpdate = false;

  // main resize event
  // checks the size of the bar, updating its proportions
  window.addEventListener('resize',
    function()
    {
      if(debug)console.log('tabtiles - resize');
      if(!tabtiles_disableresize)
      {
        tabtiles_getWindowState(
          function()
          {
            //if(!tabtiles_elem) return;

            tabtiles_resize_overrideNoUpdate = true;
            if(!tabtiles_manualhide)
              tabtiles_checkTileSize(true, true);
          });
      }
    }, false);

  // didn't need to use a timer for this, so not really used
  var get_tabs_timerid = -1;
  var tabtiles_selected_id = -1;

  // gets the tabs from the background page, since it can't do it itself
  function get_tabs(showSelected, callback)
  {
    chrome.runtime.sendMessage({name: 'getTabs', __source__: "tabTilesMsg"},
      function(response)
      {
        if(response)
        {
          var tabid = -1;
          for(var tab in response.tabs)
            if(response.tabs[tab].id == response.tabId)
            {
              tabid = response.tabId;
              break;
            }
          if(tabid == -1) tabid = tabtiles_selected_id;
          tabtiles_selected_id = tabid;
          if(debug)console.log('tabtiles - update tabs');
          updateTabs(tabid, response.tabs, showSelected);
          if(callback) callback(response.tabId, response.tabs, showSelected);
        }
      }
    );

    if(get_tabs_timerid != -1) window.clearTimeout(get_tabs_timerid);

    get_tabs_timerid = -1;
  }

  // main close event
  // added a check for tiles that may have bugged out and not disappeared
  // though this rarely happens now
  // but if it does, at least the user can click again to close them
  function tabtiles_close(tabId)
  {
    event.stopPropagation();
    if(tabtiles_array_findtabid(tabId) == null)
    {
      // if it has become disconnected somehow
      for(var i = 0; i < tabtiles_elem.childNodes.length; i++)
        if(tabtiles_elem.childNodes[i].tabtiles_id == tabId)
        {
          var theNode = tabtiles_elem.childNodes[i];
          tabtiles_elem.removeChild(theNode);
          tabtiles_elem.removeChild(theNode.tabtiles_shadow);
        }
    } else chrome.runtime.sendMessage({name: 'closeTab', 'tabId': tabId, __source__: "tabTilesMsg"});
  }

  // new tab clicked
  function tabtiles_newtab()
  {
    event.stopPropagation();
    chrome.runtime.sendMessage({name: 'newTab', __source__: "tabTilesMsg"});
  }

  // new tab right-clicked - open alternate homepage
  function tabtiles_newtab_alt()
  {
    event.stopPropagation();
    chrome.runtime.sendMessage({name: 'newTab_alt', __source__: "tabTilesMsg"});
    return false;
  }

  // home clicked - go to new tab (this window rather than a new tab)
  function tabtiles_address_home_click()
  {
    event.stopPropagation();
    chrome.runtime.sendMessage({name: 'home', __source__: "tabTilesMsg"});
  }

  function tabtiles_address_history_click(e)
  {
    event.stopPropagation();
    chrome.runtime.sendMessage({name: 'showHistory', __source__: "tabTilesMsg"});
    tabtiles_address_toggle();
    return false;
  };


  // home right-clicked - go to alternate homepage (this window rather than a new tab)
  function tabtiles_address_alt_home_click()
  {
    event.stopPropagation();
    if(options.alternateHomepage != '')
      window.location = options.alternateHomepage;
    return false;
  }

  var tabtiles_isAt = null;

  var tabtiles_lastviewportheight = -1;

  var minheight_mini = 12; // px -- default now stored in options though

  var tabtiles_manualhide = false;

  var tabtiles_windowState = 'normal';

  // get the current window state (normal / maximized / fullscreen)
  // runs the callback, since it might not have been set by the time this
  // function returns - caller should use the callback if they need to check it
  // right away
  function tabtiles_getWindowState(callback)
  {
    chrome.runtime.sendMessage({name: 'getWindow', __source__: "tabTilesMsg"},
      function(response)
      {
        if(response && response.window)
        {
          tabtiles_windowState = response.window.state;
          if(callback) callback();
        }
        else
        // sometimes it seems to not get it correctly?
        // if this happens on the first run then it will be set to 'normal'
        // by default
        {
          if(callback) callback();
        }
      });
  }

  // should it show it when in the current window state?
  // decides based on the current state, and the current option setting
  function tabtiles_showForWindowState()
  {
    var showIt = false;

    if(options.allowWhenRestored &&(tabtiles_windowState == 'normal'))
      showIt = true;
    if(options.allowWhenMaximized &&(tabtiles_windowState == 'maximized'))
      showIt = true;
    if(options.allowWhenFullscreen &&(tabtiles_windowState == 'fullscreen'))
      showIt = true;
    if(tabtiles_manualhide) showIt = false;

    return showIt;
  }

var isFullScreenByAPI = false;

function onFullScreenChange () {
  var fullScreenElement =
    document.fullscreenElement ||
    document.msFullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement;
  console.log("Is fullscreen:", !!fullScreenElement);
  isFullScreenByAPI = !!fullScreenElement;
};

if (document.onfullscreenchange === null)
  //document.onfullscreenchange = onFullScreenChange;
  document.addEventListener('fullscreenchange', onFullScreenChange)
else if (document.onmsfullscreenchange === null)
  //document.onmsfullscreenchange = onFullScreenChange;
  document.addEventListener('msfullscreenchange', onFullScreenChange)
else if (document.onmozfullscreenchange === null)
  //document.onmozfullscreenchange = onFullScreenChange;
  document.addEventListener('mozfullscreenchange', onFullScreenChange)
else if (document.onwebkitfullscreenchange === null)
  //document.onwebkitfullscreenchange = onFullScreenChange;
  document.addEventListener('webkitfullscreenchange', onFullScreenChange)

  // show the bar right now
  // this doesn't normally update it - a call to tabtiles_checkTileSize is required to do that
  function tabtiles_showIt(showIt, alwaysSetIt, dontSetVisibility)
  {
    if (isFullScreenByAPI) {
      tabtiles_elem.style.display = 'none';
      tabtiles_button.style.display = 'none';
      return;
    }

    var inithere = false;
    if(tabtiles_elem === null) inithere = showIt;
    if(inithere)
    {
      tabtiles_initComponents();
      if(!tabtiles_elem) return; // if still not, quit - should do it later
    }
    // only do it if it has changed
    if(alwaysSetIt || (showIt != (tabtiles_elem.style.display != 'none')) )
    {
      if(tabtiles_hiding_horizontalScrollbar)
        if(tabtiles_address_shown)document.body.style.overflowX = '';
        else document.body.style.overflowX = 'hidden';

      tabtiles_elem.style.display = showIt ? 'block' : 'none';
      tabtiles_button.style.display = showIt ? 'block' : 'none';
      if(!showIt)
      {
        if(tabtiles_isAt == 'top') document.body.style.marginTop = tabtiles_savedMargin;
        if(tabtiles_isAt == 'bottom') document.body.style.marginBottom = tabtiles_savedMargin;
      }
      tabtiles_saveScroll();
    }
    if(inithere) tabtiles_checkTileSize(true, true);
  }

  var tabtiles_keyboardFocus = null;
  var tabtiles_keyboardFocus_activated = false;
  var tabtiles_buttons_width = null;

  // the main function for calculating the bar size and updating
  // this won't cause the components to be set up unless it needs to show it
  // to save processing on page load
  //
  // also it tries not to update it if the viewport hasn't changed
  // use forceCalculate to override this
  //
  // if the caller needs to see the result immediately, use the callback to
  // continue processing, as some things may be done after the function returns
  function tabtiles_checkTileSize(showSelected, forceCalculate, firstRun, noSkipIfHidden, callback)
  {
    var showIt = tabtiles_showForWindowState() || tabtiles_address_shown;
    if(tabtiles_manualhide) showIt = false;

    // don't change it when minimizing
    if(tabtiles_windowState == 'minimized') return;

    if(firstRun && options.autohide) showIt = false;

    if(!tabtiles_elem && showIt)
    {
      tabtiles_initComponents();
      if(!tabtiles_elem) return; // if still not, quit - should do it later
    }

    if(tabtiles_elem)
    {
      tabtiles_showIt(!((tabtiles_elem.style.display == 'none')&& options.autohide) && showIt, firstRun); // force to set it on first run
    }

    if(!tabtiles_elem || !showIt || (tabtiles_elem.style.display == 'none'))
      if(!noSkipIfHidden) return;

    var viewport = getViewport();

    if((tabtiles_lastviewportheight == -1)
    ||((viewport.bottom - viewport.top) != tabtiles_lastviewportheight)||forceCalculate)
    {
      if(options.centerTiles) tabtiles_elem.style.textAlign = 'center';
      var calcheight = modifyZoom(Math.floor((viewport.bottom - viewport.top) * options.pctheight));
      if(calcheight < options.minheight) calcheight = options.minheight;
      if(calcheight > options.maxheight) calcheight = options.maxheight;
      if(!options.oldStyle)
      {
        var _class = tabtiles_adjust_pctheight == 1 ? ' full' : ' mini';
        _class += options.disableSelShadow ? '' : ' full_shadow';
        tabtiles_elem.setAttribute(
          'class',
          'notranslate' + _class
        );
      }
      calcheight = Math.floor(calcheight * tabtiles_adjust_pctheight);
      if(calcheight < minheight_mini) calcheight = parseInt(minheight_mini);
      var tabtiles_height = calcheight + 'px';
      tabtiles_elem.tabtiles_height = tabtiles_height;
      tabtiles_height_raw = calcheight;
      tabtiles_elem.style.height = (calcheight + 4) + 'px'; //tabtiles_height;
      tabtiles_elem.style.lineHeight = (calcheight + 4) + 'px'; //tabtiles_height;
      var button_height = (calcheight * 1.35);
      tabtiles_button.style.height = button_height + 'px';
      tabtiles_button.style.lineHeight = button_height + 'px';
      tabtiles_button.style.fontSize = button_height + 'px';
      tabtiles_elem.style.fontSize = tabtiles_height;
      if(tabtiles_address)
      {
        //tabtiles_address.tabtiles_text.style.fontSize = (calcheight * 0.7) + 'px';
        //tabtiles_address.tabtiles_text.style.lineHeight = (calcheight * 0.7) + 'px';
      }
      var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
      var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;
      tabtiles_last_buttons_width = tabtiles_buttons_width;

      if(tabtiles_blankspacer)
      {
        tabtiles_blankspacer.style.paddingRight = '1px'; //(tabtiles_buttons_width * 1.05) + 'px';
        tabtiles_blankspacer.style.height = tabtiles_height;
        tabtiles_blankspacer.style.lineHeight = tabtiles_height;
      }
      tabtiles_elem.style.marginLeft = (tabtiles_buttons_width + 3) + 'px';
      tabtiles_elem.style.width = (modifyZoom(viewport.right - viewport.left) - (tabtiles_buttons_width + 3)) + 'px';

      if(options.largeNewTab)
      {
        var buttons_class = 'tabtiles_largeNewTab';
        //console.log('tabtiles - checkTileSize - largeNewTab on');
      }
      else
      {
        buttons_class = 'tabtiles_smallNewTab';
        //console.log('tabtiles - checkTileSize - largeNewTab off');
      }

      // bottom of screen?
      if(options.showat == 'bottom') /*&& document.doctype*/
      // for some reason, getViewport() messes up if there isn't a doctype
      // if not set, force to the top
      // - it still gets confused with the height, but at least it doesn't
      // render it so far off-screen that it is unusable
      //
      // update: changed getViewport so it uses window.innerHeight if doctype isn't set
      // (perhaps it would work to just always use this?)
      {
        buttons_class = 'notranslate tabtiles_bottom ' + buttons_class;
        tabtiles_button.setAttribute('class', buttons_class);
        var scrollgap = 0;
        tabtiles_top = (modifyZoom(viewport.bottom - viewport.top) - ((calcheight/* * 1.1*/) + 5 + (tabtiles_adjust_pctheight == 1 ? 3 : 0)) - scrollgap + (options.backgroundtransparent ? 0 : 1)) + 'px';
        tabtiles_elem.style.top = tabtiles_top;
        var button_top = (modifyZoom(viewport.bottom - viewport.top) - ((button_height/* * 1.1*/) + 4 + (tabtiles_adjust_pctheight == 1 ? 3 : 0)) - scrollgap + (options.backgroundtransparent ? 0 : 1)) + 'px';
        tabtiles_button.style.top = button_top;
        if(tabtiles_savedMargin == null)tabtiles_savedMargin = document.body.style.marginBottom;
        if(!options.showzoneis1px)
            document.body.style.marginBottom = ((calcheight * 1.17) + scrollgap) + 'px';
        tabtiles_isAt = 'bottom';
        if(options.backgroundtransparent)
          tabtiles_elem.style.backgroundColor = 'transparent';
      }
      if(options.showat == 'top')
      {
        // top of screen
        // even though this is set in the css, it seems it sometimes needs to set it again here
        buttons_class = 'notranslate tabtiles_top ' + buttons_class;
        tabtiles_button.setAttribute('class', buttons_class);
        tabtiles_top = '0px';
        tabtiles_elem.style.top = tabtiles_top;
        tabtiles_button.style.top = tabtiles_top;
        if(tabtiles_savedMargin == null)tabtiles_savedMargin = document.body.style.marginTop;
        if(options.autohide && (document.body.scrollTop > calcheight))
          document.body.style.marginTop = tabtiles_savedMargin;
        else
            if(!options.showzoneis1px)
                document.body.style.marginTop = (calcheight * 1.17) + 'px'; //tabtiles_height;
        tabtiles_isAt = 'top';
        if(options.backgroundtransparent)
          tabtiles_elem.style.backgroundColor = 'transparent';
      }

      // update the tabs
      get_tabs(showSelected == undefined ? true : showSelected, callback);

    }

    tabtiles_lastviewportheight = viewport.bottom - viewport.top;

  }

  var tabtiles_onclick_closedisable_timerid = -1;
  var tabtiles_onclick_closedisable_tabtile = null;
  var tabtiles_onclick_pintoleft_tabtile = null;

  // this is so it can close the address bar on a delay
  function tabtiles_onclick_closedisable_timer()
  {
    if(tabtiles_onclick_closedisable_timerid != -1)
      window.clearTimeout(tabtiles_onclick_closedisable_timerid);

    if(tabtiles_onclick_closedisable_tabtile || tabtiles_onclick_pintoleft_tabtile)
    {
      var elem = tabtiles_onclick_closedisable_tabtile;
      if(tabtiles_onclick_pintoleft_tabtile) elem = tabtiles_onclick_pintoleft_tabtile;
      elem.tabtiles_text.innerHTML =
        elem.tabtiles_textbackup;
      elem.tabtiles_shadow.tabtiles_text.innerHTML =
        elem.tabtiles_textbackup;
    }
    tabtiles_onclick_closedisable_timerid = -1;
    tabtiles_onclick_closedisable_tabtile = null;
    tabtiles_onclick_pintoleft_tabtile = null;
  }

  // save the current scroll position, for restoring in another tab
  // this saves it in a variable in the background page's context
  // also saves the mini and auto-hide states, to try to restore them correctly too
  function tabtiles_saveScroll()
  {
    if(debug)console.log('tabtiles - save scroll [' + tabtiles_elem.scrollLeft + ']');
    var viewport = tabtiles_elem.getBoundingClientRect();
    var tooltipshown = false;
    var tabtiles_tooltip = document.getElementById('tabtiles_tooltip');
    if(tabtiles_tooltip) tooltipshown = tabtiles_tooltip.style.display != 'none';
    chrome.runtime.sendMessage(
      {
        __source__: "tabTilesMsg",
        name: 'saveScroll',
        'scroll': tabtiles_elem.scrollLeft / tabtiles_elem.scrollWidth,
        'adjust_pctheight': tabtiles_adjust_pctheight,
        'autohidden': tabtiles_elem.style.display == 'none',
        'tooltipshown': tooltipshown
      });
    if(debug)console.log('tabtiles - saved adjust_pctheight: [' + tabtiles_adjust_pctheight + ']');
}

  var tabtiles_selected = null;

  function tabtiles_clickto(option, sel_tabtile)
  {
    //if(option == 'pin')
      tabtiles_onclick_closedisable_timer(); // clear the old one
    tabtiles_onclick_closedisable_timerid =
      window.setTimeout(tabtiles_onclick_closedisable_timer, 2000);
    if(tabtiles_reset_started_timerid != -1)
      tabtiles_mouseout(3000); // reset it so it happens after the close reset
    sel_tabtile.tabtiles_textbackup = sel_tabtile.tabtiles_text.innerHTML;

    switch(option)
    {
      case 'pin':
        if(sel_tabtile.tabtiles_pinned)
        {
          var option_msg = 'Right click again to unpin';
          var option_shortmsg = 'Unpin tab?';
        }
        else
        {
          var option_msg = 'Right click again to pin at left';
          var option_shortmsg = 'Pin tab?';
        }
        tabtiles_onclick_pintoleft_tabtile = sel_tabtile;
        break;
      case 'del':
        option_msg = 'Press Del again to Close';
        option_shortmsg = 'Close?';
        tabtiles_onclick_closedisable_tabtile = sel_tabtile;
        break;
      default:
        option_msg = 'Click again to Close';
        option_shortmsg = 'Close?';
        tabtiles_onclick_closedisable_tabtile = sel_tabtile;
    }

    var msg = option_msg;
    if(msg.length > sel_tabtile.tabtiles_text.innerHTML.length)
      msg = option_shortmsg;
    if(msg.length + 6 < sel_tabtile.tabtiles_text.innerHTML.length - 1)
      msg = ' -- ' + msg + ' -- ';
    else if(sel_tabtile.tabtiles_text.innerHTML.length - 1 > msg.length)
      msg = ' ' + msg + ' ';
    var position = (sel_tabtile.tabtiles_text.innerHTML.length / 2) - (msg.length / 2);
    if(position < 0) position = 0;

    var msg_final_start = sel_tabtile.tabtiles_text.innerHTML.substr(0, position)
      .replace(/ /g, '&nbsp;');
    var msg_final_mid = msg.replace(/ /g, '&nbsp;');
    var msg_final_end = sel_tabtile.tabtiles_text.innerHTML.substr(position + msg.length)
      .replace(/ /g, '&nbsp;'); // replace all

    var text_close_start = document.createElement('span');
    text_close_start.innerHTML = msg_final_start;
    text_close_start.setAttribute('class', 'tabtiles_closemsg_sides');
    text_close_start.tabtiles_ownertile = sel_tabtile;

    var text_close_mid = document.createElement('span');
    text_close_mid.innerHTML = msg_final_mid;
    text_close_mid.setAttribute('class', 'tabtiles_closemsg');
    text_close_mid.tabtiles_ownertile = sel_tabtile;

    var text_close_end = document.createElement('span');
    text_close_end.innerHTML = msg_final_end;
    text_close_end.setAttribute('class', 'tabtiles_closemsg_sides');
    text_close_end.tabtiles_ownertile = sel_tabtile;

    sel_tabtile.tabtiles_text.innerHTML = '';
    sel_tabtile.tabtiles_text.appendChild(text_close_start);
    sel_tabtile.tabtiles_text.appendChild(text_close_mid);
    sel_tabtile.tabtiles_text.appendChild(text_close_end);

    var msg_final = msg_final_start + msg_final_mid + msg_final_end;
    //sel_tabtile.tabtiles_text.innerHTML = msg_final;
    sel_tabtile.tabtiles_shadow.tabtiles_text.innerHTML = msg_final;

    // focus the tile, and adjust the tooltip if required
    tabtiles_focusto(true, sel_tabtile, undefined, true, option == 'pin');
    if(tabtiles_tooltip_tabtile_id != -1)
      tabtiles_prepareTooltip(sel_tabtile, true, true);
  }

  // do the actual click
  // this is done if not dragging
  function tabtiles_doclick(sel_tabtile)
  {
    if(!tabtiles_mousedown_overtile) return; // cancel if the click wasn't over it
    tabtiles_mousedown_overtile = false;

    if(event.button == 1)
    {
        tabtiles_close(sel_tabtile.tabtiles_id);
        return;
    }

    if(tabtiles_onclick_closedisable_tabtile
    && (tabtiles_onclick_closedisable_tabtile == sel_tabtile) && (event.button != 2))
    {
      // close it
      var saved_tabtile = tabtiles_onclick_closedisable_tabtile;
      tabtiles_onclick_closedisable_tabtile = null;
      tabtiles_onclick_closedisable_timer(); // clear the timer first
      tabtiles_close(saved_tabtile.tabtiles_id);
      return;
    }

    if(tabtiles_onclick_pintoleft_tabtile
    && (tabtiles_onclick_pintoleft_tabtile == sel_tabtile))
    {
      if(event.button == 2)
      {
        tabtiles_text_rightclick();
        tabtiles_onclick_disableforright = false;
        tabtiles_dragging = false;
        tabtiles_dragstartx = -1;
        return;
      }
    }

    // if it gets to here, do the normal click
    tabtiles_saveScroll();

    // reset the scrolling so it doesn't move as easily if clicked on
    tabtiles_startedMoveX = -1;
    tabtiles_startedMove = false;

    if(sel_tabtile)
    {
      if( (event.button != 2) && ((!tabtiles_selected || tabtiles_selected != sel_tabtile))
      &&(tabtiles_array_findtabid(sel_tabtile.tabtiles_id) != null))
      {
        // if it isn't the selected tile clicked on, then select it
        if(debug) console.log('tabtiles - switching to tab [' + sel_tabtile.tabtiles_id + ']');
        var port = chrome.extension.connect({name:'tabtiles'});
        port.postMessage({func: 'selectTab', tabId: sel_tabtile.tabtiles_id});
      }
      else
      {
        // if it IS the selected tile, display "click to close" message

        if(event.button == 2) tabtiles_clickto('pin', sel_tabtile);
        else tabtiles_clickto('close', sel_tabtile);
      }
    }
  }

  var tabtiles_mousedown_overtile = false;

  // onmousedown (used to be click, but for drag to work it now uses onmousedown)
  // doesn't start the drag, but sets the coord and tile ready
  // for if it is started in mousemove later
  function tabtiles_onmousedown(override)
  {
    if(event.target)
    {
      event.stopPropagation();

      var sel_tabtile = null;
      if(override.tabtiles_ownertile)
        sel_tabtile = override.tabtiles_ownertile;
      else
      if(event.target.tabtiles_id)
        sel_tabtile = event.target;
      else
        if(event.target.tabtiles_ownertile)
          sel_tabtile = event.target.tabtiles_ownertile;

      if(sel_tabtile)
      {
        if(tabtiles_dragging) // if already dragging, cancel and start again
          tabtiles_dragging_timer();

        tabtiles_dragstartx = event.x;
        tabtiles_keyboardFocus = sel_tabtile.tabtiles_id;
        tabtiles_mousedown_overtile = true;
      }
    }

    return false;
  }

  // main click event
  // onmouseup now - to allow drag to work
  // if not ending dragging, this will call the click code
  // but if dragging, it will end the drag operation
  var tabtiles_onclick_disableforright = false;

  function tabtiles_onclick(override)
  {
    /*if(tabtiles_onclick_disableforright)
    {
      tabtiles_onclick_disableforright = false;
      return;
    }*/
    if(event.target)
    {
      event.stopPropagation();

      var sel_tabtile = null;
      if(override.tabtiles_ownertile)
        sel_tabtile = override.tabtiles_ownertile;
      else
      if(event.target.tabtiles_id)
        sel_tabtile = event.target;
      else
        if(event.target.tabtiles_ownertile)
          sel_tabtile = event.target.tabtiles_ownertile;

      if(sel_tabtile)
      {
        if(sel_tabtile.tabtiles_text.innerHTML.length == 0)
        {
          get_tabs(false);
          return false;
        }

        if(tabtiles_dragging)
        {
          tabtiles_dragging_timer(); // this resets it
          return;
        }

        tabtiles_dragging = false;
        tabtiles_dragstartx = -1;

        tabtiles_doclick(sel_tabtile);
      }
    }
    return false;
  }

  // decided to disable this, as it doesn't always work as intended
  // it should prioritise the selected tab so they fill as much space as possible
  // but often it makes the selected tab SMALLER than the others..
  var tabtiles_leaveselectedforlast = false;

  // count the actual number of non-undefined items in the array
  // (array.length includes those that have been deleted)
  // try not to use this too much, eg. in a loop - get it before the loop
  function array_count(arr)
  {
    var i = 0;
    for(item in arr)
      if(item !== undefined)
        i++;
    return i;
  }

  var tabtiles_nonpinnedcount = 0;

  // this function carries out the tabs updating
  // it doesn't get the tabs though - that needs to be done elsewhere
  // and pass the tabs array to this function in the callback from the
  // background page request
  //
  // this tries to clip the tabs to a suitable size
  // (tricky with html / javascript as there isn't an easy way to measure
  // the sizes without setting something!)
  //
  // also forces the scroll to show a selected item if required
  // (this can be a tab id, or just TRUE to try to find the selected tab)
  function updateTabs(tabId, tabs, showSelected)
  {
    if(!tabtiles_elem) return;
    if(!document.body) return;

    if(tabs.length == 0) return; // no point doing this if there aren't any (fix a slight bug)

    var nonDestr = true; // non destructive update
    var nonDestr_fullsize = true; // don't try to *not* resize to full size to update (false = slight bugs)

    tabtiles_onclick_closedisable_timer();
    tabtiles_lastmouseover = null;

    tabtiles_disableresize = true;

    var old_scrollLeft = tabtiles_elem.scrollLeft;
    var old_tabtiles_array = null;
    if(!nonDestr) old_tabtiles_array = tabtiles_array;
    var old_tabtiles_blankspacer = null;
    if(!nonDestr) tabtiles_array = [];

    var tabtiles_buttons_rect = tabtiles_button.getBoundingClientRect();
    var tabtiles_buttons_width = tabtiles_buttons_rect.right - tabtiles_buttons_rect.left;

    if(!tabtiles_blankspacer)
    {
      tabtiles_blankspacer = document.createElement('span');
      tabtiles_blankspacer.setAttribute('id', 'tabtiles_blankspacer');
      tabtiles_blankspacer.style.lineHeight = tabtiles_elem.tabtiles_height;
      tabtiles_blankspacer.style.paddingRight = '1px'; //tabtiles_buttons_width + 'px';
      tabtiles_elem.appendChild(tabtiles_blankspacer);
    }

    var selectedTile = null;

    var i = 0;
    var hasAnyChanges = false;
    var foundTooltip = false;
    for(var item in tabs)
    {
      if(tabs[item])
      {
        var isSelected = tabId == tabs[item].id;

        // non-destructive update now
        // but it still causes flicker?!
        // NO: changed it back - it was messing resize up somehow, and since
        // it didn't fix the flicker, no point
        // UPDATE: changed it back to non-destructive, but the system to not change
        // the sizes doesn't really work that good, so left that disabled
        // (still a few bugs in the non-destructive update too, but they are very rare)

        if(nonDestr) // need to skip through to find the next tab that hasn't been deleted
          while(i < tabtiles_array.length && !tabtiles_array[i])
            i++;
        if((i < tabtiles_array.length)&& nonDestr)
        {
          var newtile = tabtiles_array[i];

          if(newtile.tabtiles_title != tabs[item].title)
          {
            newtile.tabtiles_title = tabs[item].title;
            newtile.tabtiles_text.innerHTML = '';
            hasAnyChanges = true;
          }
          if(newtile.tabtiles_pinned != tabs[item].pinned) hasAnyChanges = true;
          tabtiles_createTile_updateComponents(newtile, tabs[item], isSelected);
        }
        else
        {
          newtile = tabtiles_createTile(tabs[item], isSelected);
          tabtiles_array.push(newtile);
          hasAnyChanges = true;
        }
        if(newtile.tabtiles_id == tabtiles_tooltip_tabtile_id) foundTooltip = true;
        if(isSelected) selectedTile = newtile;
        if((tabtiles_keyboardFocus === null)&& isSelected)
          tabtiles_keyboardFocus = tabs[item].id;
        i++;
      }
    }
    if(!foundTooltip)
    {
      tabtiles_tooltip_tabtile_id = -1;
      if(tabtiles_tooltip)
        tabtiles_prepareTooltip(null, false);
    }

    // remove the old ones
    for(var item in old_tabtiles_array)
    {
      if(old_tabtiles_array[item])
      {
        tabtiles_elem.removeChild(old_tabtiles_array[item].tabtiles_shadow);
        tabtiles_elem.removeChild(old_tabtiles_array[item]);
      }
    }
    if(old_tabtiles_blankspacer)tabtiles_elem.removeChild(old_tabtiles_blankspacer);

    // remove any extra items
    /*if(nonDestr)
      for(var n = tabtiles_array.length - 1; n >= i ; n--)
      {
        tabtiles_elem.removeChild(tabtiles_array[i]);
        tabtiles_elem.removeChild(tabtiles_array[i].tabtiles_shadow);
        delete(tabtiles_array[i]);
      }*/
    var remove_i = 0;
    if(nonDestr)
    {
      for(var item in tabtiles_array)
      {
        if(tabtiles_array[item])
        {
          if(remove_i >= i)
          {
            tabtiles_elem.removeChild(tabtiles_array[item]);
            tabtiles_elem.removeChild(tabtiles_array[item].tabtiles_shadow);
            delete(tabtiles_array[item]);
            hasAnyChanges = true;
          }
          remove_i++;
        }
      }

      // try cleaning up the array rather than just leaving them "deleted"
      // this copies it to a new array
      // as this is causing some bugs elsewhere
      var tabtiles_array_new = [];
      for(var item in tabtiles_array)
        if(tabtiles_array[item])
        {
          tabtiles_array_new.push(tabtiles_array[item]);
        }
      tabtiles_array = tabtiles_array_new;
    }

    // clip the titles here
    if(hasAnyChanges || tabtiles_resize_overrideNoUpdate)
    {
      if(debug)console.log('tabtiles - update - haschanges');
      tabtiles_resize_overrideNoUpdate = false; // reset

      var total_width = tabtiles_buttons_width;
      var total_chars = 0;
      for(var item in tabtiles_array)
      {
        if(tabtiles_array[item])
        {
          if(tabtiles_array[item].tabtiles_temptitle)
            var old_temptitle_length = tabtiles_array[item].tabtiles_temptitle.length;
          else old_temptitle_length = 0;
          tabtiles_array[item].tabtiles_temptitle = tabtiles_array[item].tabtiles_title;
          // don't need this? --
          /*if(tabtiles_array[item].tabtiles_url == 'http://' + tabtiles_array[item].tabtiles_temptitle)
          {
                if(tabtiles_array[item].tabtiles_temptitle.length > 20)
                  newtile.tabtiles_temptitle = tabtiles_array[item].tabtiles_temptitle.substring(0, 20) + '..';
          }*/

          var temptitle = htmlentities(tabtiles_array[item].tabtiles_title);
          if(!nonDestr || nonDestr_fullsize || (tabtiles_array[item].tabtiles_text.innerHTML == ''))
          {
            if(tabtiles_array[item].tabtiles_pinned)
            {
              tabtiles_array[item].tabtiles_text.innerHTML = '&#8203;';
              tabtiles_array[item].tabtiles_shadow.tabtiles_text.innerHTML = '&#8203;';
            }
            else
            {
              tabtiles_array[item].tabtiles_text.innerHTML = temptitle + ' ';
              tabtiles_array[item].tabtiles_shadow.tabtiles_text.innerHTML = temptitle + ' ';
            }
            tabtiles_array[item].tabtiles_temptitle_addClippedSuffix = false;
          }

          var tabtile_rect = tabtiles_array[item].tabtiles_text.getBoundingClientRect();
          if(nonDestr)
          {
            // attempt to adjust the length to estimate what the full length will be
            // but doesn't seem to work very good..
            // actually, added a better way of coping with this, above:
            // - only update the clipping if tabs are changed / added / removed
            // since most of the time the user will be clicking on them
            // and a lot of the adding will be hidden
            if((old_temptitle_length != 0) && !nonDestr_fullsize)
              total_width += (tabtile_rect.right - tabtile_rect.left) * (tabtiles_array[item].tabtiles_title.length / old_temptitle_length);
            else total_width += tabtile_rect.right - tabtile_rect.left;
          }
          else total_width += tabtile_rect.right - tabtile_rect.left;
          total_chars += tabtiles_array[item].tabtiles_title.length;
        }
      }
      var modified_total_width = total_width;
      var _total_width = total_width; // save the original value

      if(total_width == 0)
      {
        // this prevents it from trying to resize it if it is hidden
        // as it doesn't have the sizes
        // it skips out of here, and also forces updating next time
        tabtiles_resize_overrideNoUpdate = true;
        return;
      }

      var viewport = getViewport();
      var viewport_width = modifyZoom(viewport.right - viewport.left);

      var clipto_ratio = 0.3; // reduce by this
      var clipto_min = 9; // minimum size allowed
      var clipto_2plus_max = 20;
      var splitinto_per_viewportwidth = 3;

      var clipthem = false;

      var _count = array_count(tabtiles_array);

      // if tabs are pinned, better to exclude them from this (not totally accurate, but ok)
      for(var item in tabtiles_array)
        if(tabtiles_array[item])
          if(tabtiles_array[item].tabtiles_pinned) _count--;
      tabtiles_nonpinnedcount = _count; // save globally for the tooltip hints

      var viewport_width_adjusted = (viewport_width - 1.5*tabtiles_buttons_width/*(tabtiles_blankspacer_rect.right - tabtiles_blankspacer_rect.left)*/);
      //for(var n = 0; n < 3; n++)
      {
        //clipthem = (tabtiles_elem.scrollWidth + tabtiles_elem.scrollLeft) > modifyZoom(document.body.scrollWidth);

        var leave_until_last = -1;
        var remaining = /*tabtiles_array.length*/_count;

        if((total_width > viewport_width)&&(tabtiles_array.length > 1))
        {
          var using_fsd_width = true;
          clipthem = (total_width) > 0.9 * viewport_width_adjusted;
        }
        else using_fsd_width = false;

        for(var _item = 0; _item < tabtiles_array.length + 1; _item++)
        {
          if((_item == tabtiles_array.length + 1) || tabtiles_array[_item])
          {
            var item = _item;
            if(tabtiles_leaveselectedforlast && (tabtiles_array[item] == selectedTile))
              leave_until_last = item;
            else
            {
              if(item == tabtiles_array.length) // last item - restore the saved item
                if(tabtiles_leaveselectedforlast)
                  item = leave_until_last;
                else break;

              var temptitle = tabtiles_array[item].tabtiles_temptitle;
              var tabtile_rect = tabtiles_array[item].tabtiles_contentdiv.getBoundingClientRect();

              if(!using_fsd_width)
                clipthem = (modified_total_width) > 0.9 * viewport_width_adjusted;

              /*if(using_fsd_width && (_count >= splitinto_per_viewportwidth)
              && tabtiles_array[item].tabtiles_temptitle_addClippedSuffix)
              {
                clipthem = false;
                console.log('tabtiles - shortcircuit clip');
              }*/

              //if(n == 0)
              //{
              var old_addClippedSuffix = false;

              if(tabtiles_array[item].tabtiles_pinned){temptitle = '';}
              else
              {
                var viewport_divideby = /*tabtiles_array.length*/_count;
                if(viewport_divideby > splitinto_per_viewportwidth)
                  viewport_divideby = splitinto_per_viewportwidth;

                if(debug)console.log('resizing with viewport_width_adjusted [' +
                  viewport_width_adjusted + '] and spacer width [' + tabtiles_buttons_width + ']');
                if(using_fsd_width)
                {
                  clip_fsd_width = viewport_width_adjusted * (1/viewport_divideby);
                  if((_total_width - total_width) + clip_fsd_width > viewport_width_adjusted)
                    if((/*tabtiles_array.length*/_count >= 2)&&(clipto > clipto_2plus_max)) clipto = clipto_2plus_max;
                }
                else clip_fsd_width = viewport_width_adjusted / viewport_divideby;
                if(/*tabtiles_array.length*/_count - remaining > splitinto_per_viewportwidth)
                var clipto = (clip_fsd_width / (total_chars / tabtiles_array[item].tabtiles_title.length)) / (tabtile_rect.right - tabtile_rect.left);
                else clipto = clip_fsd_width / (tabtile_rect.right - tabtile_rect.left);
                clipto = temptitle.length * clipto * 0.9;

              //}
              //else clipto = temptitle.length - (temptitle.length * clipto_ratio);

              total_chars -= temptitle.length;
              old_addClippedSuffix = tabtiles_array[item].tabtiles_temptitle_addClippedSuffix;
              if(clipto < clipto_min) clipto = clipto_min;
              if(clipthem)
              {
                if( ((temptitle.length > clipto)&&(temptitle.length > clipto_min + 2))
                || (temptitle.length > clipto + 2)) /* give a little, but only if short */
                {
                  temptitle = temptitle.substr(0, clipto);
                  tabtiles_array[item].tabtiles_temptitle_addClippedSuffix = true;
                }
              } else break;
              var tolerance_length =
                Math.min(
                  tabtiles_array[item].tabtiles_temptitle.length - (old_addClippedSuffix ? 2 : 0) - 2,
                  temptitle.length - 2);
              }

              if(!nonDestr
              || (Math.abs(tabtiles_array[item].tabtiles_temptitle.length - temptitle.length)>2)
              || (tabtiles_array[item].tabtiles_temptitle.substr(0, tolerance_length) != temptitle.substr(0, tolerance_length)))
              {
                tabtiles_array[item].tabtiles_temptitle = temptitle;
                temptitle = htmlentities(temptitle);
                if(tabtiles_array[item].tabtiles_temptitle_addClippedSuffix)
                  temptitle += '..';
                if(temptitle == '') temptitle = '&#8203;' // zero-width space
                else temptitle += ' ';
                tabtiles_array[item].tabtiles_text.innerHTML = temptitle;
                tabtiles_array[item].tabtiles_shadow.tabtiles_text.innerHTML = temptitle;

                // adjust the total width to the new item size
                total_width -= (tabtile_rect.right - tabtile_rect.left);
                modified_total_width = total_width + (tabtile_rect.right - tabtile_rect.left);
              }
              else tabtiles_array[item].tabtiles_temptitle_addClippedSuffix = old_addClippedSuffix;

              if(!tabtiles_array[item].tabtiles_pinned)remaining--;
            }
          }
        }
        //if(!clipthem) break;
        //clipto -= 4;
      }
    }

    tabtiles_focusto(showSelected, selectedTile, old_scrollLeft);

    if(debug)console.log('tabtiles - scroll after update [' + tabtiles_elem.scrollLeft + ']');

    tabtiles_disableresize = false; // doesn't seem to work anyway..

  }

  function tabtiles_focusto(showSelected, selectedTile, old_scrollLeft, snapToSide, noSelect)
  {
    var viewport = getViewport();
    var viewport_width = modifyZoom(viewport.right - viewport.left);

    if(old_scrollLeft === undefined) old_scrollLeft = tabtiles_elem.scrollLeft;

    var buttonsrect = tabtiles_button.getBoundingClientRect();
    var spacer_width = buttonsrect.right - buttonsrect.left;
    spacer_width = spacer_width * 1.05;
    tabtiles_blankspacer.style.paddingRight = '1px'; //spacer_width + 'px';

    if(!noSelect)tabtiles_selected = selectedTile;

    tabtiles_elem.scrollLeft = old_scrollLeft;

    if(showSelected && selectedTile)
    {
      var viewport = tabtiles_elem.getBoundingClientRect();
      // if showSelected is an integer, then interpret as the id
      if(!isNaN(showSelected)&&(showSelected!==true)&&(showSelected!==false))
        for(var item in tabtiles_array)
          if(tabtiles_array[item])
            if(tabtiles_array[item].tabtiles_id == showSelected)
            {
              selectedTile = tabtiles_array[item];
              break;
            }
      // better to measure the rect using _shadow?
      var tilerect = selectedTile.tabtiles_shadow.getBoundingClientRect();
      var tabtiles_adjusted_left = viewport.left; // + spacer_width;

      if((tabtiles_focusAtX!=-1)
      ||(tilerect.left < tabtiles_adjusted_left)
      ||(tilerect.right > viewport.right))
      {
        if(debug)console.log('tabtiles - old left scroll [' + tabtiles_elem.scrollLeft + ']');
        var pos = viewport.left + ((viewport.right - viewport.left) / 2);
        if(tabtiles_focusAtX != -1)
        {
          pos = tabtiles_focusAtX;
          if(debug)console.log('tabtiles - setting forced focus position [' + tabtiles_focusAtX + ']');
          tabtiles_focusAtX = -1;
        }
        var new_scrollLeft = null;
        var cancel_forceRight = false;
        if(snapToSide) // do this separately, as it normally focuses them in the center
          if(tilerect.left < ((viewport.right - viewport.left) / 2))
            new_scrollLeft = tabtiles_elem.scrollLeft + (tilerect.left - tabtiles_adjusted_left);
          else
          {
            new_scrollLeft = tabtiles_elem.scrollLeft - (viewport_width - tilerect.right);
            cancel_forceRight = true;
          }
        if(new_scrollLeft === null)
          new_scrollLeft =
            tilerect.left + tabtiles_elem.scrollLeft -
              (pos)
              + ((tilerect.right - tilerect.left) / 2);
        if(new_scrollLeft < 0) new_scrollLeft = 0;
        //if(new_scrollLeft + tilerect.left + (tilerect.right - tilerect.left) > tabtiles_elem.scrollLeft + viewport_width)
        if(!cancel_forceRight && new_scrollLeft + tilerect.left + (tilerect.right - tilerect.left) > tabtiles_elem.scrollLeft + (viewport_width - spacer_width))
        {
          if(debug)console.log('viewport_width: ' + viewport_width + '  scrollwidth: ' + tabtiles_elem.scrollWidth + '  childelemcount: ' + tabtiles_elem.childElementCount);
          // was a bug here: it wasn't adjusting correctly due to the icons being loaded later
          // changed the css for the icons to specify the width as well as height
          // (they should be the same anyway, so that's ok)
          //new_scrollLeft = new_scrollLeft + viewport_width - (tilerect.right - tilerect.left);
          //new_scrollLeft = tabtiles_elem.scrollWidth - (viewport_width - spacer_width);
          // the following seems to work ok to focus the item properly - the others weren't doing it right
          new_scrollLeft =
            tabtiles_elem.scrollLeft
            + tilerect.left - spacer_width + (tilerect.right - tilerect.left)
            - (viewport_width - spacer_width) / 2;
          if(debug)console.log('tabtiles - force right focus [' + new_scrollLeft + ']');
        }

        /* // jquery animation
        tabtiles_delay_animate_timer = window.setTimeout(
          function()
          {
            $(tabtiles_elem, document).animate({scrollLeft: new_scrollLeft});
            if(tabtiles_delay_animate_timer != -1) window.clearTimeout(tabtiles_delay_animate_timer);
            tabtiles_delay_animate_timer = -1;
          }, 2);
        }*/
        // or set directly
        tabtiles_elem.scrollLeft = new_scrollLeft;
        if(tabtiles_tooltip)
          tabtiles_prepareTooltip(null, undefined, true);

        if(debug)console.log('tabtiles - set left scroll [' + new_scrollLeft + '] for tab id [' + selectedTile.tabtiles_id + '] left [' + tilerect.left + ']');

        //if(debug)console.log('tabtiles - save scroll [' + new_scrollLeft + ']');
        tabtiles_saveScroll();
      }
    }
  }

  var tabtiles_delay_animate_timer = -1;

  //var tabtiles_delayed_checkTileSize_timerid = -1;

  // get notified of selection changes from the background page
  // this restores the scroll and mini / autohide setting to try to keep
  // it the same as the page it is coming from (mostly works..)
  chrome.extension.onMessage.addListener(
    function(details)
    {
      if(details.name = 'tabs_onSelectionChanged')
      {
        if(tabtiles_elem/* && (tabtiles_selected_id != details.tabId)*/)
          chrome.runtime.sendMessage({name: 'getScroll', __source__: "tabTilesMsg"},
            function(response)
            {
              if(debug)console.log('tabtiles - get scroll');
              var viewport = tabtiles_elem.getBoundingClientRect();
              var loaded_scroll = response.scroll * tabtiles_elem.scrollWidth;
              tabtiles_elem.scrollLeft = loaded_scroll;
              if(debug)console.log('tabtiles - get scroll: [' + loaded_scroll + '] set as: [' +
                tabtiles_elem.scrollLeft + '] width: [' + tabtiles_elem.scrollWidth + ']');
              if(response.adjust_pctheight !== null)
              {
                tabtiles_adjust_pctheight = response.adjust_pctheight;
                if(debug)console.log('tabtiles - restored adjust_pctheight: [' + tabtiles_adjust_pctheight + ']');
              }
              if(debug)console.log('tabtiles - restored autohidden: [' + response.autohidden + ']');
              if(options.autohide && !tabtiles_manualhide && (response.autohidden !== null))
                if(response.autohidden != (tabtiles_elem.style.display == 'none'))
                  tabtiles_showIt(!response.autohidden);

              if(debug)console.log('tabtiles - restored adjust_pctheight??: [' + tabtiles_adjust_pctheight + ']');

              // clear keyboard focus
              if(!tabtiles_dragging)
              // this used the resetkb message, but can't access it from here?
              // so testing for whether it is dragging is ok
              {
                tabtiles_keyboardFocus = null;
                tabtiles_keyboardFocus_activated = false;
                // clear drag
                tabtiles_dragging = false; // ??
                //console.log('tabtiles - resetkb');
              }
              // hide the address bar if it is shown, when changing tabs
              if(tabtiles_address_shown)
                tabtiles_address_toggle();
              // hide the tooltip too -- update: restore its state
              //tabtiles_prepareTooltip(null, response.tooltipshown, true);

              if(document.body) tabtiles_checkTileSize(true, true);

              // moved this here - update the tooltip
              tabtiles_prepareTooltip(null, response.tooltipshown, true);
            });

      }

    });
}
)(document, window);
