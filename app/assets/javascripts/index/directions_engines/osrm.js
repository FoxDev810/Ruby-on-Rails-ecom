// OSRM car engine
// Doesn't yet support hints

function OSRMEngine() {
  return {
    id: "osrm_car",
    creditline: '<a href="http://project-osrm.org/" target="_blank">OSRM</a>',
    draggable: true,

    getRoute: function (points, callback) {
      var TURN_INSTRUCTIONS = [
        "",
        I18n.t('javascripts.directions.instructions.continue_on'),      // 1
        I18n.t('javascripts.directions.instructions.slight_right'),     // 2
        I18n.t('javascripts.directions.instructions.turn_right'),       // 3
        I18n.t('javascripts.directions.instructions.sharp_right'),      // 4
        I18n.t('javascripts.directions.instructions.uturn'),            // 5
        I18n.t('javascripts.directions.instructions.sharp_left'),       // 6
        I18n.t('javascripts.directions.instructions.turn_left'),        // 7
        I18n.t('javascripts.directions.instructions.slight_left'),      // 8
        I18n.t('javascripts.directions.instructions.via_point'),        // 9
        I18n.t('javascripts.directions.instructions.follow'),           // 10
        I18n.t('javascripts.directions.instructions.roundabout'),       // 11
        I18n.t('javascripts.directions.instructions.leave_roundabout'), // 12
        I18n.t('javascripts.directions.instructions.stay_roundabout'),  // 13
        I18n.t('javascripts.directions.instructions.start'),            // 14
        I18n.t('javascripts.directions.instructions.destination'),      // 15
        I18n.t('javascripts.directions.instructions.against_oneway'),   // 16
        I18n.t('javascripts.directions.instructions.end_oneway')        // 17
      ];

      var url = "http://router.project-osrm.org/viaroute?z=14&output=json&instructions=true";

      for (var i = 0; i < points.length; i++) {
        url += "&loc=" + points[i].lat + ',' + points[i].lng;
      }

      $.ajax({
        url: url,
        dataType: 'json',
        success: function (data) {
          if (data.status == 207)
            return callback(true);

          var line = L.PolylineUtil.decode(data.route_geometry);
          for (var i = 0; i < line.length; i++) {
            line[i].lat /= 10;
            line[i].lng /= 10;
          }

          var steps = [];
          for (i = 0; i < data.route_instructions.length; i++) {
            var s = data.route_instructions[i];
            var linesegend;
            var instCodes = s[0].split('-');
            var instText = "<b>" + (i + 1) + ".</b> ";
            instText += TURN_INSTRUCTIONS[instCodes[0]];
            if (instCodes[1]) {
              instText += "exit " + instCodes[1] + " ";
            }
            if (instCodes[0] != 15) {
              instText += s[1] ? "<b>" + s[1] + "</b>" : I18n.t('javascripts.directions.instructions.unnamed');
            }
            if ((i + 1) < data.route_instructions.length) {
              linesegend = data.route_instructions[i + 1][3] + 1;
            } else {
              linesegend = s[3] + 1;
            }
            steps.push([line[s[3]], s[0].split('-')[0], instText, s[2], line.slice(s[3], linesegend)]);
          }

          callback(null, {
            line: line,
            steps: steps,
            distance: data.route_summary.total_distance,
            time: data.route_summary.total_time
          });
        }
      });
    }
  };
}

OSM.Directions.addEngine(OSRMEngine(), false);
