attrs = {
  "id" => user_block.id,
  "created_at" => user_block.created_at.xmlschema,
  "updated_at" => user_block.updated_at.xmlschema,
  "ends_at" => user_block.ends_at.xmlschema,
  "needs_view" => user_block.needs_view
}

xml.user_block(attrs) do
  xml.user :uid => user_block.user_id, :user => user_block.user.display_name
  xml.creator :uid => user_block.creator_id, :user => user_block.creator.display_name
  xml.revoker :uid => user_block.revoker_id, :user => user_block.revoker.display_name if user_block.revoker
  xml.reason user_block.reason
end
