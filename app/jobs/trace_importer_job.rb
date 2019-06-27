class TraceImporterJob < ApplicationJob
  queue_as :traces

  def perform(trace)
    gpx = trace.import

    if gpx.actual_points.positive?
      Notifier.gpx_success(trace, gpx.actual_points).deliver_later
    else
      Notifier.gpx_failure(trace, "0 points parsed ok. Do they all have lat,lng,alt,timestamp?").deliver_later
      trace.destroy
    end
  rescue StandardError => e
    logger.info e.to_s
    e.backtrace.each { |l| logger.info l }
    Notifier.gpx_failure(trace, e.to_s + "\n" + e.backtrace.join("\n")).deliver_later
    trace.destroy
  end
end
