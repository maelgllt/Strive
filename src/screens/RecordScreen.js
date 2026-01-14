import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert, Modal, TextInput } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { getDistance } from 'geolib'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecordScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const [markerPosition, setMarkerPosition] = useState({ latitude: 47.4784, longitude: -0.5638 });

  const [modalVisible, setModalVisible] = useState(false);
  const [activityName, setActivityName] = useState('');

  const mapRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (granted === PermissionsAndroid.RESULTS.GRANTED) setHasPermission(true);
        } catch (err) { console.warn(err); }
      } else { setHasPermission(true); }
    };
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = () => {
    setDistance(0);
    setDuration(0);
    setRouteCoordinates([]);
    setIsRecording(true);
  };

  const handleStopPress = () => {
    setIsRecording(false);
    
    const defaultName = `Sortie du ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    setActivityName(defaultName);
    setModalVisible(true);
  };

  const saveActivity = async () => {
    const newActivity = {
      id: Date.now().toString(),
      name: activityName,
      date: new Date().toISOString(),
      distance: distance,
      duration: duration,
      coordinates: routeCoordinates,
      avgSpeed: duration > 0 ? (distance / 1000) / (duration / 3600) : 0,
    };

    try {
      const existingHistory = await AsyncStorage.getItem('activities');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(newActivity);
      await AsyncStorage.setItem('activities', JSON.stringify(history));
      
      setModalVisible(false);
      
      Alert.alert("Succès", "Activité enregistrée !", [
        { text: "OK", onPress: () => {
            setRouteCoordinates([]); 
            setDistance(0);
            setDuration(0);
        }}
      ]);
    } catch (e) {
      console.error("Erreur save", e);
    }
  };

  const handleUserLocationChange = (e) => {
    const newCoords = e.nativeEvent.coordinate;
    const speedFromGps = e.nativeEvent.speed;

    if (newCoords) {
      setMarkerPosition(newCoords);
      mapRef.current?.animateCamera({ center: newCoords, zoom: 17 }, { duration: 500 });

      if (isRecording) {
        setRouteCoordinates(prevRoute => {
          const newRoute = [...prevRoute, newCoords];
          if (prevRoute.length > 0) {
            const lastPoint = prevRoute[prevRoute.length - 1];
            const addedDist = getDistance(lastPoint, newCoords);
            if (addedDist > 3) setDistance(prev => prev + addedDist);
          }
          return newRoute;
        });
        if (speedFromGps && speedFromGps >= 0) setCurrentSpeed((speedFromGps * 3.6).toFixed(1));
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ latitude: 47.4784, longitude: -0.5638, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation={true}
        onUserLocationChange={handleUserLocationChange}
      >
        {routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeColor="#FC4C02" strokeWidth={4} />
        )}
        <Marker coordinate={markerPosition} title="Moi" pinColor="tomato" />
      </MapView>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}><Text style={styles.statLabel}>DISTANCE (m)</Text><Text style={styles.statValue}>{distance}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>DURÉE</Text><Text style={styles.statValue}>{Math.floor(duration/60)}:{(duration%60).toString().padStart(2,'0')}</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>VITESSE</Text><Text style={styles.statValue}>{currentSpeed}</Text></View>
      </View>

      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={startRecording}>
            <Text style={styles.btnText}>DÉMARRER</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={handleStopPress}>
            <Text style={styles.btnText}>STOP</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Nommez votre activité</Text>
            <TextInput
              style={styles.input}
              onChangeText={setActivityName}
              value={activityName}
              placeholder="Ex: Course du matin"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.textStyle}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.buttonSave]}
                    onPress={saveActivity}
                >
                    <Text style={styles.textStyle}>Enregistrer</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statsContainer: {
    position: 'absolute', top: 50, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 4
  },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  controlsContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  btn: { paddingVertical: 18, paddingHorizontal: 50, borderRadius: 30, elevation: 5 },
  btnStart: { backgroundColor: '#FC4C02' },
  btnStop: { backgroundColor: '#333' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '80%', backgroundColor: "white", borderRadius: 20, padding: 35, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalText: { marginBottom: 15, textAlign: "center", fontSize: 18, fontWeight: 'bold' },
  input: { height: 40, width: '100%', borderColor: 'gray', borderWidth: 1, borderRadius: 5, marginBottom: 20, paddingHorizontal: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
  buttonClose: { backgroundColor: "#888" },
  buttonSave: { backgroundColor: "#FC4C02" },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" }
});