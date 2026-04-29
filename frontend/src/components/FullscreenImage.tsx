import React from "react";
import { View, Image, StyleSheet, TouchableOpacity, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function FullscreenImage({
  uri,
  visible,
  onClose,
}: {
  uri?: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { width, height } = Dimensions.get("window");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} testID="fs-image-close">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width, height: height * 0.85 }}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
