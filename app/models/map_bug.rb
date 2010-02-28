class MapBug < ActiveRecord::Base
  include GeoRecord

  set_table_name 'map_bugs'

  validates_presence_of :id, :on => :update
  validates_uniqueness_of :id
  validates_numericality_of :latitude, :only_integer => true
  validates_numericality_of :longitude, :only_integer => true
  validates_presence_of :date_created
  validates_presence_of :last_changed
  validates_inclusion_of :status, :in => [ "open", "closed", "hidden" ]


  def self.create_bug(lat, lon, comment)
	bug = MapBug.new(:lat => lat, :lon => lon);
	raise OSM::APIBadUserInput.new("The node is outside this world") unless bug.in_world?
	bug.text = comment
	bug.date_created = Time.now.getutc
	bug.last_changed = Time.now.getutc
	bug.status = "open";
	bug.save;
	return bug;
  end

  def close_bug
	self.status = "closed"
	self.last_changed = Time.now.getutc
	self.save;
  end

end
