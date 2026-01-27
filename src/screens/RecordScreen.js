import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform, Alert, Modal, TextInput, Animated } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { getDistance } from 'geolib'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import colors from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

export default function RecordScreen({ navigation }) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [isMapCentered, setIsMapCentered] = useState(true);

  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [segments, setSegments] = useState([]);
  const [sportType, setSportType] = useState('run'); 
  const [currentSpeed, setCurrentSpeed] = useState(0);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [activityName, setActivityName] = useState('');

  const [lastKnownCoords, setLastKnownCoords] = useState(null);

  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const watchId = useRef(null);
  const animValue = useRef(new Animated.Value(0)).current;
  const recenterButtonAnim = useRef(new Animated.Value(0)).current;
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) setHasPermission(true);
      } else {
        setHasPermission(true);
      }

      await checkExistingRecording();

      Geolocation.getCurrentPosition(
        (position) => {
           setLastKnownCoords(position.coords);
           mapRef.current?.animateCamera({ 
             center: { latitude: position.coords.latitude, longitude: position.coords.longitude }, 
             zoom: 17 
           });
        },
        (error) => console.log(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      startPassiveTracking();
    };

    init();

    return () => {
       if (watchId.current !== null) {

       }
    };
  }, []);

  // Fonction pour vérifier si une course était en cours (crash recovery)
  const checkExistingRecording = async () => {
    try {
      const savedState = await AsyncStorage.getItem('current_run_state');
      if (savedState) {
        const { segments: s, distance: d, duration: du, isPaused: p, sportType: st } = JSON.parse(savedState);
        
        // On restaure tout
        setSegments(s);
        setDistance(d);
        setDuration(du);
        setIsPaused(p);
        setSportType(st);
        setIsRecording(true);
        
        startTracking();
      }
    } catch (e) {
      console.log("Erreur restauration", e);
    }
  };

  const persistCurrentRun = async (newSegments, newDistance, newDuration, pausedStatus) => {
    const runState = {
        segments: newSegments,
        distance: newDistance,
        duration: newDuration,
        isPaused: pausedStatus,
        sportType: sportType,
        timestamp: Date.now()
    };
    await AsyncStorage.setItem('current_run_state', JSON.stringify(runState));
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
          setDuration(prev => {
              const newVal = prev + 1;
              return newVal;
          });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isRecording ? 1 : 0, duration: 300, useNativeDriver: true,
    }).start();
  }, [isRecording]);

  useEffect(() => {
    Animated.spring(recenterButtonAnim, {
      toValue: isMapCentered ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isMapCentered]);

  const handleRecenter = () => {
    if (lastKnownCoords && mapRef.current) {
      mapRef.current.animateCamera({ 
        center: { latitude: lastKnownCoords.latitude, longitude: lastKnownCoords.longitude }, 
        zoom: 17 
      }, { duration: 500 });
    }
    setIsMapCentered(true);
  };

  const handleMapPanDrag = () => {
    if (isMapCentered) setIsMapCentered(false);
  };

  const startPassiveTracking = () => {
    if (watchId.current !== null) return;

    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setLastKnownCoords(position.coords);

        if (isMapCentered && mapRef.current) {
          mapRef.current.animateCamera({
            center: { latitude, longitude },
            zoom: 17,
          }, { duration: 1000 });
        }

        if (isRecordingRef.current) {
          handleLocationForRecording(position.coords);
        }

        if (speed && speed >= 0) {
          setCurrentSpeed((speed * 3.6).toFixed(1));
        }
      },
      (error) => console.log('Erreur suivi GPS:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 5,
        interval: 3000,
        fastestInterval: 2000,
        showLocationDialog: true,
        forceRequestLocation: true,
        foregroundService: {
          notificationTitle: "Strive",
          notificationBody: "Suivi de votre position",
          notificationColor: colors.primary,
        },
      }
    );
  };

  const handleLocationForRecording = (coords) => {
    const { latitude, longitude } = coords;
    const newCoordinate = { latitude, longitude };

    setSegments(prevSegments => {
      const updatedSegments = [...prevSegments];
      const currentSegmentIndex = updatedSegments.length - 1;
      
      if (currentSegmentIndex < 0) return prevSegments;

      const currentSegment = { ...updatedSegments[currentSegmentIndex] };
      currentSegment.coordinates = [...currentSegment.coordinates, newCoordinate];
      updatedSegments[currentSegmentIndex] = currentSegment;

      if (currentSegment.type === 'run' && currentSegment.coordinates.length > 1) {
        const lastPoint = currentSegment.coordinates[currentSegment.coordinates.length - 2];
        const addedDist = getDistance(lastPoint, newCoordinate);
        if (addedDist > 2 && addedDist < 100) {
          setDistance(d => {
            const dFinal = d + addedDist;
            persistCurrentRun(updatedSegments, dFinal, duration, isPausedRef.current); 
            return dFinal;
          });
        } else {
          setDistance(d => {
            persistCurrentRun(updatedSegments, d, duration, isPausedRef.current);
            return d;
          });
        }
      } else {
        setDistance(d => {
          persistCurrentRun(updatedSegments, d, duration, isPausedRef.current);
          return d;
        });
      }
      
      return updatedSegments;
    });
  };

  const startTracking = () => {
    startPassiveTracking();
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    Geolocation.stopObserving();
  };

  const startRecording = () => {
    setDistance(0);
    setDuration(0);
    setSegments([{ type: 'run', coordinates: [] }]);
    setIsRecording(true);
    setIsPaused(false);
    isRecordingRef.current = true;
    isPausedRef.current = false;
    setIsMapCentered(true);
    
    persistCurrentRun([{ type: 'run', coordinates: [] }], 0, 0, false);
    
    startTracking();
  };

  const handleStopPress = () => {
    stopTracking();
    setIsRecording(false);
    setIsPaused(false);
    isRecordingRef.current = false;
    isPausedRef.current = false;
    
    AsyncStorage.removeItem('current_run_state');
    
    const timeOfDay = new Date().getHours();
    const period = timeOfDay < 12 ? 'matin' : timeOfDay < 18 ? 'après-midi' : 'soir';
    let typeLabel = sportType === 'bike' ? "Vélo" : sportType === 'walk' ? "Marche" : "Course";
    setActivityName(`${typeLabel} du ${period}`);
    setModalVisible(true);
  };

  const togglePause = () => {
    setIsPaused(prev => {
      const newStatus = !prev;
      isPausedRef.current = newStatus;
      setSegments(prevSegments => {
        const lastSegment = prevSegments[prevSegments.length - 1];
        const lastPoint = lastSegment && lastSegment.coordinates.length > 0 
          ? [lastSegment.coordinates[lastSegment.coordinates.length - 1]] 
          : [];
        const newSegs = [...prevSegments, { type: newStatus ? 'pause' : 'run', coordinates: lastPoint }];
        
        persistCurrentRun(newSegs, distance, duration, newStatus);
        
        return newSegs;
      });
      return newStatus;
    });
  };

  const saveActivity = async () => {
    const allCoordinates = segments.flatMap(s => s.coordinates);
    const newActivity = {
      id: Date.now().toString(),
      userId: user?.id,
      name: activityName,
      date: new Date().toISOString(),
      distance: distance,
      duration: duration,
      segments: segments,
      coordinates: allCoordinates,
      avgSpeed: duration > 0 ? (distance / 1000) / (duration / 3600) : 0,
      sportType: sportType,
    };
    try {
      const existingHistory = await AsyncStorage.getItem('activities');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(newActivity);
      await AsyncStorage.setItem('activities', JSON.stringify(history));
      setModalVisible(false);
      Alert.alert("Succès", "Activité enregistrée !", [{ text: "OK", onPress: () => {
        setSegments([]); setDistance(0); setDuration(0);
      }}]);
    } catch (e) { console.error(e); }
  };

  const formatDuration = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const startOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const startScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const controlsOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const controlsScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const controlsTranslateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });

  const sports = [
    { key: 'run', label: 'Course', icon: 'walk-outline' },
    { key: 'bike', label: 'Vélo', icon: 'bicycle-outline' },
    { key: 'walk', label: 'Marche', icon: 'footsteps-outline' },
  ];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ latitude: 47.4784, longitude: -0.5638, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation={true}
        showsMyLocationButton={false} 
        toolbarEnabled={false}
        followsUserLocation={isMapCentered}
        onPanDrag={handleMapPanDrag} 
      >
        {segments
          .filter(segment => segment.coordinates && segment.coordinates.length >= 2)
          .map((segment, index) => (
            <Polyline 
              key={index}
              coordinates={segment.coordinates}
              strokeColor={segment.type === 'run' ? colors.primary : colors.mapTrackPause}
              strokeWidth={4}
              lineDashPattern={segment.type === 'pause' ? [10, 10] : null}
            />
          ))}
      </MapView>
      
      
      {!isMapCentered && (
        <Animated.View style={[
          styles.recenterBtn,
          {
            opacity: recenterButtonAnim,
            transform: [{
              scale: recenterButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            }],
          },
        ]}>
          <TouchableOpacity onPress={handleRecenter} style={styles.recenterBtnTouch}>
            <Ionicons name="locate" size={24} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {isPaused && (
        <View style={styles.pauseOverlay}>
            <Text style={styles.pauseText}>PAUSE</Text>
            <Text style={styles.pauseSubText}>Appuyez sur play pour reprendre</Text>
        </View>
      )}

      <View style={[styles.statsContainer, isPaused && styles.statsContainerPaused]}>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE (m)</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{Math.floor(distance)}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURÉE</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{formatDuration(duration)}</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={styles.statLabel}>VITESSE</Text>
            <Text style={[styles.statValue, isPaused && styles.statValuePaused]}>{currentSpeed}</Text>
        </View>
      </View>

      <View style={styles.controlsArea}>
        <Animated.View style={[styles.controlWrapper, { opacity: startOpacity, transform: [{ scale: startScale }], zIndex: isRecording ? 0 : 1 }]}>
          <View style={styles.sportSelector}>
            {sports.map((sport) => (
                <TouchableOpacity 
                    key={sport.key} 
                    style={[styles.sportBtn, sportType === sport.key && styles.sportBtnActive]}
                    onPress={() => setSportType(sport.key)}
                >
                    <Ionicons name={sport.icon} size={20} color={sportType === sport.key ? 'white' : colors.textLight} />
                    <Text style={[styles.sportBtnText, sportType === sport.key && styles.sportBtnTextActive]}>{sport.label}</Text>
                </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btnCircleLarge} onPress={startRecording} disabled={isRecording}>
            <Ionicons name="play" size={40} color="white" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.controlWrapper, styles.rowControls, { opacity: controlsOpacity, transform: [{ scale: controlsScale }, { translateY: controlsTranslateY }], zIndex: isRecording ? 1 : 0 }]}>
             <TouchableOpacity style={[styles.btnCircleMedium, { backgroundColor: isPaused ? colors.success : colors.primary }]} onPress={togglePause} disabled={!isRecording}>
                <Ionicons name={isPaused ? "play" : "pause"} size={35} color="white" style={isPaused ? {marginLeft:4} : {}} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.btnCircleMedium, { backgroundColor: colors.backgroundDark }]} onPress={handleStopPress} disabled={!isRecording}>
                <Ionicons name="square" size={28} color="white" />
             </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Nommez votre activité</Text>
            <TextInput style={styles.input} onChangeText={setActivityName} value={activityName} autoFocus={true} />
            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setModalVisible(false)}><Text style={styles.textStyle}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={saveActivity}><Text style={styles.textStyle}>Enregistrer</Text></TouchableOpacity>
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
  recenterBtn: { 
    position: 'absolute', 
    right: 20, 
    bottom: 200, 
    backgroundColor: colors.background, 
    borderRadius: 30, 
    elevation: 5, 
    shadowColor: colors.shadow, 
    shadowOpacity: 0.3, 
    shadowRadius: 3, 
    zIndex: 5 
  },
  recenterBtnTouch: {
    padding: 12,
  },
  recenterBtnActive: { backgroundColor: colors.primary },
  statsContainer: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.background, padding: 15, borderRadius: 12, elevation: 4 },
  statsContainerPaused: { backgroundColor: colors.backgroundGray, borderColor: colors.borderDark, borderWidth: 1 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: colors.textLight, fontWeight: 'bold' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statValuePaused: { color: colors.textLight },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 2, paddingBottom: 100 },
  pauseText: { fontSize: 40, fontWeight: '900', color: colors.text, letterSpacing: 5 },
  pauseSubText: { fontSize: 16, color: colors.textLight, marginTop: 10, fontWeight: '600' },
  controlsArea: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', height: 180, justifyContent: 'flex-end', zIndex: 10 },
  controlWrapper: { position: 'absolute', width: '100%', alignItems: 'center', justifyContent: 'center', bottom: 0 },
  rowControls: { flexDirection: 'row', justifyContent: 'space-evenly', width: '70%', bottom: 20 },
  btnCircleLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: colors.shadow, shadowOpacity: 0.3, shadowRadius: 5 },
  btnCircleMedium: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: colors.shadow, shadowOpacity: 0.3, shadowRadius: 4 },
  sportSelector: { flexDirection: 'row', backgroundColor: colors.background, padding: 5, borderRadius: 25, elevation: 3, marginBottom: 20 },
  sportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  sportBtnActive: { backgroundColor: colors.primary },
  sportBtnText: { marginLeft: 5, fontWeight: 'bold', color: colors.textLight, fontSize: 12 },
  sportBtnTextActive: { color: colors.textWhite },
  centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.overlay },
  modalView: { width: '80%', backgroundColor: colors.background, borderRadius: 20, padding: 35, alignItems: "center", shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalText: { marginBottom: 15, textAlign: "center", fontSize: 18, fontWeight: 'bold', color: colors.text },
  input: { height: 40, width: '100%', borderColor: colors.border, borderWidth: 1, borderRadius: 5, marginBottom: 20, paddingHorizontal: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  button: { borderRadius: 10, padding: 10, elevation: 2, minWidth: 100, alignItems: 'center' },
  buttonClose: { backgroundColor: colors.textLight },
  buttonSave: { backgroundColor: colors.primary },
  textStyle: { color: colors.textWhite, fontWeight: "bold", textAlign: "center" }
});