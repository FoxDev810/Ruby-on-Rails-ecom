module ChangesetHelper
  def changeset_user_link(changeset)
    if changeset.user.status == "deleted"
      t("user.no_such_user.deleted")
    elsif changeset.user.data_public?
      link_to(changeset.user.display_name, user_path(changeset.user.display_name))
    else
      t("browse.anonymous")
    end
  end

  def changeset_details(changeset)
    if changeset.closed_at > DateTime.now
      action = :created
      time = distance_of_time_in_words_to_now(changeset.created_at)
      title = l(changeset.created_at)
    else
      action = :closed
      time = distance_of_time_in_words_to_now(changeset.closed_at)
      title = "#{t('browse.created')}: #{l(changeset.created_at)}&#10;#{t('browse.closed')}: #{l(changeset.closed_at)}".html_safe
    end

    if params.key?(:display_name)
      t "browse.#{action}_html",
        :time => time,
        :title => title
    else
      t "browse.#{action}_by_html",
        :time => time,
        :title => title,
        :user => changeset_user_link(changeset)
    end
  end
end
