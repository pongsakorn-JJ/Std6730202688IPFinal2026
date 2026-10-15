import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, font } from './theme';

export function Field({ label, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMute}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocus, style]}
      />
    </View>
  );
}

const VARIANTS = {
  primary: { bg: colors.accent, fg: '#FFFFFF', border: colors.accent },
  outline: { bg: 'transparent', fg: colors.accent, border: colors.accent },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, compact, style }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: font.semibold, color: colors.inkSoft, marginBottom: 6 },
  input: { fontFamily: font.medium,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputFocus: { borderColor: colors.accent },
  button: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontFamily: font.bold },
  buttonCompact: { minHeight: 40, paddingHorizontal: 6 },
  buttonTextCompact: { fontSize: 13.5 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
