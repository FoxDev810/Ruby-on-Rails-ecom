OSM.Query = function(map) {
  var queryButton = $(".control-query .control-button"),
    uninterestingTags = ['source', 'source_ref', 'source:ref', 'history', 'attribution', 'created_by', 'tiger:county', 'tiger:tlid', 'tiger:upload_uuid'],
    marker;

  queryButton.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (queryButton.hasClass("active")) {
      disableQueryMode();

      OSM.router.route("/");
    } else {
      enableQueryMode();
    }
  });

  $("#sidebar_content")
    .on("mouseover", ".query-results li", function () {
      var geometry = $(this).data("geometry")
      if (geometry) map.addLayer(geometry);
      $(this).addClass("selected");
    })
    .on("mouseout", ".query-results li", function () {
      var geometry = $(this).data("geometry")
      if (geometry) map.removeLayer(geometry);
      $(this).removeClass("selected");
    });

  function interestingFeature(feature) {
    if (feature.tags) {
      for (var key in feature.tags) {
        if (uninterestingTags.indexOf(key) < 0) {
          return true;
        }
      }
    }

    return false;
  }

  function featurePrefix(feature) {
    var tags = feature.tags;
    var prefix = "";

    if (tags.boundary === "administrative") {
      prefix = I18n.t("geocoder.search_osm_nominatim.admin_levels.level" + tags.admin_level)
    } else {
      var prefixes = I18n.t("geocoder.search_osm_nominatim.prefix");

      for (var key in tags) {
        var value = tags[key];

        if (prefixes[key]) {
          if (prefixes[key][value]) {
            return prefixes[key][value];
          } else {
            var first = value.substr(0, 1).toUpperCase(),
              rest = value.substr(1).replace(/_/g, " ");

            return first + rest;
          }
        }
      }
    }

    if (!prefix) {
      prefix = I18n.t("javascripts.query." + feature.type);
    }

    return prefix;
  }

  function featureName(feature) {
    var tags = feature.tags;

    if (tags["name"]) {
      return tags["name"];
    } else if (tags["ref"]) {
      return tags["ref"];
    } else if (tags["addr:housenumber"] && tags["addr:street"]) {
      return tags["addr:housenumber"] + " " + tags["addr:street"];
    } else {
      return "#" + feature.id;
    }
  }

  function featureLink(feature) {
    if (feature.type === "area") {
      if (feature.id >= 3600000000) {
        var id = feature.id - 3600000000;

        return "/browse/relation/" + id;
      } else if (feature.id >= 2400000000) {
        var id = feature.id - 2400000000;

        return "/browse/way/" + id;
      } else {
        return "/browse/node/" + feature.id;
      }
    } else {
      return "/browse/" + feature.type + "/" + feature.id;
    }
  }

  function featureGeometry(feature, nodes) {
    var geometry;

    if (feature.type === "node") {
      geometry = L.circleMarker([feature.lat, feature.lon]);
    } else if (feature.type === "way") {
      geometry = L.polyline(feature.nodes.map(function (node) {
        return nodes[node];
      }));
    }

    return geometry;
  }

  function runQuery(query, $section) {
    var $ul = $section.find("ul");

    $ul.empty();
    $section.show();

    $section.find(".loader").oneTime(1000, "loading", function () {
      $(this).show();
    });

    $.ajax({
      url: "http://overpass-api.de/api/interpreter",
      method: "GET",
      data: {
        data: "[timeout:5][out:json];" + query,
      },
      success: function(results) {
        var nodes = {};

        $section.find(".loader").stopTime("loading").hide();

        results.elements.forEach(function (element) {
          if (element.type === "node") {
            nodes[element.id] = [element.lat, element.lon];
          }
        });

        for (var i = 0; i < results.elements.length; i++) {
          var element = results.elements[i];

          if (interestingFeature(element)) {
            var $li = $("<li>")
              .data("geometry", featureGeometry(element, nodes))
              .appendTo($ul);
            var $p = $("<p>")
              .addClass("inner12 search_results_entry clearfix")
              .text(featurePrefix(element) + " ")
              .appendTo($li);

            $("<a>")
              .attr("href", featureLink(element))
              .text(featureName(element))
              .appendTo($p);
          }
        }
      }
    });
  }

  function queryOverpass(lat, lng) {
    var latlng = L.latLng(lat, lng),
      around = "around:10.0," + lat + "," + lng,
      features = "(node(" + around + ");way(" + around + ");relation(" + around + "))",
      nearby = "((" + features + ";way(bn));node(w));out;",
      isin = "(is_in(" + lat + "," + lng + ");>);out;";

    $("#sidebar_content .query-intro")
      .hide();

    if (marker) {
      marker.setLatLng(latlng).addTo(map);
    } else {
      marker = L.circle(latlng, 10, { clickable: false }).addTo(map);
    }

    $(document).everyTime(75, "fadeQueryMarker", function (i) {
      if (i == 10) {
        map.removeLayer(marker);
      } else {
        marker.setStyle({
          opacity: 0.5 - i * 0.05,
          fillOpacity: 0.2 - i * 0.02
        });
      }
    }, 10);

    runQuery(nearby, $("#query-nearby"));
    runQuery(isin, $("#query-isin"));
  }

  function clickHandler(e) {
    var precision = OSM.zoomPrecision(map.getZoom()),
      lat = e.latlng.lat.toFixed(precision),
      lng = e.latlng.lng.toFixed(precision);

    OSM.router.route("/query?lat=" + lat + "&lon=" + lng);
  }

  function enableQueryMode() {
    queryButton.addClass("active");
    map.on("click", clickHandler);
    $(map.getContainer()).addClass("query-active");
  }

  function disableQueryMode() {
    if (marker) map.removeLayer(marker);
    $(map.getContainer()).removeClass("query-active");
    map.off("click", clickHandler);
    queryButton.removeClass("active");
  }

  var page = {};

  page.pushstate = page.popstate = function(path) {
    OSM.loadSidebarContent(path, function () {
      page.load(path);
    });
  };

  page.load = function(path) {
    var params = querystring.parse(path.substring(path.indexOf('?') + 1));

    queryOverpass(params.lat, params.lon);
    enableQueryMode();

    return map.getState();
  };

  page.unload = function() {
    disableQueryMode();
  };

  return page;
};
