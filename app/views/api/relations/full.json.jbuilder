json.partial! "api/root_attributes"

all = @nodes + @ways + @relations

json.elements(all) do |obj|
  json.partial! obj
end
