import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_OSMDROID, Marker } from 'react-native-maps';

export default function RecordScreen() {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_OSMDROID} 
        style={styles.map}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker 
          coordinate={{ latitude: 48.8566, longitude: 2.3522 }} 
          title="Paris" 
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});