xml.instruct!

xml.rss("version" => "2.0", 
        "xmlns:geo" => "http://www.w3.org/2003/01/geo/wgs84_pos#",
        "xmlns:georss" => "http://www.georss.org/georss") do
  xml.channel do
    xml.title "OpenStreetBugs"
    xml.description t('bugs.rss.description_area', :min_lat => @min_lat, :min_lon => @min_lon, :max_lat => @max_lat, :max_lon => @max_lon )
    xml.link url_for(:controller => "site", :action => "index", :only_path => false)

    @comments.each do |comment|
      xml.item do
        if comment.event == "closed"
          xml.title t('bugs.rss.closed', :place => comment.map_bug.nearby_place)	
        elsif comment.event == "commented"
          xml.title t('bugs.rss.comment', :place => comment.map_bug.nearby_place)
        elsif comment.event == "opened"
          xml.title t('bugs.rss.new', :place => comment.map_bug.nearby_place)
        else
          xml.title "unknown event"
        end
        
        xml.link url_for(:controller => "browse", :action => "bug", :id => comment.map_bug.id, :only_path => false)
        xml.guid url_for(:controller => "browse", :action => "bug", :id => comment.map_bug.id, :only_path => false)

        description_text = ""

        if comment.event == "commented" and not comment.nil?
          description_text += "<b>Comment:</b><br>"
          description_text += htmlize(comment.body)
          description_text += "<br>"
        end

        description_text += "<b>Full bug report:</b><br>"
        description_text += comment.map_bug.flatten_comment("<br>", comment.created_at)

        xml.description description_text 
        xml.author comment.author_name
        xml.pubDate comment.created_at.to_s(:rfc822)
        xml.geo :lat, comment.map_bug.lat
        xml.geo :long, comment.map_bug.lon
        xml.georss :point, "#{comment.map_bug.lat} #{comment.map_bug.lon}"
      end
    end
  end
end
