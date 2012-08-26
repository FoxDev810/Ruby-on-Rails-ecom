var browseBoxControl;
var browseMode = "auto";
var browseBounds;
var browseFeatureList;
var browseActiveFeature;
var browseDataLayer;
var browseSelectControl;
var browseObjectList;
var areasHidden = false;

OpenLayers.Feature.Vector.style['default'].strokeWidth = 3;
OpenLayers.Feature.Vector.style['default'].cursor = "pointer";
    
function startBrowse(sidebarHtml) {
  map.dataLayer.active = true;

  $("#sidebar_title").html(I18n.t('browse.start_rjs.data_frame_title'));
  $("#sidebar_content").html(sidebarHtml);

  openSidebar({ onclose: stopBrowse });

  var vectors = new OpenLayers.Layer.Vector();
    
  browseBoxControl = new OpenLayers.Control.DrawFeature(vectors, OpenLayers.Handler.RegularPolygon, { 
    handlerOptions: {
      sides: 4,
      snapAngle: 90,
      irregular: true,
      persist: true
    }
  });
  browseBoxControl.handler.callbacks.done = endDrag;
  map.addControl(browseBoxControl);

  map.events.register("moveend", map, updateData);
  map.events.triggerEvent("moveend");

  $("#browse_select_view").click(useMap);

  $("#browse_select_box").click(startDrag);

  $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.hide_areas'));
  $("#browse_hide_areas_box").show();
  $("#browse_hide_areas_box").click(hideAreas);
}

function updateData() {
  if (browseMode == "auto") {
    if (map.getZoom() >= 15) {
        useMap(false);
    } else {
        setStatus(I18n.t('browse.start_rjs.zoom_or_select'));
    }    
  }
}

function stopBrowse() {
  if (map.dataLayer.active) {
    map.dataLayer.active = false;

    if (browseSelectControl) {   
      browseSelectControl.destroy();  
      browseSelectControl = null;
    } 

    if (browseBoxControl) {
      browseBoxControl.destroy();
      browseBoxControl = null;
    }		

    if (browseActiveFeature) {
      browseActiveFeature.destroy(); 
      browseActiveFeature = null; 
    }

    if (browseDataLayer) {
      browseDataLayer.destroy();
      browseDataLayer = null; 
    } 

    map.dataLayer.setVisibility(false);
    map.events.unregister("moveend", map, updateData);
  }    
}

function startDrag() {
  $("#browse_select_box").html(I18n.t('browse.start_rjs.drag_a_box'));

  browseBoxControl.activate();

  return false;
}

function useMap(reload) {
  var bounds = map.getExtent();
  var projected = bounds.clone().transform(map.getProjectionObject(), epsg4326);

  if (!browseBounds || !browseBounds.containsBounds(projected)) {
    var center = bounds.getCenterLonLat();
    var tileWidth = bounds.getWidth() * 1.2;
    var tileHeight = bounds.getHeight() * 1.2;
    var tileBounds = new OpenLayers.Bounds(center.lon - (tileWidth / 2),
                                           center.lat - (tileHeight / 2),
                                           center.lon + (tileWidth / 2),
                                           center.lat + (tileHeight / 2));

    browseBounds = tileBounds;
    getData(tileBounds, reload);

    browseMode = "auto";

    $("#browse_select_view").hide();
  }

  return false;
}

function hideAreas() {
  $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.show_areas'));
  $("#browse_hide_areas_box").show();
  $("#browse_hide_areas_box").click(showAreas);

  areasHidden = true;

  useMap(true);
}

function showAreas() {
  $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.hide_areas'));
  $("#browse_hide_areas_box").show();
  $("#browse_hide_areas_box").click(hideAreas);

  areasHidden = false;

  useMap(true);
}

function endDrag(bbox) {
  var bounds = bbox.getBounds();
  var projected = bounds.clone().transform(map.getProjectionObject(), epsg4326);

  browseBoxControl.deactivate();
  browseBounds = projected;
  getData(bounds);

  browseMode = "manual";  

  $("#browse_select_box").html(I18n.t('browse.start_rjs.manually_select'));
  $("#browse_select_view").show();
}

function displayFeatureWarning(count, limit, callback) {
  clearStatus();

  var div = document.createElement("div");

  var p = document.createElement("p");
  p.appendChild(document.createTextNode(I18n.t("browse.start_rjs.loaded_an_area_with_num_features", { num_features: count, max_features: limit })));
  div.appendChild(p);

  var input = document.createElement("input");
  input.type = "submit";
  input.value = I18n.t('browse.start_rjs.load_data');
  input.onclick = callback;
  div.appendChild(input); 

  $("#browse_content").html("");
  $("#browse_content").append(div);
}

function customDataLoader(resp, options) {
  if (map.dataLayer.active) {
    var request = resp.priv;
    var doc = request.responseXML;

    if (!doc || !doc.documentElement) {
      doc = request.responseText;
    }

    resp.features = this.format.read(doc);

    if (!this.maxFeatures || resp.features.length <= this.maxFeatures) {
      options.callback.call(options.scope, resp);
    } else {
      displayFeatureWarning(resp.features.length, this.maxFeatures, function () {
        options.callback.call(options.scope, resp);
      });
    }
  }
}

function getData(bounds, reload) {
  var projected = bounds.clone().transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
  var size = projected.getWidth() * projected.getHeight();

  if (size > OSM.MAX_REQUEST_AREA) {
    setStatus(I18n.t("browse.start_rjs.unable_to_load_size", { max_bbox_size: OSM.MAX_REQUEST_AREA, bbox_size: size }));
  } else {
    loadData("/api/" + OSM.API_VERSION + "/map?bbox=" + projected.toBBOX(), reload);
  }
}

function loadData(url, reload) {
  setStatus(I18n.t('browse.start_rjs.loading'));

  $("#browse_content").empty();

  var formatOptions = {
    checkTags: true,
    interestingTagsExclude: ['source','source_ref','source:ref','history','attribution','created_by','tiger:county','tiger:tlid','tiger:upload_uuid']
  };

  if (areasHidden) formatOptions.areaTags = [];

  if (!browseDataLayer || reload) {
    var style = new OpenLayers.Style();

    style.addRules([new OpenLayers.Rule({
      symbolizer: {
        Polygon: { fillColor: '#ff0000', strokeColor: '#ff0000' },
        Line: { fillColor: '#ffff00', strokeColor: '#000000', strokeOpacity: '0.4' },
        Point: { fillColor: '#00ff00', strokeColor: '#00ff00' }
      }
    })]);

    if (browseDataLayer) browseDataLayer.destroyFeatures();

    /*
     * Modern browsers are quite happy showing far more than 100 features in
     * the data browser, so increase the limit to 2000 by default, but keep
     * it restricted to 500 for IE8 and 100 for older IEs.
     */
    var maxFeatures = 2000;

    /*@cc_on
      if (navigator.appVersion < 8) {
        maxFeatures = 100;
      } else if (navigator.appVersion < 9) {
        maxFeatures = 500;
      }
    @*/

    browseDataLayer = new OpenLayers.Layer.Vector("Data", {
      strategies: [ 
        new OpenLayers.Strategy.Fixed()
      ],
      protocol: new OpenLayers.Protocol.HTTP({
        url: url,
        format: new OpenLayers.Format.OSM(formatOptions),
        maxFeatures: maxFeatures,
        handleRead: customDataLoader
      }),
      projection: new OpenLayers.Projection("EPSG:4326"),
      displayInLayerSwitcher: false,
      styleMap: new OpenLayers.StyleMap({
        'default': style,
        'select': { strokeColor: '#0000ff', strokeWidth: 8 }
      })
    });
    browseDataLayer.events.register("loadend", browseDataLayer, dataLoaded );
    map.addLayer(browseDataLayer);
            
    browseSelectControl = new OpenLayers.Control.SelectFeature(browseDataLayer, { onSelect: onFeatureSelect });
    browseSelectControl.handlers.feature.stopDown = false;
    browseSelectControl.handlers.feature.stopUp = false;
    map.addControl(browseSelectControl);
    browseSelectControl.activate();
  } else {
    browseDataLayer.destroyFeatures();
    browseDataLayer.refresh({ url: url });
  }

  browseActiveFeature = null;
}

function dataLoaded() {
  if (this.map.dataLayer.active) {
    clearStatus();

    browseObjectList = document.createElement("div");

    var heading = document.createElement("p");
    heading.className = "browse_heading";
    heading.appendChild(document.createTextNode(I18n.t('browse.start_rjs.object_list.heading')));
    browseObjectList.appendChild(heading);

    var list = document.createElement("ul");

    for (var i = 0; i < this.features.length; i++) {
      var feature = this.features[i]; 
            
      // Type, for linking
      var type = featureType(feature);
      var typeName = featureTypeName(feature);
      var li = document.createElement("li");
      li.appendChild(document.createTextNode(typeName + " "));
            
      // Link, for viewing in the tab
      var link = document.createElement("a");
      link.href =  "/browse/" + type + "/" + feature.osm_id; 
      var name = featureName(feature);
      link.appendChild(document.createTextNode(name));
      link.feature = feature;
      link.onclick = OpenLayers.Function.bind(viewFeatureLink, link);   
      li.appendChild(link);

      list.appendChild(li);
    }

    browseObjectList.appendChild(list);

    var link = document.createElement("a");
    link.href = this.protocol.url;
    link.appendChild(document.createTextNode(I18n.t('browse.start_rjs.object_list.api')));
    browseObjectList.appendChild(link);

    $("#browse_content").html(browseObjectList); 
  }
}
    
function viewFeatureLink() {
  var layer = this.feature.layer;

  for (var i = 0; i < layer.selectedFeatures.length; i++) {
    var f = layer.selectedFeatures[i]; 
    layer.drawFeature(f, layer.styleMap.createSymbolizer(f, "default"));
  }

  onFeatureSelect(this.feature);

  if (browseMode != "auto") {
    map.setCenter(this.feature.geometry.getBounds().getCenterLonLat()); 
  }

  return false;
}
    
function loadObjectList() {
  $("#browse_content").empty();
  $("#browse_content").append(browseObjectList);

  return false;
}
      
function onFeatureSelect(feature) {
  // Unselect previously selected feature
  if (browseActiveFeature) {
    browseActiveFeature.layer.drawFeature(
      browseActiveFeature, 
      browseActiveFeature.layer.styleMap.createSymbolizer(browseActiveFeature, "default")
    );
  }

  // Redraw in selected style
  feature.layer.drawFeature(
    feature, feature.layer.styleMap.createSymbolizer(feature, "select")
  );

  // If the current object is the list, don't innerHTML="", since that could clear it.
  if ($("#browse_content").firstChild == browseObjectList) { 
    $("#browse_content").removeChild(browseObjectList);
  } else { 
    $("#browse_content").empty();
  }   
        
  // Create a link back to the object list
  var div = document.createElement("div");
  div.style.textAlign = "center";
  div.style.marginBottom = "20px";
  $("#browse_content").append(div);
  var link = document.createElement("a");
  link.href = "#";
  link.onclick = loadObjectList;
  link.appendChild(document.createTextNode(I18n.t('browse.start_rjs.object_list.back')));
  div.appendChild(link);

  var table = document.createElement("table");
  table.width = "100%";
  table.className = "browse_heading";
  $("#browse_content").append(table);

  var tr = document.createElement("tr");
  table.appendChild(tr);

  var heading = document.createElement("td");
  heading.appendChild(document.createTextNode(featureNameSelect(feature)));
  tr.appendChild(heading);

  var td = document.createElement("td");
  td.align = "right";
  tr.appendChild(td);

  var type = featureType(feature);
  var link = document.createElement("a");   
  link.href = "/browse/" + type + "/" + feature.osm_id;
  link.appendChild(document.createTextNode(I18n.t('browse.start_rjs.object_list.details')));
  td.appendChild(link);

  var div = document.createElement("div");
  div.className = "browse_details";

  $("#browse_content").append(div);

  // Now the list of attributes
  var ul = document.createElement("ul");
  for (var key in feature.attributes) {
    var li = document.createElement("li");
    var b = document.createElement("b");
    b.appendChild(document.createTextNode(key));
    li.appendChild(b);
    li.appendChild(document.createTextNode(": " + feature.attributes[key]));
    ul.appendChild(li);
  }
        
  div.appendChild(ul);
        
  var link = document.createElement("a");   
  link.href =  "/browse/" + type + "/" + feature.osm_id + "/history";
  link.appendChild(document.createTextNode(I18n.t('browse.start_rjs.show_history')));
  link.onclick = OpenLayers.Function.bind(loadHistory, {
    type: type, feature: feature, link: link
  });
        
  div.appendChild(link);

  // Stash the currently drawn feature
  browseActiveFeature = feature; 
}   

function loadHistory() {
  this.link.href = "";
  this.link.innerHTML = I18n.t('browse.start_rjs.wait');

  $.ajax("/api/" + OSM.API_VERSION + "/" + this.type + "/" + this.feature.osm_id + "/history", {
    complete: OpenLayers.Function.bind(displayHistory, this)
  });

  return false;
}

function displayHistory(request) {
  if (browseActiveFeature.osm_id != this.feature.osm_id || $("#browse_content").firstChild == browseObjectList)  { 
      return false;
  } 

  this.link.parentNode.removeChild(this.link);

  var doc = request.responseXML;

  var table = document.createElement("table");
  table.width = "100%";
  table.className = "browse_heading";
  $("#browse_content").append(table);

  var tr = document.createElement("tr");
  table.appendChild(tr);

  var heading = document.createElement("td");
  heading.appendChild(document.createTextNode(I18n.t("browse.start_rjs.history_for_feature", { feature: featureNameHistory(this.feature) })));
  tr.appendChild(heading);

  var td = document.createElement("td");
  td.align = "right";
  tr.appendChild(td);

  var link = document.createElement("a");   
  link.href = "/browse/" + this.type + "/" + this.feature.osm_id + "/history";
  link.appendChild(document.createTextNode(I18n.t('browse.start_rjs.details')));
  td.appendChild(link);

  var div = document.createElement("div");
  div.className = "browse_details";

  var nodes = doc.getElementsByTagName(this.type);
  var history = document.createElement("ul");  
  for (var i = nodes.length - 1; i >= 0; i--) {
    var user = nodes[i].getAttribute("user") || I18n.t('browse.start_rjs.private_user');
    var timestamp = nodes[i].getAttribute("timestamp");
    var item = document.createElement("li");
    item.appendChild(document.createTextNode(I18n.t("browse.start_rjs.edited_by_user_at_timestamp", { user: user, timestamp: timestamp })));
    history.appendChild(item);
  }
  div.appendChild(history);

  $("#browse_content").append(div); 
}

function featureType(feature) {
  if (feature.geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
    return "node";
  } else {
    return "way";
  }
}

function featureTypeName(feature) {
  if (featureType(feature) == "node") {
    return I18n.t('browse.start_rjs.object_list.type.node');
  } else if (featureType(feature) == "way") {
    return I18n.t('browse.start_rjs.object_list.type.way');
  }
}

function featureName(feature) {
  var lang = $('html').attr('lang');
  if (feature.attributes['name:' + lang]) {
    return feature.attributes['name:' + lang];
  } else if (feature.attributes.name) {
    return feature.attributes.name;
  } else {
    return feature.osm_id;
  }
}

function featureNameSelect(feature) {
  var lang = $('html').attr('lang');
  if (feature.attributes['name:' + lang]) {
    return feature.attributes['name:' + lang];
  } else if (feature.attributes.name) {
    return feature.attributes.name;
  } else if (featureType(feature) == "node") {
    return I18n.t("browse.start_rjs.object_list.selected.type.node", { id: feature.osm_id });
  } else if (featureType(feature) == "way") {
    return I18n.t("browse.start_rjs.object_list.selected.type.way", { id: feature.osm_id });
  }
}

function featureNameHistory(feature) {
  var lang = $('html').attr('lang');
  if (feature.attributes['name:' + lang]) {
    return feature.attributes['name:' + lang];
  } else if (feature.attributes.name) {
    return feature.attributes.name;
  } else if (featureType(feature) == "node") {
    return I18n.t("browse.start_rjs.object_list.history.type.node", { id: feature.osm_id });
  } else if (featureType(feature) == "way") {
    return I18n.t("browse.start_rjs.object_list.history.type.way", { id: feature.osm_id });
  }
}

function setStatus(status) {
  $("#browse_status").html(status);
  $("#browse_status").show();
}
  
function clearStatus() {
  $("#browse_status").html("");
  $("#browse_status").hide();
}
