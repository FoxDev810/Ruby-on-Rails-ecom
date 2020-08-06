require "test_helper"

class I18nTest < ActiveSupport::TestCase
  I18n.available_locales.each do |locale|
    define_method("test_#{locale.to_s.underscore}".to_sym) do
      without_i18n_exceptions do
        # plural_keys = plural_keys(locale)

        translation_keys.each do |key|
          variables = []

          default_value = I18n.t(key, :locale => I18n.default_locale)

          if default_value.is_a?(Hash)
            variables.push("count")

            default_value.each_value do |subvalue|
              subvalue.scan(/%\{(\w+)\}/) do
                variables.push(Regexp.last_match(1))
              end
            end
          else
            default_value.scan(/%\{(\w+)\}/) do
              variables.push(Regexp.last_match(1))
            end
          end

          variables.push("attribute") if key =~ /^(active(model|record)\.)?errors\./

          value = I18n.t(key, :locale => locale, :fallback => true)

          if value.is_a?(Hash)
            value.each do |subkey, subvalue|
              # assert plural_keys.include?(subkey), "#{key}.#{subkey} is not a valid plural key"

              next if subvalue.nil?

              subvalue.scan(/%\{(\w+)\}/) do
                assert_includes variables, Regexp.last_match(1), "#{key}.#{subkey} uses unknown interpolation variable #{Regexp.last_match(1)}"
              end
            end

            assert_includes value, :other, "#{key}.other plural key missing"
          else
            assert value.is_a?(String), "#{key} is not a string"

            value.scan(/%\{(\w+)\}/) do
              assert_includes variables, Regexp.last_match(1), "#{key} uses unknown interpolation variable #{Regexp.last_match(1)}"
            end
          end
        end

        assert_includes %w[ltr rtl], I18n.t("html.dir", :locale => locale), "html.dir must be ltr or rtl"
      end
    end
  end

  private

  def translation_keys(scope = nil)
    plural_keys = plural_keys(I18n.default_locale)

    I18n.t(scope || ".", :locale => I18n.default_locale).map do |key, value|
      scoped_key = scope ? "#{scope}.#{key}" : key

      case value
      when Hash
        if value.keys - plural_keys == []
          scoped_key
        else
          translation_keys(scoped_key)
        end
      when String
        scoped_key
      end
    end.flatten
  end

  def plural_keys(locale)
    I18n.t("i18n.plural.keys", :locale => locale, :raise => true) + [:zero]
  rescue I18n::MissingTranslationData
    [:zero, :one, :other]
  end
end
