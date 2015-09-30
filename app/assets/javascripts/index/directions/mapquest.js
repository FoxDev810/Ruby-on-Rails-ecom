// For docs, see:
// http://developer.mapquest.com/web/products/open/directions-service
// http://open.mapquestapi.com/directions/
// https://github.com/apmon/openstreetmap-website/blob/21edc353a4558006f0ce23f5ec3930be6a7d4c8b/app/controllers/routing_controller.rb#L153

function MapQuestEngine(id, routeType) {
  var MQ_SPRITE_MAP = {
    0: 1, // straight
    1: 2, // slight right
    2: 3, // right
    3: 4, // sharp right
    4: 5, // reverse
    5: 6, // sharp left
    6: 7, // left
    7: 8, // slight left
    8: 5, // right U-turn
    9: 5, // left U-turn
    10: 2, // right merge
    11: 8, // left merge
    12: 2, // right on-ramp
    13: 8, // left on-ramp
    14: 2, // right off-ramp
    15: 8, // left off-ramp
    16: 2, // right fork
    17: 8, // left fork
    18: 1  // straight fork
  };

  return {
    id: id,
    creditline: '<a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="' + document.location.protocol + '//developer.mapquest.com/content/osm/mq_logo.png">',
    draggable: false,

    getRoute: function (points, callback) {
      var from = points[0];
      var to = points[points.length - 1];

      return $.ajax({
        url: document.location.protocol + "//open.mapquestapi.com/directions/v2/route",
        data: {
          key: OSM.MAPQUEST_KEY,
          from: from.lat + "," + from.lng,
          to: to.lat + "," + to.lng,
          routeType: routeType,
          // locale: I18n.currentLocale(), //Doesn't actually work. MapQuest requires full locale e.g. "de_DE", but I18n may only provides language, e.g. "de"
          manMaps: false,
          shapeFormat: "raw",
          generalize: 0,
          unit: "k"
        },
        dataType: "jsonp",
        success: function (data) {
          if (data.info.statuscode !== 0)
            return callback(true);

          var i;
          var line = [];
          var shape = data.route.shape.shapePoints;
          for (i = 0; i < shape.length; i += 2) {
            line.push(L.latLng(shape[i], shape[i + 1]));
          }

          // data.route.shape.maneuverIndexes links turns to polyline positions
          // data.route.legs[0].maneuvers is list of turns
          var steps = [];
          var mq = data.route.legs[0].maneuvers;
          for (i = 0; i < mq.length; i++) {
            var s = mq[i];
            var d;
            var linesegstart, linesegend, lineseg;
            linesegstart = data.route.shape.maneuverIndexes[i];
            if (i === mq.length - 1) {
              d = 15;
              linesegend = linesegstart + 1;
            } else {
              d = MQ_SPRITE_MAP[s.turnType];
              linesegend = data.route.shape.maneuverIndexes[i + 1] + 1;
            }
            lineseg = [];
            for (var j = linesegstart; j < linesegend; j++) {
              lineseg.push(L.latLng(data.route.shape.shapePoints[j * 2], data.route.shape.shapePoints[j * 2 + 1]));
            }
            steps.push([L.latLng(s.startPoint.lat, s.startPoint.lng), d, s.narrative, s.distance * 1000, lineseg]);
          }

          callback(false, {
            line: line,
            steps: steps,
            distance: data.route.distance * 1000,
            time: data.route.time
          });
        },
        error: function () {
          callback(true);
        }
      });
    }
  };
}

if (OSM.MAPQUEST_KEY) {
  OSM.Directions.addEngine(new MapQuestEngine("mapquest_bicycle", "bicycle"), true);
  OSM.Directions.addEngine(new MapQuestEngine("mapquest_foot", "pedestrian"), true);
  OSM.Directions.addEngine(new MapQuestEngine("mapquest_car", "fastest"), true);
}
