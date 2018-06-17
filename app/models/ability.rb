# frozen_string_literal: true

class Ability
  include CanCan::Ability

  def initialize(user, token)
    can :index, :site
    can [:permalink, :edit, :help, :fixthemap, :offline, :export, :about, :preview, :copyright, :key, :id, :welcome], :site

    can [:list, :rss, :view, :comments], DiaryEntry

    if user
      can :weclome, :site

      can [:create, :edit, :comment, :subscribe, :unsubscribe], DiaryEntry

      can [:read, :read_one], UserPreference if has_capability?(token, :allow_read_prefs)
      can [:update, :update_one, :delete_one], UserPreference if has_capability?(token, :allow_write_prefs)

      if user.administrator?
        can [:hide, :hidecomment], [DiaryEntry, DiaryComment]
      end
    end
    # Define abilities for the passed in user here. For example:
    #
    #   user ||= User.new # guest user (not logged in)
    #   if user.admin?
    #     can :manage, :all
    #   else
    #     can :read, :all
    #   end
    #
    # The first argument to `can` is the action you are giving the user
    # permission to do.
    # If you pass :manage it will apply to every action. Other common actions
    # here are :read, :create, :update and :destroy.
    #
    # The second argument is the resource the user can perform the action on.
    # If you pass :all it will apply to every resource. Otherwise pass a Ruby
    # class of the resource.
    #
    # The third argument is an optional hash of conditions to further filter the
    # objects.
    # For example, here the user can only update published articles.
    #
    #   can :update, Article, :published => true
    #
    # See the wiki for details:
    # https://github.com/CanCanCommunity/cancancan/wiki/Defining-Abilities
  end

  def has_capability?(token, cap)
    token && token.read_attribute(cap)
  end
end
