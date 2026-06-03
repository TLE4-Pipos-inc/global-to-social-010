import React from 'react'
import { TextInput, Text, View, StyleSheet } from 'react-native'
import { useFieldContext } from "../../lib/form-context"
import { Colors } from '../../constants/theme'

export const InputField = ({ label, ...props }) => {
  const field = useFieldContext()
  const hasError = field.state.meta.errors.length > 0

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, hasError && styles.inputError]}
        value={field.state.value}
        onChangeText={field.handleChange}
        onBlur={field.handleBlur}
        {...props}
      />
      {hasError && (
        <Text style={styles.error}>{field.state.meta.errors[0]}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.darkOutlineColor,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.orangeColor,
  },
  error: {
    fontSize: 12,
    color: Colors.orangeColor,
  },
})
