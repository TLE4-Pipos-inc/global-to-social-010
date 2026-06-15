import React from "react";
import { Pressable, Text, StyleSheet, } from "react-native";
import { Colors } from "@/constants/theme";


export const PrimaryLightButton = ({ title, ...props }) => (
    <Pressable style={styles.lightFilled} {...props}>
        <Text style={styles.filledText}>{title}</Text>
    </Pressable>
);

export const PrimaryLightOutlineButton = ({ title, ...props }) => (
    <Pressable style={styles.lightOutline} {...props}>
        <Text style={styles.lightOutlineText}>{title}</Text>
    </Pressable>
);

export const PrimaryDarkButton = ({ title, ...props }) => (
    <Pressable style={styles.darkFilled} {...props}>
        <Text style={styles.filledText}>{title}</Text>
    </Pressable>
);

export const PrimaryDarkOutlineButton = ({ title, ...props }) => (
    <Pressable style={styles.darkOutline} {...props}>
        <Text style={styles.darkOutlineText}>{title}</Text>
    </Pressable>
);

export const DestructiveOutlineButton = ({ title, ...props }) => (
    <Pressable style={styles.destructiveOutline} {...props}>
        <Text style={styles.destructiveOutlineText}>{title}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    lightFilled: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 20,
        backgroundColor: Colors.lightGreenColor,
        justifyContent: "center",
        alignItems: "center",
    },

    lightOutline: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: Colors.lightGreenColor,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },

    darkFilled: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 20,
        backgroundColor: Colors.darkGreenColor,
        justifyContent: "center",
        alignItems: "center",
    },

    darkOutline: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: Colors.darkGreenColor,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },

    filledText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
    },

    lightOutlineText: {
        fontSize: 18,
        fontWeight: "500",
        color: Colors.lightGreenColor,
    },

    darkOutlineText: {
        fontSize: 18,
        fontWeight: "500",
        color: Colors.darkGreenColor,
    },

    destructiveOutline: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: Colors.dangerColor,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },

    destructiveOutlineText: {
        fontSize: 18,
        fontWeight: "500",
        color: Colors.dangerColor,
    },
});