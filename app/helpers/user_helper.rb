module UserHelper
  # User images

  def user_image(user, options = {})
    options[:class] ||= "user_image"
    options[:alt] ||= ""

    if user.image_use_gravatar
      user_gravatar_tag(user, options)
    elsif user.avatar.attached?
      image_tag user_avatar_variant(user, :resize => "100x100>"), options
    else
      image_tag "avatar_large.png", options
    end
  end

  def user_thumbnail(user, options = {})
    options[:class] ||= "user_thumbnail"
    options[:alt] ||= ""

    if user.image_use_gravatar
      user_gravatar_tag(user, options)
    elsif user.avatar.attached?
      image_tag user_avatar_variant(user, :resize => "50x50>"), options
    else
      image_tag "avatar_small.png", options
    end
  end

  def user_thumbnail_tiny(user, options = {})
    options[:class] ||= "user_thumbnail_tiny"
    options[:alt] ||= ""

    if user.image_use_gravatar
      user_gravatar_tag(user, options)
    elsif user.avatar.attached?
      image_tag user_avatar_variant(user, :resize => "50x50>"), options
    else
      image_tag "avatar_small.png", options
    end
  end

  def user_image_url(user, options = {})
    if user.image_use_gravatar
      user_gravatar_url(user, options)
    elsif user.avatar.attached?
      polymorphic_url(user_avatar_variant(user, :resize => "100x100>"), :host => Settings.server_url)
    else
      image_url("avatar_large.png")
    end
  end

  # External authentication support

  def openid_logo
    image_tag "openid_small.png", :alt => t("users.login.openid_logo_alt"), :class => "openid_logo"
  end

  def auth_button(name, provider, options = {})
    link_to(
      image_tag("#{name}.png", :alt => t("users.login.auth_providers.#{name}.alt")),
      auth_path(options.merge(:provider => provider)),
      :class => "auth_button",
      :title => t("users.login.auth_providers.#{name}.title")
    )
  end

  private

  # Local avatar support

  def user_avatar_variant(user, options)
    if user.avatar.variable?
      user.avatar.variant(options)
    else
      user.avatar
    end
  end

  # Gravatar support

  # See http://en.gravatar.com/site/implement/images/ for details.
  def user_gravatar_url(user, options = {})
    size = options[:size] || 100
    hash = Digest::MD5.hexdigest(user.email.downcase)
    default_image_url = image_url("avatar_large.png")
    "#{request.protocol}www.gravatar.com/avatar/#{hash}.jpg?s=#{size}&d=#{u(default_image_url)}"
  end

  def user_gravatar_tag(user, options = {})
    url = user_gravatar_url(user, options)
    options.delete(:size)
    image_tag url, options
  end
end
