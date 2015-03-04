require "test_helper"
require "digest"

class TraceTest < ActiveSupport::TestCase
  api_fixtures

  def setup
    @gpx_trace_dir = Object.send("remove_const", "GPX_TRACE_DIR")
    Object.const_set("GPX_TRACE_DIR", File.dirname(__FILE__) + "/../traces")

    @gpx_image_dir = Object.send("remove_const", "GPX_IMAGE_DIR")
    Object.const_set("GPX_IMAGE_DIR", File.dirname(__FILE__) + "/../traces")
  end

  def teardown
    Object.send("remove_const", "GPX_TRACE_DIR")
    Object.const_set("GPX_TRACE_DIR", @gpx_trace_dir)

    Object.send("remove_const", "GPX_IMAGE_DIR")
    Object.const_set("GPX_IMAGE_DIR", @gpx_image_dir)
  end

  def test_trace_count
    assert_equal 10, Trace.count
  end

  def test_visible
    check_query(Trace.visible, [
      :public_trace_file, :anon_trace_file, :trackable_trace_file,
      :identifiable_trace_file, :zipped_trace_file, :tar_trace_file,
      :tar_gzip_trace_file, :tar_bzip_trace_file, :pending_trace_file
    ])
  end

  def test_visible_to
    check_query(Trace.visible_to(1), [
      :public_trace_file, :identifiable_trace_file, :pending_trace_file
    ])
    check_query(Trace.visible_to(2), [
      :public_trace_file, :anon_trace_file, :trackable_trace_file,
      :identifiable_trace_file, :pending_trace_file
    ])
    check_query(Trace.visible_to(3), [
      :public_trace_file, :identifiable_trace_file, :pending_trace_file
    ])
  end

  def test_visible_to_all
    check_query(Trace.visible_to_all, [
      :public_trace_file, :identifiable_trace_file,
      :deleted_trace_file, :pending_trace_file
    ])
  end

  def test_tagged
    check_query(Trace.tagged("London"), [:public_trace_file, :anon_trace_file])
    check_query(Trace.tagged("Birmingham"), [:anon_trace_file, :identifiable_trace_file])
    check_query(Trace.tagged("Unknown"), [])
  end

  def test_validations
    trace_valid({})
    trace_valid({ :user_id => nil }, false)
    trace_valid(:name => "a" * 255)
    trace_valid({ :name => "a" * 256 }, false)
    trace_valid({ :description => nil }, false)
    trace_valid(:description => "a" * 255)
    trace_valid({ :description => "a" * 256 }, false)
    trace_valid(:visibility => "private")
    trace_valid(:visibility => "public")
    trace_valid(:visibility => "trackable")
    trace_valid(:visibility => "identifiable")
    trace_valid({ :visibility => "foo" }, false)
  end

  def test_tagstring
    trace = Trace.new(gpx_files(:public_trace_file).attributes)
    trace.tagstring = "foo bar baz"
    assert trace.valid?
    assert_equal 3, trace.tags.length
    assert_equal "foo", trace.tags[0].tag
    assert_equal "bar", trace.tags[1].tag
    assert_equal "baz", trace.tags[2].tag
    assert_equal "foo, bar, baz", trace.tagstring
    trace.tagstring = "foo, bar baz ,qux"
    assert trace.valid?
    assert_equal 3, trace.tags.length
    assert_equal "foo", trace.tags[0].tag
    assert_equal "bar baz", trace.tags[1].tag
    assert_equal "qux", trace.tags[2].tag
    assert_equal "foo, bar baz, qux", trace.tagstring
  end

  def test_public?
    assert_equal true, gpx_files(:public_trace_file).public?
    assert_equal false, gpx_files(:anon_trace_file).public?
    assert_equal false, gpx_files(:trackable_trace_file).public?
    assert_equal true, gpx_files(:identifiable_trace_file).public?
    assert_equal true, gpx_files(:deleted_trace_file).public?
  end

  def test_trackable?
    assert_equal false, gpx_files(:public_trace_file).trackable?
    assert_equal false, gpx_files(:anon_trace_file).trackable?
    assert_equal true, gpx_files(:trackable_trace_file).trackable?
    assert_equal true, gpx_files(:identifiable_trace_file).trackable?
    assert_equal false, gpx_files(:deleted_trace_file).trackable?
  end

  def test_identifiable?
    assert_equal false, gpx_files(:public_trace_file).identifiable?
    assert_equal false, gpx_files(:anon_trace_file).identifiable?
    assert_equal false, gpx_files(:trackable_trace_file).identifiable?
    assert_equal true, gpx_files(:identifiable_trace_file).identifiable?
    assert_equal false, gpx_files(:deleted_trace_file).identifiable?
  end

  def test_mime_type
    assert_equal "application/gpx+xml", gpx_files(:public_trace_file).mime_type
    assert_equal "application/gpx+xml", gpx_files(:anon_trace_file).mime_type
    assert_equal "application/x-bzip2", gpx_files(:trackable_trace_file).mime_type
    assert_equal "application/x-gzip", gpx_files(:identifiable_trace_file).mime_type
    assert_equal "application/x-zip", gpx_files(:zipped_trace_file).mime_type
    assert_equal "application/x-tar", gpx_files(:tar_trace_file).mime_type
    assert_equal "application/x-gzip", gpx_files(:tar_gzip_trace_file).mime_type
    assert_equal "application/x-bzip2", gpx_files(:tar_bzip_trace_file).mime_type
  end

  def test_extension_name
    assert_equal ".gpx", gpx_files(:public_trace_file).extension_name
    assert_equal ".gpx", gpx_files(:anon_trace_file).extension_name
    assert_equal ".gpx.bz2", gpx_files(:trackable_trace_file).extension_name
    assert_equal ".gpx.gz", gpx_files(:identifiable_trace_file).extension_name
    assert_equal ".zip", gpx_files(:zipped_trace_file).extension_name
    assert_equal ".tar", gpx_files(:tar_trace_file).extension_name
    assert_equal ".tar.gz", gpx_files(:tar_gzip_trace_file).extension_name
    assert_equal ".tar.bz2", gpx_files(:tar_bzip_trace_file).extension_name
  end

  def test_xml_file
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:public_trace_file).xml_file)
    assert_equal "66179ca44f1e93d8df62e2b88cbea732", md5sum(gpx_files(:anon_trace_file).xml_file)
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:trackable_trace_file).xml_file)
    assert_equal "abd6675fdf3024a84fc0a1deac147c0d", md5sum(gpx_files(:identifiable_trace_file).xml_file)
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:zipped_trace_file).xml_file)
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:tar_trace_file).xml_file)
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:tar_gzip_trace_file).xml_file)
    assert_equal "848caa72f2f456d1bd6a0fdf228aa1b9", md5sum(gpx_files(:tar_bzip_trace_file).xml_file)
  end

  def test_large_picture
    picture = gpx_files(:public_trace_file).large_picture
    trace = Trace.create

    trace.large_picture = picture
    assert_equal "7c841749e084ee4a5d13f12cd3bef456", md5sum(File.new(trace.large_picture_name))
    assert_equal picture, trace.large_picture

    trace.destroy
  end

  def test_icon_picture
    picture = gpx_files(:public_trace_file).icon_picture
    trace = Trace.create

    trace.icon_picture = picture
    assert_equal "b47baf22ed0e85d77e808694fad0ee27", md5sum(File.new(trace.icon_picture_name))
    assert_equal picture, trace.icon_picture

    trace.destroy
  end

  private

  def check_query(query, traces)
    traces = traces.map { |t| gpx_files(t).id }.sort
    assert_equal traces, query.order(:id).ids
  end

  def trace_valid(attrs, result = true)
    entry = Trace.new(gpx_files(:public_trace_file).attributes)
    entry.assign_attributes(attrs)
    assert_equal result, entry.valid?, "Expected #{attrs.inspect} to be #{result}"
  end

  def md5sum(io)
    io.each_with_object(Digest::MD5.new) { |l, d| d.update(l) }.hexdigest
  end
end
