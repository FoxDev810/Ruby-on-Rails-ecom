//= require templates/browse/feature
//= require templates/browse/feature_list
//= require templates/browse/feature_history

$(document).ready(function () {
  $("#show_data").click(function (e) {
    $.ajax({ url: $(this).attr('href'), success: function (sidebarHtml) {
      startBrowse(sidebarHtml);
    }});
    e.preventDefault();
  });

  function startBrowse(sidebarHtml) {
    var browseMode = "auto";
    var browseBounds;
    var layersById;
    var selectedLayer;
    var browseObjectList;
    var areasHidden = false;

    var dataLayer = new L.OSM.DataLayer(null, {
      styles: {
        way: {
          weight: 3,
          color: "#000000",
          opacity: 0.4
        },
        area: {
          weight: 3,
          color: "#ff0000"
        },
        node: {
          color: "#00ff00"
        }
      }
    });

    dataLayer.addTo(map);

    dataLayer.isWayArea = function () {
      return !areasHidden && L.OSM.DataLayer.prototype.isWayArea.apply(this, arguments);
    };

    var drawHandler = new L.Rectangle.Draw(map, {title: I18n.t('browse.start_rjs.drag_a_box')});
    map.on('draw:rectangle-created', endDrag);

    $("#sidebar_title").html(I18n.t('browse.start_rjs.data_frame_title'));
    $("#sidebar_content").html(sidebarHtml);

    openSidebar();

    map.on("moveend", updateData);
    updateData();

    $("#browse_select_view").click(useMap);

    $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.hide_areas'));
    $("#browse_hide_areas_box").toggle(hideAreas, showAreas);

    function updateData() {
      if (browseMode == "auto") {
        if (map.getZoom() >= 15) {
          useMap();
        } else {
          setStatus(I18n.t('browse.start_rjs.zoom_or_select'));
        }
      }
    }

    $("#sidebar").one("closed", function () {
      map.removeLayer(dataLayer);
      map.off("moveend", updateData);
      map.off('draw:rectangle-created', endDrag);
      drawHandler.disable();
    });

    $("#browse_select_box").click(function () {
      $("#browse_select_box").html(I18n.t('browse.start_rjs.drag_a_box'));

      drawHandler.enable();

      return false;
    });

    function useMap() {
      var bounds = map.getBounds();

      if (!browseBounds || !browseBounds.contains(bounds)) {
        browseBounds = bounds;
        browseMode = "auto";

        getData();

        $("#browse_select_view").hide();
      }

      return false;
    }

    function hideAreas() {
      $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.show_areas'));

      areasHidden = true;

      getData();
    }

    function showAreas() {
      $("#browse_hide_areas_box").html(I18n.t('browse.start_rjs.hide_areas'));

      areasHidden = false;

      getData();
    }

    function endDrag(e) {
      browseBounds = e.rect.getBounds();
      browseMode = "manual";

      getData();

      $("#browse_select_box").html(I18n.t('browse.start_rjs.manually_select'));
      $("#browse_select_view").show();

      drawHandler.disable();
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

    function getData() {
      var size = browseBounds.getSize();

      if (size > OSM.MAX_REQUEST_AREA) {
        setStatus(I18n.t("browse.start_rjs.unable_to_load_size", { max_bbox_size: OSM.MAX_REQUEST_AREA, bbox_size: size }));
        return;
      }

      setStatus(I18n.t('browse.start_rjs.loading'));

      var url = "/api/" + OSM.API_VERSION + "/map?bbox=" + browseBounds.toBBOX();

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

      $.ajax({
        url: url,
        success: function (xml) {
          clearStatus();

          $("#browse_content").empty();
          dataLayer.clearLayers();
          selectedLayer = null;

          dataLayer.addData(xml);

          layersById = {};
          var features = [];

          dataLayer.eachLayer(function (layer) {
            var feature = layer.feature;
            layersById[feature.id] = layer;
            features.push({
              typeName: featureTypeName(feature),
              url: "/browse/" + feature.type + "/" + feature.id,
              name: featureName(feature),
              id: feature.id
            });
          });

          browseObjectList = $(JST["templates/browse/feature_list"]({
            features: features,
            url: url
          }))[0];

          loadObjectList();
        }
      });
    }

    function viewFeatureLink() {
      var layer = layersById[$(this).data("feature-id")];

      onSelect(layer);

      if (browseMode != "auto") {
        map.panTo(layer.getBounds().getCenter());
      }

      return false;
    }

    function loadObjectList() {
      $("#browse_content").html(browseObjectList);
      $("#browse_content").find("a[data-feature-id]").click(viewFeatureLink);

      return false;
    }

    function onSelect(layer) {
      // Unselect previously selected feature
      if (selectedLayer) {
        selectedLayer.setStyle(selectedLayer.originalStyle);
      }

      // Redraw in selected style
      layer.originalStyle = layer.options;
      layer.setStyle({color: '#0000ff', weight: 8});

      // If the current object is the list, don't innerHTML="", since that could clear it.
      if ($("#browse_content").firstChild == browseObjectList) {
        $("#browse_content").removeChild(browseObjectList);
      } else {
        $("#browse_content").empty();
      }

      var feature = layer.feature;

      $("#browse_content").html(JST["templates/browse/feature"]({
        name: featureNameSelect(feature),
        url: "/browse/" + feature.type + "/" + feature.id,
        attributes: feature.tags
      }));

      $("#browse_content").find("a.browse_show_list").click(loadObjectList);
      $("#browse_content").find("a.browse_show_history").click(loadHistory);

      // Stash the currently drawn feature
      selectedLayer = layer;
    }

    dataLayer.on("click", function (e) {
      onSelect(e.layer);
    });

    function loadHistory() {
      $(this).attr("href", "").text(I18n.t('browse.start_rjs.wait'));

      var feature = selectedLayer.feature;

      $.ajax({
        url: "/api/" + OSM.API_VERSION + "/" + feature.type + "/" + feature.id + "/history",
        success: function (xml) {
          if (selectedLayer.feature != feature || $("#browse_content").firstChild == browseObjectList) {
            return;
          }

          $(this).remove();

          var history = [];
          var nodes = xml.getElementsByTagName(feature.type);
          for (var i = nodes.length - 1; i >= 0; i--) {
            history.push({
              user: nodes[i].getAttribute("user") || I18n.t('browse.start_rjs.private_user'),
              timestamp: nodes[i].getAttribute("timestamp")
            });
          }

          $("#browse_content").append(JST["templates/browse/feature_history"]({
            name: featureNameHistory(feature),
            url: "/browse/" + feature.type + "/" + feature.id,
            history: history
          }));
        }.bind(this)
      });

      return false;
    }

    function featureTypeName(feature) {
      return I18n.t('browse.start_rjs.object_list.type.' + feature.type);
    }

    function featureName(feature) {
      return feature.tags['name:' + $('html').attr('lang')] ||
        feature.tags.name ||
        feature.id;
    }

    function featureNameSelect(feature) {
      return feature.tags['name:' + $('html').attr('lang')] ||
        feature.tags.name ||
        I18n.t("browse.start_rjs.object_list.selected.type." + feature.type, { id: feature.id });
    }

    function featureNameHistory(feature) {
      return feature.tags['name:' + $('html').attr('lang')] ||
        feature.tags.name ||
        I18n.t("browse.start_rjs.object_list.history.type." + feature.type, { id: feature.id });
    }

    function setStatus(status) {
      $("#browse_status").html(status);
      $("#browse_status").show();
    }

    function clearStatus() {
      $("#browse_status").html("");
      $("#browse_status").hide();
    }
  }
});
