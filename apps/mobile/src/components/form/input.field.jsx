import React from "react"
import { TextInput, Text, View, StyleSheet } from "react-native"
import { useFieldContext } from "@/lib/form-context"
import { Colors } from "@/constants/theme"

const InputField = ({ label, ...props }) => {
  const field = useFieldContext()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, isInvalid && styles.inputError]}
        value={field.state.value}
        onChangeText={field.handleChange}
        onBlur={field.handleBlur}
        {...props}
      />
      {isInvalid && (
        <Text style={styles.error}>
          {field.state.meta.errors[0]?.message ??
            String(field.state.meta.errors[0])}
        </Text>
      )}
    </View>
  )
}

export default InputField

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreenColor,
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
