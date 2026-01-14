import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = async () => {
    setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem('activities');
      if (stored) {
        setActivities(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erreur de chargement", e);
    }
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [])
  );

  const clearHistory = async () => {
    await AsyncStorage.removeItem('activities');
    setActivities([]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString('fr-FR');
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Durée
    const minutes = Math.floor(item.duration / 60);
    const seconds = item.duration % 60;
    const durationStr = `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} s`;

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Detail', { activity: item })}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View>
             <Text style={styles.activityName}>{item.name || "Sortie sans nom"}</Text>
             <Text style={styles.dateTitle}>{dateStr} à {timeStr}</Text>
          </View>
          <Text style={styles.chevron}>Voir &gt;</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.label}>DISTANCE</Text>
            <Text style={styles.value}>{(item.distance / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>DURÉE</Text>
            <Text style={styles.value}>{durationStr}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>VITESSE</Text>
            <Text style={styles.value}>{item.avgSpeed ? Number(item.avgSpeed).toFixed(1) : '0'} km/h</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Mon Historique</Text>
      
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune activité récente.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadActivities} />
        }
      />

      {activities.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
          <Text style={styles.clearBtnText}>Vider l'historique (Dev)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 50 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 8
  },
  dateTitle: { fontSize: 14, color: '#555', fontWeight: 'bold' },
  chevron: { fontSize: 14, color: '#FC4C02', fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  label: { fontSize: 10, color: '#888', marginBottom: 2 },
  value: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: '#AAA', fontSize: 16 },
  clearBtn: { marginTop: 10, alignSelf: 'center', padding: 10 },
  clearBtnText: { color: 'red', fontSize: 12 },
  activityName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 }
});