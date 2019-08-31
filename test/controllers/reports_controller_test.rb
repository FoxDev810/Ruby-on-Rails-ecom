require "test_helper"

class ReportsControllerTest < ActionController::TestCase
  def test_new_report_without_login
    target_user = create(:user)
    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :redirect
    assert_redirected_to login_path(:referer => new_report_path(:reportable_id => target_user.id, :reportable_type => "User"))
  end

  def test_new_report_after_login
    target_user = create(:user)

    session[:user] = create(:user).id

    # Create an Issue and a report
    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :success
    assert_difference "Issue.count", 1 do
      details = "Details of a report"
      category = "other"
      post :create,
           :params => {
             :report => {
               :details => details,
               :category => category,
               :issue => { :reportable_id => target_user.id, :reportable_type => "User" }
             }
           }
    end
    assert_response :redirect
    assert_redirected_to user_path(target_user)
  end

  def test_new_report_with_incomplete_details
    # Test creation of a new issue and a new report
    target_user = create(:user)

    # Login
    session[:user] = create(:user).id

    # Create an Issue and a report
    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :success
    assert_difference "Issue.count", 1 do
      details = "Details of a report"
      category = "other"
      post :create,
           :params => {
             :report => {
               :details => details,
               :category => category,
               :issue => { :reportable_id => target_user.id, :reportable_type => "User" }
             }
           }
    end
    assert_response :redirect
    assert_redirected_to user_path(target_user)

    issue = Issue.last

    assert_equal 1, issue.reports.count

    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :success

    # Report without details
    assert_no_difference "Issue.count" do
      category = "other"
      post :create,
           :params => {
             :report => {
               :category => category,
               :issue => { :reportable_id => 1, :reportable_type => "User" }
             }
           }
    end
    assert_response :redirect

    assert_equal 1, issue.reports.count
  end

  def test_new_report_with_complete_details
    # Test creation of a new issue and a new report
    target_user = create(:user)

    # Login
    session[:user] = create(:user).id

    # Create an Issue and a report
    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :success
    assert_difference "Issue.count", 1 do
      details = "Details of a report"
      category = "other"
      post :create,
           :params => {
             :report => {
               :details => details,
               :category => category,
               :issue => { :reportable_id => target_user.id, :reportable_type => "User" }
             }
           }
    end
    assert_response :redirect
    assert_redirected_to user_path(target_user)

    issue = Issue.last

    assert_equal 1, issue.reports.count

    # Create a report for an existing Issue
    get :new, :params => { :reportable_id => target_user.id, :reportable_type => "User" }
    assert_response :success
    assert_no_difference "Issue.count" do
      details = "Details of another report under the same issue"
      category = "other"
      post :create,
           :params => {
             :report => {
               :details => details,
               :category => category,
               :issue => { :reportable_id => target_user.id, :reportable_type => "User" }
             }
           }
    end
    assert_response :redirect

    assert_equal 2, issue.reports.count
  end
end
