class AddTextFormat < ActiveRecord::Migration[4.2]
  def up
    create_enum :format_enum, %w[html markdown text]
    add_column :users, :description_format, :format_enum, :null => false, :default => "html"
    add_column :user_blocks, :reason_format, :format_enum, :null => false, :default => "html"
    add_column :diary_entries, :body_format, :format_enum, :null => false, :default => "html"
    add_column :diary_comments, :body_format, :format_enum, :null => false, :default => "html"
    add_column :messages, :body_format, :format_enum, :null => false, :default => "html"
  end

  def down
    remove_column :messages, :body_format
    remove_column :diary_comments, :body_format
    remove_column :diary_entries, :body_format
    remove_column :user_blocks, :reason_format
    remove_column :users, :description_format
    drop_enumeration :format_enum
  end
end
