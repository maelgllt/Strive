import React, { useEffect, useState } from 'react';
import { StyleSheet, View, PermissionsAndroid, Platform, Alert, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';

export default function RecordScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 47.4784,
    longitude: -0.5638,
  });

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Permission de localisation",
            message: "Strive a besoin de votre position pour le suivi.",
            buttonNeutral: "Plus tard",
            buttonNegative: "Refuser",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          Alert.alert("Permission refusée", "Allez dans les paramètres pour activer la localisation.");
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 47.4784,
          longitude: -0.5638,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}   
        showsMyLocationButton={true} 
        

        onUserLocationChange={(e) => {
          if (e.nativeEvent.coordinate) {
            setMarkerPosition(e.nativeEvent.coordinate);
          }
        }}
      >
        <Marker 
          coordinate={markerPosition}
          title={hasPermission ? "Ma Position" : "Angers (Défaut)"}
          pinColor="tomato" 
        />
      </MapView>
      
      {!hasPermission && (
        <View style={styles.permissionWarning}>
          <Text style={styles.warningText}>⚠️ GPS non autorisé</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  permissionWarning: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 20,
  },
  warningText: { color: 'white' }
});