import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { tabularNums, useColors } from '@/theme/tokens';

import { Text } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Shown under the field in a warning tone. Never blocks submission. */
  warning?: string | null;
  hint?: string;
  /** Unit or currency shown inside the field, e.g. '₹' or 'units'. */
  prefix?: string;
  suffix?: string;
  numeric?: boolean;
  /** Visually flags a value the app guessed (OCR) and the user should check. */
  scanned?: boolean;
};

export function TextField({
  label,
  warning,
  hint,
  prefix,
  suffix,
  numeric,
  scanned,
  ...rest
}: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label ? <Text variant="label">{label}</Text> : null}

      <View
        className={`flex-row items-center gap-2 rounded-md border bg-surface px-3 ${
          warning
            ? 'border-due'
            : scanned
              ? 'border-brand'
              : focused
                ? 'border-brand'
                : 'border-border'
        }`}>
        {prefix ? (
          <Text variant="body" tone="secondary">
            {prefix}
          </Text>
        ) : null}

        <TextInput
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.brand}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              color: colors.text,
              fontSize: 16,
              paddingVertical: 14,
            },
            numeric && tabularNums,
          ]}
          {...rest}
        />

        {suffix ? (
          <Text variant="caption" tone="tertiary">
            {suffix}
          </Text>
        ) : null}
      </View>

      {warning ? (
        <Text variant="caption" className="text-due">
          {warning}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
