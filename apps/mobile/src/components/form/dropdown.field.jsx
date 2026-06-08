import React, { useState } from "react"
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ChevronDown } from "lucide-react-native"
import { useFieldContext } from "../../lib/form-context"
import { Colors } from "../../constants/theme"

const DropdownField = ({ label, options = [], ...props }) => {
  const field = useFieldContext()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  const [open, setOpen] = useState(false)

  const selected = options.find((o) => o.value === field.state.value)

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        style={[styles.trigger, isInvalid && styles.triggerError]}
        onPress={() => setOpen(true)}
        {...props}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected ? selected.label : "Select an option"}
        </Text>
        <ChevronDown size={18} color={Colors.icon} />
      </Pressable>

      {isInvalid && (
        <Text style={styles.error}>
          {field.state.meta.errors[0]?.message ??
            String(field.state.meta.errors[0])}
        </Text>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    item.value === field.state.value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    field.handleChange(item.value)
                    setOpen(false)
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === field.state.value &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

export default DropdownField

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  trigger: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkOutlineColor,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
  },
  triggerError: {
    borderColor: Colors.orangeColor,
  },
  triggerText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.icon,
  },
  chevron: {
    fontSize: 16,
    color: Colors.icon,
  },
  error: {
    fontSize: 12,
    color: Colors.orangeColor,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.icon,
    paddingHorizontal: 20,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: Colors.lightGreenColor + "1A",
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.lightGreenColor,
    fontWeight: "600",
  },
})
