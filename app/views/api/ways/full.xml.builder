xml.instruct!

xml.osm(OSM::API.new.xml_root_attributes) do |osm|
  osm << (render(@nodes) || "")
  osm << (render(@way) || "")
end
