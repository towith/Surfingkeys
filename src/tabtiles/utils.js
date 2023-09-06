  
  // helper to load forms using js objects
  // loads from or saves to the object
  
  // all of the required fields need to be stored in the object (if they do not
  // have a definition, they will not be)
  
  // for security, or where the form and object field names are different,
  // it can use a conversion table object to translate between one and the other
  // - this needs to contain properties named as the object fields are, 
  // and string values that describe the IDs of the form fields
   
  function loadsaveFromToForm(source, FromFormToObj, translateList, blockIfNoTranslateForItem)
  {
    for(var property in source)
    {
      var _property = null;
      if(translateList)
        for(var trans in translateList)
          if(trans == property)
          {
            _property = translateList[trans];
            break;
          }
      if((blockIfNoTranslateForItem)&&(_property==null))continue;
      if(_property==null) _property = property; 
      var form_elem = document.getElementById(_property);
      if(form_elem)
      {
        if(form_elem.tagName == "INPUT")
          switch(form_elem.type)
          {
            case "text":
            case "hidden":
              if(FromFormToObj)
              { source[property] = form_elem.value }
              else form_elem.value = source[property];
              break;
            case "checkbox":
            case "radio":
              if(FromFormToObj)
              { source[property] = form_elem.checked }
              else form_elem.checked = source[property] == true;
              break;
          };
        if(form_elem.tagName == "SELECT")
          if(FromFormToObj)
          { source[property] = form_elem.value }
          else form_elem.value = source[property];
        if(form_elem.tagName == "TEXTAREA")
          if(FromFormToObj)
          { source[property] = form_elem.value }
          else form_elem.value = source[property];
      }
    }
  }
  
  function ObjToForm(source, translateList, blockIfNoTranslateForItem)
  {
    loadsaveFromToForm(source, false, translateList, blockIfNoTranslateForItem);
  }
  
  function ObjFromForm(dest, translateList, blockIfNoTranslateForItem)
  {
    loadsaveFromToForm(dest, true, translateList, blockIfNoTranslateForItem);
  }


  // copy an object's properties
  // excluding undefined properties if the ignoreUndefined flag is set
  // note: this doesn't recurse multiple levels
  //if(!Object.prototype.extend)
  //  Object.prototype.extend = function(obj1, obj2, ignoreUndefined)
  function object_extend(obj1, obj2, ignoreUndefined)
    /*function Object_extend(obj1, obj2, ignoreUndefined)*/
  {
    var dest = {};
    for (var property in obj1)
      dest[property] = obj1[property];
    for (var property in obj2)
      if(!(ignoreUndefined == true)||(obj2[property] != undefined))
        dest[property] = obj2[property];
    return dest;
  }
  
