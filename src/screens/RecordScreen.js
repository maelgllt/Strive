import React, { useEffect, useState, useRef } from 'react'; // 1. On importe useRef
import { StyleSheet, View, PermissionsAndroid, Platform, Alert, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';

export default function RecordScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  
  const mapRef = useRef(null);

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
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 47.4784,
          longitude: -0.5638,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}   
        showsMyLocationButton={true} 
        
        onUserLocationChange={(e) => {
          if (e.nativeEvent.coordinate) {
            const newCoords = e.nativeEvent.coordinate;
            setMarkerPosition(newCoords);
            mapRef.current?.animateCamera({
              center: newCoords,
              zoom: 15,
            }, { duration: 500 });
          }
        }}
      >
        <Marker 
          coordinate={markerPosition}
          title={hasPermission ? "Ma Position" : "Position par défaut"}
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