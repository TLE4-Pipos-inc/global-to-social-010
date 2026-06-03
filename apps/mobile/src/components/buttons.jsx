import React from "react";
import { Pressable, Text, StyleSheet, } from "react-native";
import { Colors } from "./../constants/theme";


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

const styles = StyleSheet.create({
    lightFilled: {
        height: 52,
        borderRadius: 18,
        // backgroundColor: "#5D952B",
        backgroundColor: Colors.lightGreenColor,
        justifyContent: "center",
        alignItems: "center",
    },

    lightOutline: {
        height: 72,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.lightGreenColor,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },

    darkFilled: {
        height: 72,
        borderRadius: 18,
        backgroundColor: Colors.darkGreenColor,
        justifyContent: "center",
        alignItems: "center",
    },

    darkOutline: {
        height: 72,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.darkOutlineColor,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },

    filledText: {
        fontSize: 22,
        fontWeight: "600",
        color: "#fff",
    },

    lightOutlineText: {
        fontSize: 22,
        fontWeight: "500",
        color: Colors.lightGreenColor,
    },

    darkOutlineText: {
        fontSize: 22,
        fontWeight: "500",
        color: Colors.darkOutlineColor,
    },
});